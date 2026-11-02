import type { AmazonVital, ArcticVital, Co2Vital, ReefStation, ReefVital, Source, Vitals } from '../src/vitals/types';

/**
 * Collects Earth's vital signs from the agencies that publish them. Runs on the server only
 * (api/vitals.ts), so players' phones download one small summary instead of several large files.
 */

const SOURCES = {
  co2: { label: 'NOAA Global Monitoring Laboratory, Mauna Loa daily CO₂', url: 'https://gml.noaa.gov/ccgg/trends/' },
  arctic: { label: 'NSIDC Sea Ice Index, version 4 (Arctic daily extent)', url: 'https://nsidc.org/data/seaice_index' },
  reef: { label: 'NOAA Coral Reef Watch, 5 km Regional Virtual Stations', url: 'https://coralreefwatch.noaa.gov/product/vs/map.php' },
  amazon: { label: 'INPE DETER deforestation alerts (TerraBrasilis)', url: 'https://terrabrasilis.dpi.inpe.br/' },
} satisfies Record<string, Source>;

const TIMEOUT = 20_000;

async function text(url: string, init: RequestInit = {}) {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT) });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.text();
}

const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const dayOfYear = (y: number, m: number, d: number) => Math.round((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / 86_400_000) + 1;
const round = (v: number, p: number) => Math.round(v * 10 ** p) / 10 ** p;

/** Mauna Loa daily CO₂. Rows: year, month, day, decimal year, ppm. */
export async function co2(): Promise<Co2Vital> {
  const rows = (await text('https://gml.noaa.gov/webdata/ccgg/trends/co2/co2_daily_mlo.csv'))
    .split('\n').filter((l) => l && !l.startsWith('#'))
    .map((l) => l.split(',').map(Number)).filter((r) => r.length >= 5 && r[4] > 0);
  const last = rows[rows.length - 1];
  const [y, m, d] = last;
  // Nearest measured day to the same date in an earlier year (Mauna Loa misses some days).
  const near = (year: number) => {
    const t = Date.UTC(year, m - 1, d);
    let best = rows[0];
    for (const r of rows) if (r[0] === year && Math.abs(Date.UTC(r[0], r[1] - 1, r[2]) - t) < Math.abs(Date.UTC(best[0], best[1] - 1, best[2]) - t)) best = r;
    if (best[0] !== year) throw new Error(`no CO₂ data for ${year}`);
    return best[4];
  };
  const yearAgo = Date.UTC(y - 1, m - 1, d);
  const series = rows.filter((r) => Date.UTC(r[0], r[1] - 1, r[2]) > yearAgo).filter((_, i) => i % 7 === 0).map((r) => r[4]);
  return { status: 'ok', source: SOURCES.co2, date: iso(y, m, d), ppm: last[4], ppm1990: near(1990), ppmYearAgo: near(y - 1), series };
}

/** Arctic sea ice extent vs the 1981–2010 average for the same day. */
export async function arctic(): Promise<ArcticVital> {
  const base = 'https://noaadata.apps.nsidc.org/NOAA/G02135/north/daily/data/';
  const [daily, clim] = await Promise.all([
    text(base + 'N_seaice_extent_daily_v4.0.csv', { headers: { Range: 'bytes=-60000' } }), // only the latest weeks
    text(base + 'N_seaice_extent_climatology_1981-2010_v4.0.csv'),
  ]);
  const rows = daily.split('\n').map((l) => l.split(',').slice(0, 4).map((c) => Number(c.trim())))
    .filter((r) => r.length === 4 && r.every((v) => Number.isFinite(v)) && r[0] > 1978 && r[3] > 0);
  const last = rows[rows.length - 1];
  const [y, m, d, extent] = last;
  const doy = Math.min(365, dayOfYear(y, m, d));
  const normalRow = clim.split('\n').map((l) => l.split(',').map((c) => Number(c.trim()))).find((r) => r[0] === doy);
  if (!normalRow) throw new Error('no climatology row');
  return { status: 'ok', source: SOURCES.arctic, date: iso(y, m, d), extent, normal: normalRow[1], series: rows.slice(-60).map((r) => r[3]) };
}

const GBR = [
  { file: 'gbr_far_northern', name: 'Far Northern' },
  { file: 'gbr_northern', name: 'Northern' },
  { file: 'gbr_central', name: 'Central' },
  { file: 'gbr_southern', name: 'Southern' },
];
const GBR_POS: Record<string, [number, number]> = { gbr_far_northern: [-12.68, 144.1], gbr_northern: [-16.5, 146.5], gbr_central: [-19.5, 149.0], gbr_southern: [-22.5, 152.0] };

/** Great Barrier Reef: NOAA bleaching alert level and sea-temperature anomaly for four zones. */
export async function reef(): Promise<ReefVital> {
  const stations = await Promise.all(GBR.map(async ({ file, name }): Promise<ReefStation & { date: string }> => {
    const tail = await text(`https://coralreefwatch.noaa.gov/product/vs/data/${file}.txt`, { headers: { Range: 'bytes=-1500' } });
    // YYYY MM DD SST_MIN SST_MAX SST@90th_HS SSTA@90th_HS 90th_HS>0 DHW_from_90th_HS>1 BAA_7day_max
    const rows = tail.split('\n').map((l) => l.trim().split(/\s+/).map(Number)).filter((r) => r.length === 10 && r.every((v) => Number.isFinite(v)));
    const r = rows[rows.length - 1];
    if (!r) throw new Error(`no reef rows for ${file}`);
    const [lat, lon] = GBR_POS[file];
    return { name, lat, lon, level: r[9], ssta: r[6], date: iso(r[0], r[1], r[2]) };
  }));
  const date = stations.map((s) => s.date).sort().pop()!;
  return {
    status: 'ok', source: SOURCES.reef, date,
    level: Math.max(...stations.map((s) => s.level)),
    ssta: round(stations.reduce((a, s) => a + s.ssta, 0) / stations.length, 2),
    stations: stations.map(({ date: _d, ...s }) => s),
  };
}

/** Amazon: area of INPE deforestation alerts (clear-cutting and mining) in the last 30 days of data vs a year earlier. */
export async function amazon(): Promise<AmazonVital> {
  const wfs = 'https://terrabrasilis.dpi.inpe.br/geoserver/deter-amz/ows?service=WFS&version=2.0.0&request=GetFeature&outputFormat=application/json';
  const updated = JSON.parse(await text(`${wfs}&typeNames=deter-amz:updated_date`)).features[0].properties.updated_date as string;
  const end = new Date(`${updated}T00:00:00Z`);
  const sum = async (yearsBack: number) => {
    const e = new Date(end); e.setUTCFullYear(e.getUTCFullYear() - yearsBack);
    const s = new Date(e.getTime() - 29 * 86_400_000);
    const day = (t: Date) => t.toISOString().slice(0, 10);
    const filter = `view_date >= '${day(s)}' AND view_date <= '${day(e)}' AND classname IN ('DESMATAMENTO_CR','DESMATAMENTO_VEG','MINERACAO')`;
    const json = JSON.parse(await text(`${wfs}&typeNames=deter-amz:deter_amz&propertyName=areamunkm&CQL_FILTER=${encodeURIComponent(filter)}`));
    return round((json.features as { properties: { areamunkm: number } }[]).reduce((a, f) => a + (f.properties.areamunkm || 0), 0), 1);
  };
  const [km2, km2YearAgo] = await Promise.all([sum(0), sum(1)]);
  return { status: 'ok', source: SOURCES.amazon, date: updated, km2, km2YearAgo };
}

/** All four vital signs. One failing feed never hides the others. */
export async function getVitals(): Promise<Vitals> {
  const settle = async <T>(key: keyof typeof SOURCES, f: () => Promise<T>) => {
    try { return await f(); } catch (err) { console.error(`vitals: ${key} unavailable:`, err); return { status: 'unavailable' as const, source: SOURCES[key] }; }
  };
  const [c, a, r, z] = await Promise.all([settle('co2', co2), settle('arctic', arctic), settle('reef', reef), settle('amazon', amazon)]);
  return { fetchedAt: new Date().toISOString(), co2: c, arctic: a, reef: r, amazon: z };
}

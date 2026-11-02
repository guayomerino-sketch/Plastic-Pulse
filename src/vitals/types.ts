/**
 * Earth's vital signs: live readings from public science agencies, shared by the server function
 * (api/vitals.ts) and the app. Every value carries its date and source. A feed that fails is
 * marked "unavailable"; the app never fills in a guess.
 */
export interface Source { label: string; url: string }

interface Base { source: Source }
interface Unavailable extends Base { status: 'unavailable' }

export interface Co2Vital extends Base {
  status: 'ok';
  date: string; // YYYY-MM-DD
  ppm: number;
  ppm1990: number; // same day of the year in 1990
  ppmYearAgo: number;
  series: number[]; // the last 365 days, every 7th day: shows the planet "breathing"
}

export interface ArcticVital extends Base {
  status: 'ok';
  date: string;
  extent: number; // million km²
  normal: number; // 1981–2010 average for the same day of the year
  series: number[]; // the last 60 days
}

export interface ReefStation { name: string; lat: number; lon: number; level: number; ssta: number }
export interface ReefVital extends Base {
  status: 'ok';
  date: string;
  level: number; // worst NOAA bleaching alert across the stations: 0 No stress … 4 Alert Level 2
  ssta: number; // average sea-surface temperature anomaly, °C above normal
  stations: ReefStation[];
}

export interface AmazonVital extends Base {
  status: 'ok';
  date: string; // INPE's latest update
  km2: number; // deforestation alerts in the 30 days to `date`
  km2YearAgo: number; // the same 30 days one year earlier
}

export interface Vitals {
  fetchedAt: string; // ISO time the server collected the feeds
  co2: Co2Vital | Unavailable;
  arctic: ArcticVital | Unavailable;
  reef: ReefVital | Unavailable;
  amazon: AmazonVital | Unavailable;
}

export const REEF_LEVELS = ['No stress', 'Bleaching watch', 'Bleaching warning', 'Alert level 1', 'Alert level 2'] as const;

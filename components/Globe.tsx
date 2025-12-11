import React, { useEffect, useRef, useMemo } from 'react';
import Globe from 'react-globe.gl';

// Simple WebGL availability check for browsers. If WebGL isn't available
// the globe will fail silently (blank). Render a helpful message instead.
function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
  } catch (e) {
    return false;
  }
}

interface GlobeProps {
  pollutionLevel: number; // 0.0 (clean) to 1.0 (polluted)
}

// Blue Marble texture (public URL). If you prefer a local asset, replace with an import.
const BLUE_MARBLE = 'https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57730/land_ocean_ice_2048.jpg';

// Example global 'Plastic Saved' locations (lat, lng) with saved grams
const SAVED_LOCATIONS = [
  { lat: 40.7128, lng: -74.0060, value: 1200, name: 'New York' },
  { lat: -23.5505, lng: -46.6333, value: 900, name: 'São Paulo' },
  { lat: 19.4326, lng: -99.1332, value: 700, name: 'Mexico City' },
  { lat: 51.5074, lng: -0.1278, value: 1100, name: 'London' },
  { lat: 35.6895, lng: 139.6917, value: 1400, name: 'Tokyo' },
  { lat: -33.8688, lng: 151.2093, value: 600, name: 'Sydney' },
  { lat: 28.7041, lng: 77.1025, value: 1300, name: 'Delhi' },
  { lat: 1.3521, lng: 103.8198, value: 500, name: 'Singapore' },
  { lat: -1.2921, lng: 36.8219, value: 400, name: 'Nairobi' },
  { lat: 34.0522, lng: -118.2437, value: 1000, name: 'Los Angeles' }
];

const InteractiveGlobe: React.FC<GlobeProps> = ({ pollutionLevel }) => {
  const globeRef = useRef<any>(null);

  // Points data memoized
  const pointsData = useMemo(() => {
    return SAVED_LOCATIONS.map(p => ({
      lat: p.lat,
      lng: p.lng,
      size: Math.min(0.02 + p.value / 20000, 0.12), // altitude for visual pop
      color: `rgba(0, 200, 255, ${0.6 + (p.value / 2000) * 0.4})`,
      label: `${p.name}: ${p.value} g saved`
    }));
  }, []);

  useEffect(() => {
    const g = globeRef.current;
    if (!g) return;

    // Slow auto-rotate
    const controls = g.controls();
    if (controls) {
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.25; // slow and subtle
    }

    // Make globe slightly responsive
    const handleResize = () => g.controls().update();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="w-full max-w-lg aspect-square relative mx-auto">
      {!isWebGLAvailable() && (
        <div className="w-full h-full flex items-center justify-center p-6 bg-slate-900 text-center rounded-lg">
          <div>
            <h3 className="text-lg font-bold text-white mb-2">WebGL not available</h3>
            <p className="text-sm text-slate-300">The 3D globe requires WebGL. Please enable hardware acceleration in your browser or try a different browser.</p>
            <p className="text-xs text-slate-400 mt-2">Chrome: Settings → System → Use hardware acceleration when available. Then restart the browser.</p>
          </div>
        </div>
      )}
      {isWebGLAvailable() && (
      <Globe
        ref={globeRef}
        globeImageUrl={BLUE_MARBLE}
        backgroundColor="rgba(0,0,0,0)" // transparent background
        showAtmosphere={true}
        atmosphereColor={pollutionLevel > 0.5 ? 'rgba(255,100,100,0.35)' : 'rgba(100,200,255,0.25)'}
        pointsData={pointsData}
        pointLat={(d: any) => d.lat}
        pointLng={(d: any) => d.lng}
        pointAltitude={(d: any) => d.size}
        pointColor={(d: any) => d.color}
        pointRadius={0.3}
        pointsTransitionDuration={1000}
        onPointHover={(d: any) => {
          // noop — keep default tooltip via label
        }}
        pointLabel={(d: any) => d.label}
        labelsData={[]}
        labelLat={() => 0}
        labelLng={() => 0}
        labelText={() => ''}
      />
      )}

      <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none">
        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest backdrop-blur-md ${pollutionLevel > 0.5 ? 'bg-red-500/20 text-red-200' : 'bg-green-500/20 text-green-200'}`}>
          {pollutionLevel > 0.5 ? 'Biome Critical' : 'Biome Stable'}
        </span>
      </div>
    </div>
  );
};

export default InteractiveGlobe;
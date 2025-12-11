import React, { useRef, useEffect } from 'react';
import Globe from 'react-globe.gl';

export default function App() {
  const globeRef = useRef<any>(null);

  useEffect(() => {
    // Safety: only touch controls if the ref exists
    if (!globeRef.current) return;
    try {
      const controls = globeRef.current.controls && globeRef.current.controls();
      if (controls) {
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.5;
      }
    } catch (e) {
      // Swallow any errors - avoid crashing the app
      // If needed, we could retry after a short timeout
      // console.warn('Could not set globe controls yet', e);
    }
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '80vmin', height: '80vmin', maxWidth: 900, maxHeight: 900 }}>
        <Globe ref={globeRef} globeImageUrl={'//unpkg.com/three-globe/example/img/earth-blue-marble.jpg'} />
      </div>
    </div>
  );
}

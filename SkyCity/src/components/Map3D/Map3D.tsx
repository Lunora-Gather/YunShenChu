import React, { useMemo, useState } from 'react';
import './Map3D.css';
import { useCity } from '../../context/CityContext';

const buildingSlots = Array.from({ length: 8 });

const Map3D: React.FC = () => {
  const { currentDistricts, departureDecision, discoveredSignalIds, isPastMode, latestSignal, selectedDistrict, setDistrict, signalTelemetry } = useCity();
  const [motionPreference] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)'));
  const discoveredSignalSet = useMemo(() => new Set(discoveredSignalIds), [discoveredSignalIds]);
  const departureClass = !isPastMode && departureDecision ? `departure-${departureDecision.choice}` : '';

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'touch' || motionPreference.matches) return;
    const element = event.currentTarget;
    const rect = element.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    element.style.setProperty('--city-tilt-x', `${58 - y * 7}deg`);
    element.style.setProperty('--city-tilt-z', `${-34 + x * 9}deg`);
  };

  const handlePointerLeave = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.style.removeProperty('--city-tilt-x');
    event.currentTarget.style.removeProperty('--city-tilt-z');
  };

  return (
    <div
      className={`map-3d-container resonance-${signalTelemetry.level} ${departureClass} ${latestSignal ? `focus-${latestSignal.mapFocus}` : ''} ${discoveredSignalSet.has('guixu') ? 'has-guixu' : ''} ${discoveredSignalSet.has('ghost-rail') ? 'has-ghost-rail' : ''} ${discoveredSignalSet.has('core-heartbeat') ? 'has-core-heartbeat' : ''} ${discoveredSignalSet.has('abyss-whale') ? 'has-abyss-whale' : ''} ${discoveredSignalSet.has('observer-return') ? 'has-observer-return' : ''}`}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <div className="map-haze depth-a" />
      <div className="map-haze depth-b" />
      <div className="pressure-veil" aria-hidden="true" />
      <div className="scene">
        <div className="world">
          <div className="grid-floor" />
          <div className="gravity-spine">
            <span />
            <span />
            <span />
          </div>
          <div className="route-ring ring-a" />
          <div className="route-ring ring-b" />
          <div className="ghost-rail-line" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div className="ghost-island" aria-hidden="true">
            <span>GUIXU</span>
          </div>
          <div className="core-heartbeat" aria-hidden="true">
            <span />
            <span />
          </div>
          <div className="abyss-echo" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div className="observer-reticle" aria-hidden="true">
            <span />
            <span />
          </div>

          <div className="cloud-layer layer-one" />
          <div className="cloud-layer layer-two" />

          <div className="shuttle-container" aria-hidden="true">
            {Array.from({ length: 12 }).map((_, index) => (
              <div key={index} className={`shuttle shuttle-${index + 1}`} />
            ))}
          </div>
        </div>
      </div>
      <div className="map-stations" role="group" aria-label="地图上的城区">
        {currentDistricts.map(district => (
          <button key={district.id} type="button" className={`island district-${district.id}`}
            aria-pressed={selectedDistrict.id === district.id} aria-label={district.name}
            onClick={() => setDistrict(district.id)}>
            <span className="island-model" aria-hidden="true">
              <span className="island-shadow" />
              <span className="island-base" />
              <span className="island-underbelly" />
              <span className="tether-beam" />
              <span className="rail-node node-a" /><span className="rail-node node-b" /><span className="rail-node node-c" />
              {selectedDistrict.id === district.id && <span className="selection-ring" />}
            </span>
            <span className="buildings">
              {buildingSlots.map((_, index) => <span key={index} className={`building building-${index + 1}`} />)}
            </span>
            <span className="island-label">
              <strong>{district.name}</strong><small>{district.coordinates.z.toLocaleString()} m</small>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default Map3D;

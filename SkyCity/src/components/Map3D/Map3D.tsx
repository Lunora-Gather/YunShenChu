import React, { useCallback, useMemo, useState } from 'react';
import './Map3D.css';
import { useCity } from '../../context/CityContext';

const buildingSlots = Array.from({ length: 8 });

const Map3D: React.FC = () => {
  const { currentDistricts, discoveredSignalIds, latestSignal, selectedDistrict, setDistrict } = useCity();
  const [hoveredIslandId, setHoveredIslandId] = useState<string | null>(null);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const discoveredSignalSet = useMemo(() => new Set(discoveredSignalIds), [discoveredSignalIds]);

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    setParallax({ x, y });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setParallax({ x: 0, y: 0 });
    setHoveredIslandId(null);
  }, []);

  const worldStyle = useMemo<React.CSSProperties>(() => ({
    transform: `translateY(18px) scale(1.08) rotateX(${58 - parallax.y * 7}deg) rotateZ(${-34 + parallax.x * 9}deg)`,
  }), [parallax.x, parallax.y]);

  const islands = useMemo(() => {
    return currentDistricts.map((district, index) => {
      const normalizedZ = (district.coordinates.z - 5000) / 4.5;
      const isActive = selectedDistrict.id === district.id;
      const isHovered = hoveredIslandId === district.id;
      const scale = isActive ? 1.22 : isHovered ? 1.12 : 1;

      return {
        ...district,
        index,
        style: {
          left: '50%',
          top: '50%',
          opacity: isActive ? 1 : isHovered ? 0.86 : 0.54,
          transform: `translate3d(calc(-50% + ${district.coordinates.x / 1.45}px), calc(-50% + ${district.coordinates.y / 1.45}px), ${normalizedZ}px) scale(${scale})`,
        } satisfies React.CSSProperties,
      };
    });
  }, [currentDistricts, hoveredIslandId, selectedDistrict.id]);

  return (
    <div
      className={`map-3d-container ${latestSignal ? `focus-${latestSignal.mapFocus}` : ''} ${discoveredSignalSet.has('guixu') ? 'has-guixu' : ''} ${discoveredSignalSet.has('ghost-rail') ? 'has-ghost-rail' : ''} ${discoveredSignalSet.has('core-heartbeat') ? 'has-core-heartbeat' : ''} ${discoveredSignalSet.has('abyss-whale') ? 'has-abyss-whale' : ''} ${discoveredSignalSet.has('observer-return') ? 'has-observer-return' : ''}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className="map-haze depth-a" />
      <div className="map-haze depth-b" />
      <div className="scene">
        <div className="world" style={worldStyle}>
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

          {islands.map((island) => (
            <button
              key={island.id}
              className={`island district-${island.id} ${selectedDistrict.id === island.id ? 'active' : ''} ${hoveredIslandId === island.id ? 'hovered' : ''}`}
              style={island.style}
              onClick={() => setDistrict(island.id)}
              onMouseEnter={() => setHoveredIslandId(island.id)}
              type="button"
              aria-label={`${island.name} ${island.visual_style}`}
              aria-pressed={selectedDistrict.id === island.id}
            >
              <span className="island-shadow" />
              <span className="island-base" />
              <span className="island-underbelly" />
              <span className="tether-beam" />

              <span className="buildings" aria-hidden="true">
                {buildingSlots.map((_, index) => (
                  <span key={index} className={`building building-${index + 1}`} />
                ))}
              </span>

              <span className="rail-node node-a" />
              <span className="rail-node node-b" />
              <span className="rail-node node-c" />

              <span className="island-label">
                <span className="name">{island.name}</span>
                <span className="hint">{island.visual_style}</span>
              </span>

              {selectedDistrict.id === island.id && <span className="selection-ring" />}
            </button>
          ))}

          <div className="cloud-layer layer-one" />
          <div className="cloud-layer layer-two" />

          <div className="shuttle-container" aria-hidden="true">
            {Array.from({ length: 12 }).map((_, index) => (
              <div key={index} className={`shuttle shuttle-${index + 1}`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Map3D;

import React, { useEffect, useMemo, useRef, useState } from 'react';
import './SecurityCamera.css';
import { useCity } from '../../context/CityContext';

interface SecurityCameraProps {
  isActive: boolean;
  onClose: () => void;
}

const CAMERA_PROFILES = {
  apex: {
    camera: '01-A',
    lens: 'Apex glassline',
    subject: 'Council atrium / zero-gravity tower',
    feed: 'transparent high-rise silhouettes, slow administrative routes, sealed archive veins',
  },
  mid_ring: {
    camera: '07-M',
    lens: 'Market spine',
    subject: 'Floating bazaar / residential bridges',
    feed: 'neon walkways, shuttle stalls, civic chatter moving through warm commercial decks',
  },
  foundation: {
    camera: '14-F',
    lens: 'Engine throat',
    subject: 'Gravity core / cloud harvester shafts',
    feed: 'maintenance gantries, condensation columns, deep vents below the mapped city',
  },
} as const;

const SecurityCamera: React.FC<SecurityCameraProps> = ({ isActive, onClose }) => {
  const { latestSignal, selectedDistrict, weather, world } = useCity();
  const [time, setTime] = useState(new Date());
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const profile = CAMERA_PROFILES[selectedDistrict.id as keyof typeof CAMERA_PROFILES] ?? CAMERA_PROFILES.foundation;
  const relevantSignal = useMemo(() => {
    if (!latestSignal) return null;
    if (!latestSignal.districtId || latestSignal.districtId === selectedDistrict.id) return latestSignal;
    return null;
  }, [latestSignal, selectedDistrict.id]);

  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, [isActive]);

  useEffect(() => {
    if (!isActive) return;
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, onClose]);

  if (!isActive) return null;

  return (
    <div
      className={`security-camera-overlay active camera-feed-${selectedDistrict.id} ${relevantSignal ? 'signal-in-feed' : ''} ${latestSignal ? `camera-signal-${latestSignal.mapFocus}` : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="security-camera-title"
    >
      <div className="camera-inner" />
      <div className="camera-reticle" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <div className="camera-header">
        <div className="rec-indicator">
          <div className="rec-dot" />
          REC
        </div>
        <div id="security-camera-title" className="camera-title">
          <span>CAM {profile.camera} / {profile.lens}</span>
          <strong>{selectedDistrict.name}</strong>
        </div>
      </div>

      <button ref={closeButtonRef} className="close-camera-btn" onClick={onClose} type="button">EXIT</button>

      <div className="camera-feed-content">
        <div className="camera-feed-stage" aria-hidden="true">
          <span className="camera-horizon" />
          <span className="camera-platform" />
          <span className="camera-spire spire-a" />
          <span className="camera-spire spire-b" />
          <span className="camera-spire spire-c" />
          <span className="camera-route route-a" />
          <span className="camera-route route-b" />
          <span className="camera-core" />
          <span className="camera-cloud cloud-a" />
          <span className="camera-cloud cloud-b" />
          {relevantSignal && <span className={`camera-anomaly anomaly-${relevantSignal.mapFocus}`} />}
        </div>
        <div className="camera-caption">
          <span>{relevantSignal ? 'ANOMALY CROSS-LINK' : 'LIVE SYNTHETIC FEED'}</span>
          <strong>{relevantSignal?.title ?? profile.subject}</strong>
          <small>{relevantSignal?.evidence ?? profile.feed}</small>
        </div>
      </div>

      <div className="camera-footer">
        <div className="camera-telemetry">
          <span>ENERGY {world.global_stats.energy_index.toFixed(1)}%</span>
          <span>WIND {weather.wind_speed}m/s</span>
          <span>HUM {weather.humidity}%</span>
        </div>
        <div>{time.toLocaleDateString()} {time.toLocaleTimeString()}</div>
      </div>
    </div>
  );
};

export default SecurityCamera;

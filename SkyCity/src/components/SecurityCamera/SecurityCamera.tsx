import React, { useEffect, useState } from 'react';
import './SecurityCamera.css';
import { useCity } from '../../context/CityContext';
import { getFieldRecord } from '../../data/caseFiles';
import guixuStill from '../../assets/guixu-camera-14f.jpg';
import apexStill from '../../assets/camera-apex.jpg';
import midRingStill from '../../assets/camera-midring.jpg';
import foundationStill from '../../assets/camera-foundation.jpg';
import ConsoleDialog from '../ConsoleDialog/ConsoleDialog';

interface SecurityCameraProps {
  opener: HTMLElement | null;
  onClose: () => void;
}

const CAMERA_PROFILES = {
  apex: {
    camera: '01-A',
    lens: 'Apex glassline',
    subject: 'Council atrium / zero-gravity tower',
    feed: 'transparent high-rise silhouettes, slow administrative routes, sealed archive veins',
    image: apexStill,
    alt: 'Glass bridges and a luminous transit shaft overlooking the Apex cloudline.',
  },
  mid_ring: {
    camera: '07-M',
    lens: 'Market spine',
    subject: 'Floating bazaar / residential bridges',
    feed: 'neon walkways, shuttle stalls, civic chatter moving through warm commercial decks',
    image: midRingStill,
    alt: 'Amber market stalls on rain-wet walkways suspended above the clouds.',
  },
  foundation: {
    camera: '14-F',
    lens: 'Engine throat',
    subject: 'Gravity core / cloud harvester shafts',
    feed: 'maintenance gantries, condensation columns, deep vents below the mapped city',
    image: foundationStill,
    alt: 'Pressure ducts and suspended anchors around a circular cloud intake.',
  },
} as const;

const SecurityCamera: React.FC<SecurityCameraProps> = ({ opener, onClose }) => {
  const { investigationState, isPastMode, latestSignal, selectedDistrict, signalTelemetry, weather, world } = useCity();
  const [time, setTime] = useState(() => new Date());
  const [failedImage, setFailedImage] = useState<string>();

  const profile = CAMERA_PROFILES[selectedDistrict.id as keyof typeof CAMERA_PROFILES] ?? CAMERA_PROFILES.foundation;
  const relevantSignal = !isPastMode && latestSignal && (!latestSignal.districtId || latestSignal.districtId === selectedDistrict.id)
    ? latestSignal
    : null;
  const thread = relevantSignal ? investigationState.threads[relevantSignal.id] : null;
  const capture = relevantSignal?.id === 'guixu' ? getFieldRecord('guixu', 'review-camera') : undefined;
  const overlaySetting = capture?.readings.find(({ id }) => id === 'camera-mode')?.value;
  const still = capture ? guixuStill : isPastMode ? undefined : profile.image;
  const showsStill = still && still !== failedImage;
  const stillAlt = capture ? 'An isolated industrial platform with three support struts, visible beneath the cloud layer.' : profile.alt;

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <ConsoleDialog
      className={`security-camera-overlay active camera-feed-${selectedDistrict.id} ${showsStill ? 'camera-photographic' : ''} ${relevantSignal ? `signal-in-feed camera-signal-${relevantSignal.mapFocus}` : ''}`}
      titleId="security-camera-title"
      opener={opener}
      onClose={onClose}
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
          {capture ? 'BUF' : isPastMode ? 'ARC' : 'VIEW'}
        </div>
        <div id="security-camera-title" className="camera-title">
          <span>CAM {profile.camera} / {profile.lens}</span>
          <strong>{selectedDistrict.name}</strong>
        </div>
        <button data-dialog-focus className="close-camera-btn" onClick={onClose} type="button" aria-label="Close security camera">EXIT</button>
      </div>

      <div className="camera-feed-content">
        {showsStill ? (
          <div className="camera-feed-stage camera-feed-still">
            <img src={still} alt={stillAlt} width={1440} height={810} decoding="async" onError={() => setFailedImage(still)} />
          </div>
        ) : <div className="camera-feed-stage" aria-hidden="true">
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
        </div>}
        <div className="camera-caption">
          <span>{thread ? `ANOMALY CROSS-LINK / ${thread.stage}` : isPastMode ? 'FOUNDATION ARCHIVE FEED' : 'LIVE SYNTHETIC FEED'}</span>
          <strong>{relevantSignal?.title ?? profile.subject}</strong>
          <small>{capture && overlaySetting ? `Buffered at ${capture.time} · ${overlaySetting}` : relevantSignal?.evidence ?? profile.feed}</small>
          <em>{thread?.stageText ?? `Signal pressure ${signalTelemetry.pressure}% / ${signalTelemetry.level}`}</em>
        </div>
      </div>

      <div className="camera-footer">
        <div className="camera-telemetry">
          <span>ENERGY {world.global_stats.energy_index.toFixed(1)}%</span>
          <span>WIND {weather.wind_speed}m/s</span>
          <span>HUM {weather.humidity}%</span>
          <span>SIGNAL {signalTelemetry.pressure}%</span>
        </div>
        <div>{time.toLocaleDateString()} {time.toLocaleTimeString()}</div>
      </div>
    </ConsoleDialog>
  );
};

export default SecurityCamera;

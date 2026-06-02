import React, { useMemo } from 'react';
import { useCity } from '../../context/CityContext';
import './GlitchOverlay.css';

const GlitchOverlay: React.FC = () => {
  const { world, alerts, signalTelemetry } = useCity();
  
  const isGlitching = useMemo(() => {
    const lowEnergy = (world.global_stats.energy_index || 0) < 85;
    const ionStorm = alerts.some(alert => alert.message.toLowerCase().includes('ion storm'));
    const signalBreach = signalTelemetry.level === 'breach' || signalTelemetry.pressure >= 72;
    return lowEnergy || ionStorm || signalBreach;
  }, [world.global_stats.energy_index, alerts, signalTelemetry.level, signalTelemetry.pressure]);

  if (!isGlitching) return null;

  const warningReason = signalTelemetry.pressure >= 72
    ? `SIGNAL BREACH ${signalTelemetry.pressure}%`
    : world.global_stats.energy_index < 85
      ? 'LOW ENERGY'
      : 'ION STORM';

  return (
    <div className="glitch-overlay-root">
      <div className="glitch-layer glitch-noise-layer"></div>
      <div className="glitch-layer glitch-scanline-layer"></div>
      <div className="glitch-layer glitch-static-layer"></div>
      <div className="glitch-warning-label">
        <div className="glitch-warning-content">
          <span className="glitch-warning-icon">!</span>
          <span className="glitch-warning-text">SIGNAL INTERFERENCE: {warningReason}</span>
        </div>
      </div>
      <div className="glitch-chromatic-aberration"></div>
    </div>
  );
};

export default GlitchOverlay;

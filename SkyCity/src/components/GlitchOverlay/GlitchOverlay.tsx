import React, { useMemo } from 'react';
import { useCity } from '../../context/CityContext';
import './GlitchOverlay.css';

const GlitchOverlay: React.FC = () => {
  const { world, alerts } = useCity();
  
  const isGlitching = useMemo(() => {
    // energy_index < 85 or an active Ion Storm alert
    const lowEnergy = (world.global_stats.energy_index || 0) < 85;
    const ionStorm = alerts.some(alert => alert.message.toLowerCase().includes('ion storm'));
    return lowEnergy || ionStorm;
  }, [world.global_stats.energy_index, alerts]);

  if (!isGlitching) return null;

  return (
    <div className="glitch-overlay-root">
      <div className="glitch-layer glitch-noise-layer"></div>
      <div className="glitch-layer glitch-scanline-layer"></div>
      <div className="glitch-layer glitch-static-layer"></div>
      <div className="glitch-warning-label">
        <div className="glitch-warning-content">
          <span className="glitch-warning-icon">⚠️</span>
          <span className="glitch-warning-text">SIGNAL INTERFERENCE: {world.global_stats.energy_index < 85 ? 'LOW ENERGY' : 'ION STORM'}</span>
        </div>
      </div>
      <div className="glitch-chromatic-aberration"></div>
    </div>
  );
};

export default GlitchOverlay;

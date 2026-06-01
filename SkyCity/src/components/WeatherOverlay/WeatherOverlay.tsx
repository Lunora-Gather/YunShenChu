import React from 'react';
import './WeatherOverlay.css';
import { RainOfLight, StaticDischarge } from './WeatherEffects';

interface WeatherOverlayProps {
  condition: string;
}

const WeatherOverlay: React.FC<WeatherOverlayProps> = ({ condition }) => {
  const isAurora = condition.toLowerCase().includes('ion') || condition.toLowerCase().includes('aurora');
  const isClear = condition.toLowerCase().includes('clear');
  const isStorm = condition.toLowerCase().includes('storm');
  
  return (
    <div className="weather-overlay-container">
      <div className="mist-layer mist-1"></div>
      <div className="mist-layer mist-2"></div>
      {isAurora && (
        <div className="aurora-container">
          <div className="aurora-glow"></div>
        </div>
      )}
      {isClear && <RainOfLight />}
      {isStorm && <StaticDischarge />}
    </div>
  );
};

export default WeatherOverlay;

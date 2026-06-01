import React from 'react';
import './WeatherEffects.css';

const seededRandom = (seed: number) => {
  const value = Math.sin(seed * 9301 + 49297) * 233280;
  return value - Math.floor(value);
};

const LIGHT_DROPS = Array.from({ length: 40 }).map((_, index) => ({
  id: index,
  left: seededRandom(index + 1) * 100,
  delay: seededRandom(index + 101) * 5,
  duration: 2 + seededRandom(index + 201) * 3,
}));

export const RainOfLight: React.FC = () => {
  return (
    <div className="rain-of-light">
      {LIGHT_DROPS.map((drop) => (
        <div
          key={drop.id}
          className="light-drop"
          style={{
            left: `${drop.left}%`,
            animationDelay: `${drop.delay}s`,
            animationDuration: `${drop.duration}s`,
          }}
        />
      ))}
    </div>
  );
};

export const StaticDischarge: React.FC = () => {
  return (
    <div className="static-discharge">
      <div className="bolt bolt-horizontal" />
      <div className="bolt bolt-vertical" />
      <div className="vignette-flicker" />
    </div>
  );
};

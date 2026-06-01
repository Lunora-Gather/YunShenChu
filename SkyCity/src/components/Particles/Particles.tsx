import React from 'react';

const seededRandom = (seed: number) => {
  const value = Math.sin(seed * 9301 + 49297) * 233280;
  return value - Math.floor(value);
};

const PARTICLES = Array.from({ length: 30 }).map((_, index) => ({
  id: index,
  size: seededRandom(index + 1) * 3 + 1,
  left: seededRandom(index + 101) * 100,
  duration: seededRandom(index + 201) * 20 + 10,
  delay: seededRandom(index + 301) * 10,
}));

const Particles: React.FC = () => {
  return (
    <div className="particles-container">
      {PARTICLES.map((particle) => (
        <div
          key={particle.id}
          className="particle"
          style={{
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            left: `${particle.left}%`,
            bottom: `-${particle.size}px`,
            animation: `particleFloat ${particle.duration}s linear infinite`,
            animationDelay: `${particle.delay}s`,
          }}
        />
      ))}
    </div>
  );
};

export default Particles;

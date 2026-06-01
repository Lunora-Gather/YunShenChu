import React, { useEffect, useState } from 'react';
import './Starfield.css';

const seededRandom = (seed: number) => {
  const value = Math.sin(seed * 9301 + 49297) * 233280;
  return value - Math.floor(value);
};

const STARS = Array.from({ length: 150 }).map((_, index) => ({
  id: index,
  size: seededRandom(index + 1) * 2 + 1,
  top: seededRandom(index + 151) * 100,
  left: seededRandom(index + 301) * 100,
  opacity: seededRandom(index + 451) * 0.7 + 0.3,
}));

const NEBULAE = [
  { id: 1, color: 'rgba(64, 196, 255, 0.12)', top: '20%', left: '10%', size: '40vw' },
  { id: 2, color: 'rgba(74, 222, 128, 0.08)', top: '50%', left: '60%', size: '35vw' },
  { id: 3, color: 'rgba(255, 179, 71, 0.08)', top: '10%', left: '70%', size: '50vw' },
];

const Starfield: React.FC = () => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const x = (event.clientX / window.innerWidth - 0.5) * 2;
      const y = (event.clientY / window.innerHeight - 0.5) * 2;
      setMousePos({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="starfield-container">
      {NEBULAE.map((nebula) => (
        <div
          key={nebula.id}
          className="nebula"
          style={{
            backgroundColor: nebula.color,
            top: nebula.top,
            left: nebula.left,
            width: nebula.size,
            height: nebula.size,
            transform: `translate(${mousePos.x * -10}px, ${mousePos.y * -10}px)`,
          }}
        />
      ))}
      <div
        className="stars-layer"
        style={{
          transform: `translate(${mousePos.x * -30}px, ${mousePos.y * -30}px)`,
        }}
      >
        {STARS.map((star) => (
          <div
            key={star.id}
            className="star"
            style={{
              width: `${star.size}px`,
              height: `${star.size}px`,
              top: `${star.top}%`,
              left: `${star.left}%`,
              opacity: star.opacity,
              boxShadow: `0 0 ${star.size * 2}px #fff`,
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default Starfield;

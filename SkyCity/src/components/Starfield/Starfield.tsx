import { memo, useEffect, useRef } from 'react';
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

const Starfield = memo(function Starfield() {
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame: number | null = null;
    let x = 0;
    let y = 0;
    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || motion.matches) return;

      x = (0.5 - event.clientX / window.innerWidth) * 2;
      y = (0.5 - event.clientY / window.innerHeight) * 2;
      if (frame !== null) return;

      frame = requestAnimationFrame(() => {
        layer.style.setProperty('--starfield-x', String(x));
        layer.style.setProperty('--starfield-y', String(y));
        frame = null;
      });
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="starfield-container" ref={layerRef} aria-hidden="true">
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
          }}
        />
      ))}
      <div className="stars-layer">
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
});

export default Starfield;

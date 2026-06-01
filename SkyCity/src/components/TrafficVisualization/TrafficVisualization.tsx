import React, { useEffect, useRef } from 'react';

interface Shuttle {
  x: number;
  y: number;
  speed: number;
  size: number;
  opacity: number;
}

const TrafficVisualization: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const shuttles: Shuttle[] = [];

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    window.addEventListener('resize', resize);
    resize();

    // Initialize shuttles
    for (let i = 0; i < 40; i++) {
      shuttles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        speed: 0.5 + Math.random() * 2,
        size: 1 + Math.random() * 2,
        opacity: 0.1 + Math.random() * 0.5
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      shuttles.forEach(shuttle => {
        ctx.fillStyle = `rgba(0, 210, 255, ${shuttle.opacity})`;
        ctx.beginPath();
        // Draw a small elongated "shuttle" shape
        ctx.rect(shuttle.x, shuttle.y, shuttle.size * 3, shuttle.size);
        ctx.fill();

        // Add a small trail
        const gradient = ctx.createLinearGradient(shuttle.x, shuttle.y, shuttle.x - 10, shuttle.y);
        gradient.addColorStop(0, `rgba(0, 210, 255, ${shuttle.opacity * 0.5})`);
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.fillRect(shuttle.x - 10, shuttle.y, 10, shuttle.size);

        shuttle.x += shuttle.speed;
        if (shuttle.x > canvas.width + 20) {
          shuttle.x = -20;
          shuttle.y = Math.random() * canvas.height;
        }
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1
      }}
    />
  );
};

export default TrafficVisualization;

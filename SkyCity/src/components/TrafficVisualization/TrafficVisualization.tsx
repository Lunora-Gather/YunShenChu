import React, { useEffect, useEffectEvent, useRef } from 'react';

interface Shuttle {
  x: number;
  verticalPosition: number;
  speed: number;
  size: number;
  opacity: number;
}

const TrafficVisualization: React.FC<{ paused: boolean }> = ({ paused }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const refreshAnimation = useRef<() => void>(null);
  const isPaused = useEffectEvent(() => paused);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const sprite = document.createElement('canvas');
    sprite.width = 16;
    sprite.height = 1;
    const spriteContext = sprite.getContext('2d');
    if (!spriteContext) return;
    const gradient = spriteContext.createLinearGradient(0, 0, 10, 0);
    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(1, '#00d2ff');
    spriteContext.fillStyle = gradient;
    spriteContext.fillRect(0, 0, sprite.width, 1);

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const shuttles: Shuttle[] = Array.from({ length: 40 }, () => ({
        x: Math.random() * canvas.clientWidth,
        verticalPosition: Math.random(),
        speed: 30 + Math.random() * 120,
        size: 1 + Math.random() * 2,
        opacity: 0.1 + Math.random() * 0.5
    }));
    let width = 0;
    let height = 0;
    let frame: number | null = null;
    let lastFrame = 0;
    let visible = true;

    const draw = (seconds: number) => {
      ctx.clearRect(0, 0, width, height);
      for (const shuttle of shuttles) {
        shuttle.x += shuttle.speed * seconds;
        if (shuttle.x > width + 20) {
          shuttle.x = -20;
          shuttle.verticalPosition = Math.random();
        }
        ctx.globalAlpha = shuttle.opacity;
        ctx.drawImage(sprite, shuttle.x - 10, shuttle.verticalPosition * height, 10 + shuttle.size * 3, shuttle.size);
      }
    };

    const tick = (now: number) => {
      const elapsed = now - lastFrame;
      if (elapsed >= 30) {
        draw(Math.min(elapsed / 1000, 0.08));
        lastFrame = now;
      }
      frame = requestAnimationFrame(tick);
    };

    const updateAnimation = () => {
      if (visible && !document.hidden && !motion.matches && !isPaused()) {
        if (frame !== null) return;
        lastFrame = performance.now();
        frame = requestAnimationFrame(tick);
      } else if (frame !== null) {
        cancelAnimationFrame(frame);
        frame = null;
      }
    };

    const resize = () => {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      const scale = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      draw(0);
    };

    const resizeObserver = new ResizeObserver(resize);
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      updateAnimation();
    });
    resizeObserver.observe(canvas);
    intersectionObserver.observe(canvas);
    document.addEventListener('visibilitychange', updateAnimation);
    motion.addEventListener('change', updateAnimation);
    refreshAnimation.current = updateAnimation;
    resize();
    updateAnimation();

    return () => {
      refreshAnimation.current = null;
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener('visibilitychange', updateAnimation);
      motion.removeEventListener('change', updateAnimation);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => refreshAnimation.current?.(), [paused]);

  return (
    <canvas aria-hidden="true"
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

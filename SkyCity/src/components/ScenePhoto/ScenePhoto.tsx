import { useEffect, useRef, useState } from 'react';
import { RotateCw } from 'lucide-react';

interface Photo { src: string; alt: string }

export default function ScenePhoto({ src, alt }: Photo) {
  const [frame, setFrame] = useState<{ photo: Photo; behind?: Photo } | null>(null);
  const [failed, setFailed] = useState('');
  const [delayed, setDelayed] = useState('');
  const [attempt, setAttempt] = useState(0);
  const retry = useRef<HTMLButtonElement>(null);
  const unavailable = failed === src;

  useEffect(() => {
    let current = true;
    const next = new Image();
    const delay = window.setTimeout(() => setDelayed(src), 400);
    next.fetchPriority = 'high';
    next.onload = async () => {
      try { await next.decode(); } catch { /* A loaded image can still be painted when decode is unavailable. */ }
      if (!current) return;
      window.clearTimeout(delay);
      const button = retry.current;
      if (button && document.activeElement === button) {
        const destination = button.closest('.scene-frame')?.querySelector<HTMLElement>('.scene-waypoint')
          ?? button.closest('.night-watch')?.querySelector<HTMLElement>('.watch-primary');
        destination?.focus({ preventScroll: true });
      }
      setFrame(last => last?.photo.src === src ? last : { photo: { src, alt }, behind: last?.photo });
      setFailed('');
      setDelayed('');
    };
    next.onerror = () => {
      if (!current) return;
      window.clearTimeout(delay);
      setFailed(src);
      setDelayed('');
    };
    next.src = src;
    return () => {
      current = false;
      window.clearTimeout(delay);
      next.onload = null;
      next.onerror = null;
    };
  }, [src, alt, attempt]);

  return <>
    <div className="scene-photographs">
      {!unavailable && frame && <>
        {frame.behind && <img className="scene-underlay" src={frame.behind.src} alt="" />}
        <img key={frame.photo.src} className="city-panorama" src={frame.photo.src}
          alt={src === frame.photo.src ? alt : ''} width="1536" height="1024"
          onError={() => { if (frame.photo.src === src) setFailed(src); }} />
      </>}
    </div>
    {unavailable ? <button ref={retry} type="button" className="photo-feedback photo-retry"
      aria-label="现场画面加载失败，重新加载" onClick={() => setAttempt(value => value + 1)}>
      <RotateCw size={14} aria-hidden="true" />重载画面
    </button> : delayed === src && frame?.photo.src !== src &&
      <small className="photo-feedback" role="status">正在调取现场…</small>}
  </>;
}

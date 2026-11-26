import { useEffect, useRef, useState } from 'react';
import { Square, Volume2 } from 'lucide-react';

const clips: Record<string, { tones: number[]; wave: OscillatorType; spacing: number; decay: number; noise?: boolean }> = {
  檐铃: { tones: [1190, 1786, 1510], wave: 'sine', spacing: .19, decay: .76 },
  汽笛: { tones: [260, 327], wave: 'sawtooth', spacing: .035, decay: 1.05 },
  水声: { tones: [690, 1160, 820, 1250], wave: 'sine', spacing: .17, decay: .3, noise: true },
  雨点: { tones: [1500, 2700, 1900, 2200, 1700], wave: 'sine', spacing: .14, decay: .15, noise: true },
  车铃: { tones: [1350, 1810, 1350, 1810], wave: 'triangle', spacing: .105, decay: .38 },
  木鱼: { tones: [520, 520, 450], wave: 'sine', spacing: .3, decay: .12 },
  潮音: { tones: [480, 880, 610], wave: 'sine', spacing: .23, decay: .68, noise: true },
  钟声: { tones: [175, 437, 523], wave: 'sine', spacing: .015, decay: 1.22 },
  竹笛: { tones: [587, 659, 784], wave: 'sine', spacing: .27, decay: .4 },
};

export default function ListenClip({ sound }: { sound: string }) {
  const active = useRef<AudioContext | null>(null);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => () => {
    const context = active.current;
    active.current = null;
    if (context && context.state !== 'closed') void context.close().catch(() => {});
  }, []);
  const stop = () => {
    const context = active.current;
    active.current = null;
    setPlaying(false);
    if (context && context.state !== 'closed') void context.close().catch(() => {});
  };
  const listen = async () => {
    if (active.current) { stop(); return; }
    let requested: AudioContext | null = null;
    try {
      const ctx = new AudioContext();
      requested = ctx;
      active.current = ctx;
      setPlaying(true);
      setFailed(false);
      await ctx.resume();
      if (active.current !== ctx) return;
      const clip = clips[sound];
      clip.tones.forEach((frequency, i) => {
        const when = ctx.currentTime + .02 + i * clip.spacing;
        const volume = ctx.createGain();
        volume.gain.setValueAtTime(.0001, when);
        volume.gain.exponentialRampToValueAtTime(clip.noise ? .22 : .075, when + .025);
        volume.gain.exponentialRampToValueAtTime(.0001, when + clip.decay);
        volume.connect(ctx.destination);
        let voice: AudioScheduledSourceNode;
        if (clip.noise) {
          const noise = ctx.createBufferSource();
          noise.buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * clip.decay), ctx.sampleRate);
          const channel = noise.buffer.getChannelData(0);
          for (let j = 0; j < channel.length; j++) channel[j] = Math.random() * 2 - 1;
          const band = ctx.createBiquadFilter();
          band.type = 'bandpass';
          band.frequency.value = frequency;
          noise.connect(band).connect(volume);
          voice = noise;
        } else {
          const tone = ctx.createOscillator();
          tone.type = clip.wave;
          tone.frequency.value = frequency;
          tone.connect(volume);
          voice = tone;
        }
        if (i === clip.tones.length - 1) voice.onended = () => { if (active.current === ctx) stop(); };
        voice.start(when);
        voice.stop(when + clip.decay);
      });
    } catch {
      if (active.current !== requested) return;
      if (active.current) stop();
      setFailed(true);
    }
  };
  return <button type="button" aria-pressed={playing} className="watch-listen" onClick={() => void listen()}>
    {playing ? <Square size={14} /> : <Volume2 size={15} />}
    {playing ? '停止试听' : failed ? '重新试听' : '试听留声'}
  </button>;
}

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useCity } from '../../context/CityContext';
import './AudioEngine.css';

type AudioContextConstructor = typeof AudioContext;
type AudioWindow = Window & { webkitAudioContext?: AudioContextConstructor };

const getAudioContextConstructor = () => {
  return window.AudioContext || (window as AudioWindow).webkitAudioContext;
};

const createPinkNoiseBuffer = (ctx: AudioContext) => {
  const bufferSize = 2 * ctx.sampleRate;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = buffer.getChannelData(0);
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  let b3 = 0;
  let b4 = 0;
  let b5 = 0;
  let b6 = 0;

  for (let index = 0; index < bufferSize; index += 1) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.969 * b2 + white * 0.153852;
    b3 = 0.8665 * b3 + white * 0.3104856;
    b4 = 0.55 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.016898;
    output[index] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
    b6 = white * 0.115926;
  }

  return buffer;
};

const trackNode = <T extends AudioNode>(nodes: AudioNode[], node: T) => {
  nodes.push(node);
  return node;
};

const createTone = (
  ctx: AudioContext,
  target: AudioNode,
  nodes: AudioNode[],
  frequency: number,
  type: OscillatorType,
  gainValue: number,
) => {
  const oscillator = trackNode(nodes, ctx.createOscillator());
  const gain = trackNode(nodes, ctx.createGain());
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.value = gainValue;
  oscillator.connect(gain);
  gain.connect(target);
  oscillator.start();
};

const AudioEngine: React.FC = () => {
  const { latestSignal, selectedDistrict, lastSoundTrigger } = useCity();
  const [isMuted, setIsMuted] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const ambienceGainRef = useRef<GainNode | null>(null);
  const uiGainRef = useRef<GainNode | null>(null);
  const apexGainRef = useRef<GainNode | null>(null);
  const midRingGainRef = useRef<GainNode | null>(null);
  const foundationGainRef = useRef<GainNode | null>(null);
  const activeNodesRef = useRef<AudioNode[]>([]);

  const playInternalUISound = useCallback((type: 'beep' | 'click') => {
    if (!audioContextRef.current || !uiGainRef.current) return;
    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') void ctx.resume();

    const now = ctx.currentTime;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type === 'beep' ? 'sine' : 'triangle';
    oscillator.frequency.setValueAtTime(type === 'beep' ? 1200 : 1500, now);
    oscillator.frequency.exponentialRampToValueAtTime(type === 'beep' ? 760 : 420, now + 0.08);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(type === 'beep' ? 0.18 : 0.11, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    oscillator.connect(gain);
    gain.connect(uiGainRef.current);
    oscillator.start(now);
    oscillator.stop(now + 0.2);
  }, []);

  const playSignalLockTone = useCallback((frequency: number) => {
    if (!audioContextRef.current || !uiGainRef.current) return;
    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') void ctx.resume();

    const now = ctx.currentTime;
    const carrier = ctx.createOscillator();
    const harmonic = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    carrier.type = 'sine';
    harmonic.type = 'triangle';
    carrier.frequency.setValueAtTime(frequency * 6, now);
    harmonic.frequency.setValueAtTime(frequency * 9, now);
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(frequency * 9, now);
    filter.Q.value = 8;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.16, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.72);

    carrier.connect(filter);
    harmonic.connect(filter);
    filter.connect(gain);
    gain.connect(uiGainRef.current);
    carrier.start(now);
    harmonic.start(now + 0.03);
    carrier.stop(now + 0.78);
    harmonic.stop(now + 0.78);
  }, []);

  const initAudio = useCallback((startMuted: boolean) => {
    if (audioContextRef.current) return;

    const AudioContextClass = getAudioContextConstructor();
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    audioContextRef.current = ctx;

    const masterGain = ctx.createGain();
    masterGain.gain.value = 1;
    masterGain.connect(ctx.destination);

    const ambienceGain = ctx.createGain();
    ambienceGain.gain.value = startMuted ? 0.001 : 0.38;
    ambienceGain.connect(masterGain);
    ambienceGainRef.current = ambienceGain;

    const uiGain = ctx.createGain();
    uiGain.gain.value = 0.35;
    uiGain.connect(masterGain);
    uiGainRef.current = uiGain;

    const windSource = trackNode(activeNodesRef.current, ctx.createBufferSource());
    const windFilter = trackNode(activeNodesRef.current, ctx.createBiquadFilter());
    const windGain = trackNode(activeNodesRef.current, ctx.createGain());
    windSource.buffer = createPinkNoiseBuffer(ctx);
    windSource.loop = true;
    windFilter.type = 'lowpass';
    windFilter.frequency.value = 1100;
    windGain.gain.value = 0.12;
    windSource.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(ambienceGain);
    windSource.start();

    const apexGain = ctx.createGain();
    const midRingGain = ctx.createGain();
    const foundationGain = ctx.createGain();
    apexGain.gain.value = selectedDistrict.id === 'apex' ? 1 : 0.001;
    midRingGain.gain.value = selectedDistrict.id === 'mid_ring' ? 1 : 0.001;
    foundationGain.gain.value = selectedDistrict.id === 'foundation' ? 1 : 0.001;
    apexGain.connect(ambienceGain);
    midRingGain.connect(ambienceGain);
    foundationGain.connect(ambienceGain);
    apexGainRef.current = apexGain;
    midRingGainRef.current = midRingGain;
    foundationGainRef.current = foundationGain;

    [1200, 1800, 2400].forEach((frequency) => createTone(ctx, apexGain, activeNodesRef.current, frequency, 'sine', 0.018));
    createTone(ctx, midRingGain, activeNodesRef.current, 110, 'triangle', 0.045);
    [55, 55.5, 110].forEach((frequency) => createTone(ctx, foundationGain, activeNodesRef.current, frequency, 'sawtooth', 0.025));

    setIsInitialized(true);
    if (startMuted) void ctx.suspend();
  }, [selectedDistrict.id]);

  useEffect(() => {
    if (lastSoundTrigger && isInitialized) {
      playInternalUISound(lastSoundTrigger.type);
    }
  }, [lastSoundTrigger, isInitialized, playInternalUISound]);

  useEffect(() => {
    if (!latestSignal || !isInitialized || isMuted) return;
    playSignalLockTone(latestSignal.freq);
  }, [isInitialized, isMuted, latestSignal, playSignalLockTone]);

  useEffect(() => {
    if (!isInitialized || !audioContextRef.current) return;

    const ctx = audioContextRef.current;
    const now = ctx.currentTime;
    const fadeTime = 1.2;
    const gains = {
      apex: apexGainRef.current,
      mid_ring: midRingGainRef.current,
      foundation: foundationGainRef.current,
    };

    Object.entries(gains).forEach(([id, gainNode]) => {
      if (!gainNode) return;
      const targetValue = id === selectedDistrict.id ? 1 : 0.001;
      gainNode.gain.setTargetAtTime(targetValue, now, fadeTime);
    });
  }, [selectedDistrict.id, isInitialized]);

  useEffect(() => {
    const activeNodes = activeNodesRef.current;
    const audioContext = audioContextRef.current;

    return () => {
      activeNodes.forEach((node) => {
        if ('stop' in node && typeof node.stop === 'function') {
          node.stop();
        }
      });
      void audioContext?.close();
    };
  }, []);

  const toggleMute = () => {
    if (!isInitialized) {
      initAudio(false);
      setIsMuted(false);
      window.setTimeout(() => playInternalUISound('click'), 50);
      return;
    }

    const ctx = audioContextRef.current;
    if (!ctx) return;

    if (isMuted) {
      void ctx.resume();
      ambienceGainRef.current?.gain.setTargetAtTime(0.38, ctx.currentTime, 0.4);
    } else {
      ambienceGainRef.current?.gain.setTargetAtTime(0.001, ctx.currentTime, 0.4);
    }
    playInternalUISound('click');
    setIsMuted((prev) => !prev);
  };

  return (
    <div className="audio-engine-control">
      <button
        className={`mute-button ${isMuted ? 'muted' : 'active'}`}
        onClick={toggleMute}
        title={isMuted ? 'Enable Atmospheric Audio' : 'Mute Audio'}
        type="button"
        aria-pressed={!isMuted}
      >
        <div className="icon-container">
          {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </div>
        <span className="audio-label">{isMuted ? 'AUDIO OFF' : 'AUDIO ON'}</span>
      </button>
    </div>
  );
};

export default AudioEngine;

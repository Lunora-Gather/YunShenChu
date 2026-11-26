import React, { useEffect, useMemo, useRef, useState } from 'react';
import './SignalInterceptor.css';
import { ArrowRight, Radio, Wifi, Loader2, X, Lock } from 'lucide-react';
import { useCity } from '../../context/CityContext';
import { getSignalById, SIGNAL_CATALOG } from '../../data/signals';
import { caseNames, fieldLeads } from '../../data/fieldSites';
import type { SignalIntel } from '../../data/signals';
import ConsoleDialog from '../ConsoleDialog/ConsoleDialog';

interface SignalInterceptorProps {
  opener: HTMLElement | null;
  targetId?: string;
  siteName?: string;
  onReturnToSite: () => void;
  onClose: () => void;
  onInvestigate: (id: string) => void;
}

const BAND_MIN = 80;
const BAND_MAX = 220;
const FINE_STEP = 0.1;
const LOCK_WINDOW = 0.5;

const clampFrequency = (value: number) => Math.min(BAND_MAX, Math.max(BAND_MIN, Math.round(value * 10) / 10));

const barHeight = (frequency: number, index: number, isLocked: boolean) => {
  const wave = Math.sin(frequency * 0.17 + index * 1.91);
  const normalized = (wave + 1) / 2;
  return isLocked ? 22 + normalized * 76 : 4 + normalized * 18;
};

const SignalInterceptor: React.FC<SignalInterceptorProps> = ({ opener, targetId, siteName, onReturnToSite, onClose, onInvestigate }) => {
  const [frequency, setFrequency] = useState(100.0);
  const [scanTarget, setScanTarget] = useState<SignalIntel | null>(null);
  const loggedSignalRef = useRef<string | null>(null);
  const scanFrameRef = useRef<number | null>(null);
  const scanTimeoutRef = useRef<number | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const { discoveredSignalIds, playUISound, registerSignalDiscovery } = useCity();
  const discoveredSignalSet = useMemo(() => new Set(discoveredSignalIds), [discoveredSignalIds]);
  const unlockedCount = discoveredSignalIds.length;

  const isScanning = scanTarget !== null;
  const nearestSignal = SIGNAL_CATALOG.reduce((nearest, signal) => (
    Math.abs(signal.freq - frequency) < Math.abs(nearest.freq - frequency) ? signal : nearest
  ), SIGNAL_CATALOG[0]);
  const fieldSignal = siteName && targetId ? getSignalById(targetId) : null;
  const matchesSource = !fieldSignal || nearestSignal.id === fieldSignal.id;
  const activeSignal = !isScanning && matchesSource && Math.abs(nearestSignal.freq - frequency) < LOCK_WINDOW ? nearestSignal : null;
  const requestedSignal = targetId && !discoveredSignalSet.has(targetId) ? getSignalById(targetId) : null;
  const nextSealedSignal = requestedSignal ?? SIGNAL_CATALOG.find((signal) => !discoveredSignalSet.has(signal.id));
  const nearestIndex = SIGNAL_CATALOG.indexOf(nearestSignal);
  const scanTargetSignal = fieldSignal ?? nextSealedSignal ?? SIGNAL_CATALOG[(nearestIndex + 1) % SIGNAL_CATALOG.length];
  const knownSignals = SIGNAL_CATALOG.filter(({ id }) => discoveredSignalSet.has(id));

  const guideSignal = fieldSignal ?? requestedSignal ?? activeSignal ?? nextSealedSignal ?? nearestSignal;
  const guideLocked = activeSignal?.id === guideSignal.id;
  const distance = Math.abs(guideSignal.freq - frequency);
  const lockStrength = isScanning ? 0 : guideLocked ? 100 : Math.min(99, Math.round(100 / (1 + (distance / 7) ** 1.3)));
  const carrier = requestedSignal ? '目标信号' : nextSealedSignal && !guideLocked ? '未记录信号' : '信号';
  const bandHint = isScanning ? '正在扫过频段' : guideLocked
    ? `已锁定${carrier}`
    : `${carrier}在${guideSignal.freq > frequency ? '高' : '低'}频一侧`;

  useEffect(() => {
    if (!activeSignal) {
      loggedSignalRef.current = null;
      return;
    }

    if (loggedSignalRef.current !== activeSignal.id) {
      loggedSignalRef.current = activeSignal.id;
      registerSignalDiscovery(activeSignal);
    }
  }, [activeSignal, registerSignalDiscovery]);

  useEffect(() => {
    if (!activeSignal || !resultRef.current) return;

    const scrollTimer = window.setTimeout(() => {
      resultRef.current?.scrollIntoView({ block: 'nearest' });
    }, 120);

    return () => window.clearTimeout(scrollTimer);
  }, [activeSignal]);

  useEffect(() => {
    return () => {
      if (scanFrameRef.current !== null) cancelAnimationFrame(scanFrameRef.current);
      if (scanTimeoutRef.current !== null) window.clearTimeout(scanTimeoutRef.current);
    };
  }, []);

  const tuneTo = (nextFrequency: number) => {
    setFrequency(clampFrequency(nextFrequency));
    playUISound('click');
  };

  const handleScan = () => {
    if (scanTimeoutRef.current !== null) return;

    playUISound('click');
    const target = scanTargetSignal.freq;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || target === frequency) {
      setFrequency(target);
      return;
    }

    setScanTarget(scanTargetSignal);
    const start = performance.now();
    const duration = Math.min(1350, 620 + Math.abs(target - frequency) * 7);
    const sweep = (now: number) => {
      const progress = Math.max(0, Math.min(1, (now - start) / duration));
      const easedProgress = 1 - (1 - progress) ** 3;
      setFrequency(frequency + (target - frequency) * easedProgress);
      if (progress < 1) scanFrameRef.current = requestAnimationFrame(sweep);
    };

    scanFrameRef.current = requestAnimationFrame(sweep);
    scanTimeoutRef.current = window.setTimeout(() => {
      if (scanFrameRef.current !== null) cancelAnimationFrame(scanFrameRef.current);
      scanFrameRef.current = null;
      scanTimeoutRef.current = null;
      setFrequency(target);
      setScanTarget(null);
    }, duration);
  };

  return (
    <ConsoleDialog className="interceptor-overlay" titleId="signal-interceptor-title" opener={opener} fallbackFocusId="field-scan" onClose={onClose}>
      <div className="interceptor-panel glass-panel glow-border">
        <div className="interceptor-header">
          <div className="interceptor-title" id="signal-interceptor-title">
            <Radio size={20} aria-hidden="true" />
            <div className="interceptor-title-copy">
              <h2>{siteName ?? '全城信号接收器'}</h2>
              <small>{siteName ? '现场收音' : `已锁定 ${unlockedCount}/${SIGNAL_CATALOG.length} 个信号`}</small>
            </div>
          </div>
          <button
            className="interceptor-close-btn"
            data-dialog-focus
            onClick={onClose}
            type="button"
            aria-label="关闭信号接收器"
          >
            <X size={20} />
          </button>
        </div>

        <div className="interceptor-display">
          <output className="frequency-readout" aria-live={isScanning ? 'off' : 'polite'} aria-atomic="true">
            <span className="frequency-value">{frequency.toFixed(1)}</span>{' '}
            <span className="frequency-unit">MHz</span>
          </output>
          <div className="lock-meter" role="meter" aria-label="信号强度" aria-valuemin={0} aria-valuemax={100} aria-valuenow={lockStrength}>
            <span style={{ width: `${lockStrength}%` }} />
          </div>
          <small id="receiver-band-hint" className="nearest-signal">{siteName && !isScanning ? (guideLocked ? '收到回讯' : guideSignal.freq > frequency ? '向高频调' : '向低频调') : bandHint} · {lockStrength}%</small>

          <div className="signal-visualizer" aria-hidden="true">
            {Array.from({ length: 20 }).map((_, index) => (
              <div
                key={index}
                className="signal-bar"
                style={{
                  height: `${barHeight(frequency, index, Boolean(activeSignal))}%`,
                  opacity: activeSignal ? 1 : 0.3,
                  backgroundColor: activeSignal ? 'var(--accent-blue)' : 'var(--text-secondary)',
                }}
              />
            ))}
          </div>
        </div>

        <div className="interceptor-controls">
          <div className="receiver-tuning" role="group" aria-label="接收器调频">
            <button className="tune-step" type="button" aria-label="调低 0.1 MHz"
              onClick={() => tuneTo(frequency - FINE_STEP)} disabled={isScanning || frequency <= BAND_MIN}>
              −0.1
            </button>
            <div className="slider-container">
              <input
                aria-label="调节接收频率"
                aria-describedby="receiver-band-hint"
                aria-valuetext={`${frequency.toFixed(1)} MHz`}
                type="range"
                min={BAND_MIN}
                max={BAND_MAX}
                step={FINE_STEP}
                value={frequency}
                onChange={(event) => setFrequency(event.currentTarget.valueAsNumber)}
                onKeyDown={(event) => {
                  if (event.key !== 'Home' && event.key !== 'End') return;
                  event.preventDefault();
                  tuneTo(event.key === 'Home' ? BAND_MIN : BAND_MAX);
                }}
                className="freq-slider"
                disabled={isScanning}
              />
              <div className="receiver-band-edges" aria-hidden="true"><span>{BAND_MIN}</span><span>{BAND_MAX} MHz</span></div>
            </div>
            <button className="tune-step" type="button" aria-label="调高 0.1 MHz"
              onClick={() => tuneTo(frequency + FINE_STEP)} disabled={isScanning || frequency >= BAND_MAX}>
              +0.1
            </button>
          </div>

          <button
            className={`scan-btn ${isScanning ? 'scanning' : ''}`}
            onClick={handleScan}
            aria-disabled={isScanning}
            type="button"
            aria-busy={isScanning}
          >
            {isScanning ? <Loader2 className="interceptor-spin" /> : <Wifi size={18} />}
            {siteName ? (isScanning ? '正在调谐…' : '对准这个频道') : isScanning ? '正在扫频…' : '自动扫频'}
          </button>
          <small className="scan-hint" role="status">
            {siteName ? (activeSignal ? '这段回讯已收入案卷。' : '可以沿着信号强弱手动调频。') : scanTarget
              ? '正在搜寻信号…'
              : nextSealedSignal
                ? `还有 ${SIGNAL_CATALOG.length - unlockedCount} 个信号待锁定 · 沿强度方向调频，或按自动扫频`
                : '所有信号都已记录'}
          </small>
        </div>

        <div className="interceptor-results" ref={resultRef} aria-live="polite">
          {activeSignal ? (
            <div className="result-content interceptor-fade-in">
              <div className="result-header">
                <span className="signal-origin">{activeSignal.origin}</span>
                <Lock size={14} className="lock-icon" />
              </div>
              <p className="signal-message">{fieldSignal ? fieldLeads[fieldSignal.id].transmission : activeSignal.message}</p>
              {!siteName && <div className="signal-intel-brief">
                <span>下一条线索</span>
                <strong>{activeSignal.lead}</strong>
                <small>{activeSignal.containment}</small>
              </div>}
              {siteName && <button className="signal-investigate site-resume" type="button" onClick={onReturnToSite}>
                回到{siteName}<ArrowRight size={16} aria-hidden="true" />
              </button>}
              {discoveredSignalSet.has(activeSignal.id) && (
                <button className="signal-investigate" type="button" onClick={() => onInvestigate(activeSignal.id)}>
                  翻开案卷 <ArrowRight size={16} aria-hidden="true" />
                </button>
              )}
            </div>
          ) : (
            <div className="no-signal">
              <p>{siteName ? '接收器里只有沙沙声。' : '调节频率，让这段声音清晰起来。'}</p>
            </div>
          )}
        </div>

        {!siteName && knownSignals.length > 0 && <div className="signal-presets" aria-label="已记录的频率">
          {knownSignals.map((signal) => (
            <button
              key={signal.id}
              type="button"
              className={[
                activeSignal?.id === signal.id ? 'active' : '',
                'discovered',
              ].filter(Boolean).join(' ')}
              onClick={() => tuneTo(signal.freq)}
              aria-pressed={activeSignal?.id === signal.id}
              disabled={isScanning}
            >
              <span>{signal.freq.toFixed(1)}</span>
              <strong>{caseNames[signal.id]}</strong>
            </button>
          ))}
        </div>}
      </div>
    </ConsoleDialog>
  );
};

export default SignalInterceptor;

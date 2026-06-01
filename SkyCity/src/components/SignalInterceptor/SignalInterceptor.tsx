import React, { useEffect, useMemo, useRef, useState } from 'react';
import './SignalInterceptor.css';
import { Radio, Wifi, Loader2, X, Lock } from 'lucide-react';
import { useCity } from '../../context/CityContext';
import { SIGNAL_CATALOG } from '../../data/signals';

interface SignalInterceptorProps {
  onClose: () => void;
}

const barHeight = (frequency: number, index: number, isLocked: boolean) => {
  const wave = Math.sin(frequency * 0.17 + index * 1.91);
  const normalized = (wave + 1) / 2;
  return isLocked ? 22 + normalized * 76 : 4 + normalized * 18;
};

const SignalInterceptor: React.FC<SignalInterceptorProps> = ({ onClose }) => {
  const [frequency, setFrequency] = useState(100.0);
  const [isScanning, setIsScanning] = useState(false);
  const loggedSignalRef = useRef<number | null>(null);
  const scanTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const { discoveredSignalIds, playUISound, registerSignalDiscovery } = useCity();
  const discoveredSignalSet = useMemo(() => new Set(discoveredSignalIds), [discoveredSignalIds]);

  const activeSignal = useMemo(() => {
    return SIGNAL_CATALOG.find((signal) => Math.abs(signal.freq - frequency) < 0.5) ?? null;
  }, [frequency]);

  const nearestSignal = useMemo(() => {
    return SIGNAL_CATALOG.reduce((nearest, signal) => (
      Math.abs(signal.freq - frequency) < Math.abs(nearest.freq - frequency) ? signal : nearest
    ), SIGNAL_CATALOG[0]);
  }, [frequency]);

  const lockStrength = activeSignal
    ? 100
    : Math.max(0, Math.round(100 - Math.abs(nearestSignal.freq - frequency) * 42));

  useEffect(() => {
    if (!activeSignal) {
      loggedSignalRef.current = null;
      return;
    }

    if (loggedSignalRef.current !== activeSignal.freq) {
      loggedSignalRef.current = activeSignal.freq;
      registerSignalDiscovery(activeSignal);
    }
  }, [activeSignal, registerSignalDiscovery]);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        playUISound('click');
        return;
      }

      if (event.key === 'ArrowRight' && !isScanning) {
        event.preventDefault();
        setFrequency((prev) => Math.min(220, Number((prev + 0.1).toFixed(1))));
      }

      if (event.key === 'ArrowLeft' && !isScanning) {
        event.preventDefault();
        setFrequency((prev) => Math.max(80, Number((prev - 0.1).toFixed(1))));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (scanTimerRef.current) {
        clearInterval(scanTimerRef.current);
      }
    };
  }, [isScanning, onClose, playUISound]);

  const tuneTo = (nextFrequency: number) => {
    setFrequency(nextFrequency);
    playUISound('click');
  };

  const handleScan = () => {
    if (scanTimerRef.current) {
      clearInterval(scanTimerRef.current);
    }

    setIsScanning(true);
    playUISound('click');
    const target = SIGNAL_CATALOG[Math.floor(Math.random() * SIGNAL_CATALOG.length)].freq;

    scanTimerRef.current = setInterval(() => {
      setFrequency((prev) => {
        const diff = target - prev;
        if (Math.abs(diff) < 0.1) {
          if (scanTimerRef.current) {
            clearInterval(scanTimerRef.current);
            scanTimerRef.current = null;
          }
          setIsScanning(false);
          return target;
        }
        return prev + diff * 0.1;
      });
    }, 50);
  };

  return (
    <div className="interceptor-overlay" role="dialog" aria-modal="true" aria-labelledby="signal-interceptor-title">
      <div className="interceptor-panel glass-panel glow-border">
        <div className="interceptor-header">
          <div className="interceptor-title" id="signal-interceptor-title">
            <Radio size={20} className="pulse-icon" />
            <span>SIGNAL INTERCEPTOR v2.0</span>
          </div>
          <button
            className="interceptor-close-btn"
            ref={closeButtonRef}
            onClick={() => {
              onClose();
              playUISound('click');
            }}
            type="button"
            aria-label="Close signal interceptor"
          >
            <X size={20} />
          </button>
        </div>

        <div className="interceptor-display">
          <div className="frequency-readout">
            <span className="frequency-value">{frequency.toFixed(1)}</span>
            <span className="frequency-unit">MHz</span>
          </div>
          <div className="lock-meter" aria-label={`Signal lock strength ${lockStrength}%`}>
            <span style={{ width: `${lockStrength}%` }} />
          </div>
          <small className="nearest-signal">nearest: {nearestSignal.origin} / {nearestSignal.freq.toFixed(1)} MHz</small>

          <div className="signal-visualizer">
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
          <div className="slider-container">
            <input
              aria-label="Tune frequency"
              type="range"
              min="80"
              max="220"
              step="0.1"
              value={frequency}
              onChange={(event) => {
                setFrequency(parseFloat(event.target.value));
              }}
              className="freq-slider"
              disabled={isScanning}
            />
          </div>

          <button
            className={`scan-btn ${isScanning ? 'scanning' : ''}`}
            onClick={handleScan}
            disabled={isScanning}
            type="button"
            aria-busy={isScanning}
          >
            {isScanning ? <Loader2 className="interceptor-spin" /> : <Wifi size={18} />}
            {isScanning ? 'SCANNING...' : 'AUTO-SCAN'}
          </button>
        </div>

        <div className="signal-presets" aria-label="Known frequency presets">
          {SIGNAL_CATALOG.map((signal) => (
            <button
              key={signal.id}
              type="button"
              className={activeSignal?.id === signal.id ? 'active' : ''}
              onClick={() => tuneTo(signal.freq)}
              aria-pressed={activeSignal?.id === signal.id}
            >
              <span>{signal.freq.toFixed(1)}</span>
              <strong>{discoveredSignalSet.has(signal.id) || activeSignal?.id === signal.id ? signal.title : signal.origin}</strong>
            </button>
          ))}
        </div>

        <div className="interceptor-results" aria-live="polite">
          {activeSignal ? (
            <div className="result-content interceptor-fade-in">
              <div className="result-header">
                <span className="signal-origin">{activeSignal.origin}</span>
                <Lock size={14} className="lock-icon" />
              </div>
              <p className="signal-message">{activeSignal.message}</p>
            </div>
          ) : (
            <div className="no-signal">
              <p>SEARCHING FOR FREQUENCIES...</p>
              <div className="static-noise" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SignalInterceptor;

import React, { useEffect, useMemo, useRef, useState } from 'react';
import './SignalInterceptor.css';
import { Radio, Wifi, Loader2, X, Lock } from 'lucide-react';
import { useCity } from '../../context/CityContext';

const SIGNALS = [
  { freq: 104.2, message: "CRITICAL: The 14th satellite island 'Guixu' is detected in stealth mode.", origin: 'Deep Scans' },
  { freq: 88.7, message: 'Do not look beneath the clouds, for the wind whales are breathing.', origin: 'Under-Cloud Echo' },
  { freq: 156.4, message: 'Ghost Rail unnumbered black train moving towards Lingxiao Apex.', origin: 'Track Sensors' },
  { freq: 210.9, message: 'Warning: When you observe YunShenChu, it observes you.', origin: 'Unknown Observer' },
];

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
  const { addDiaryEntry, playUISound } = useCity();

  const activeSignal = useMemo(() => {
    return SIGNALS.find((signal) => Math.abs(signal.freq - frequency) < 0.5) ?? null;
  }, [frequency]);

  useEffect(() => {
    if (!activeSignal) {
      loggedSignalRef.current = null;
      return;
    }

    if (loggedSignalRef.current !== activeSignal.freq) {
      loggedSignalRef.current = activeSignal.freq;
      playUISound('beep');
      addDiaryEntry(`Intercepted signal at ${activeSignal.freq}MHz: ${activeSignal.origin}`, 'secret');
    }
  }, [activeSignal, addDiaryEntry, playUISound]);

  const handleScan = () => {
    setIsScanning(true);
    playUISound('click');
    const target = SIGNALS[Math.floor(Math.random() * SIGNALS.length)].freq;

    const interval = setInterval(() => {
      setFrequency((prev) => {
        const diff = target - prev;
        if (Math.abs(diff) < 0.1) {
          clearInterval(interval);
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

        <div className="interceptor-results">
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

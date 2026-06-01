import React, { useState, useEffect } from 'react';

const BOOT_LINES = [
  "INITIALIZING YUN SHEN CHU OS V1.3...",
  "LOADING CORE MODULES...",
  "CONNECTING TO CLOUD CORE [OK]",
  "SYNCING TEMPORAL COORDINATES...",
  "CALIBRATING ATMOSPHERIC SENSORS...",
  "VERIFYING ANTI-GRAVITY STABILIZERS [OK]",
  "ESTABLISHING SECURE OBSERVER LINK...",
  "BYPASSING ION STORM INTERFERENCE...",
  "MAPPING DISTRICT TOPOLOGY...",
  "STARTING VISUAL INTERFACE...",
  "WELCOME, OBSERVER."
];

interface BootSequenceProps {
  onComplete: () => void;
}

const BootSequence: React.FC<BootSequenceProps> = ({ onComplete }) => {
  const [lines, setLines] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < BOOT_LINES.length) {
      const timer = setTimeout(() => {
        setLines(prev => [...prev, BOOT_LINES[currentIndex]]);
        setCurrentIndex(prev => prev + 1);
      }, Math.random() * 90 + 45);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => {
        onComplete();
      }, 360);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, onComplete]);

  return (
    <div className="boot-sequence">
      <div className="boot-grid"></div>
      <div className="boot-content">
        {lines.map((line, i) => (
          <div key={i} className="boot-line">
            <span className="boot-prompt">{">"}</span> {line}
          </div>
        ))}
        {currentIndex < BOOT_LINES.length && (
          <div className="boot-cursor">_</div>
        )}
      </div>
      <div className="boot-overlay"></div>
    </div>
  );
};

export default BootSequence;

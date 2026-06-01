import React, { useEffect, useMemo, useState } from 'react';
import './DataStream.css';

const characters = '0123456789ABCDEFHIJKLMNOPQRSTUVWXYZあいうえお';

const seededRandom = (seed: number) => {
  const value = Math.sin(seed * 9301 + 49297) * 233280;
  return value - Math.floor(value);
};

const DataStream: React.FC = () => {
  const [columns, setColumns] = useState<number>(0);

  useEffect(() => {
    const calculateColumns = () => {
      setColumns(Math.floor(window.innerWidth / 20));
    };

    calculateColumns();
    window.addEventListener('resize', calculateColumns);
    return () => window.removeEventListener('resize', calculateColumns);
  }, []);

  const delays = useMemo(() => {
    return Array.from({ length: columns }).map((_, index) => seededRandom(index + 1) * 5);
  }, [columns]);

  return (
    <div className="data-stream-container">
      {delays.map((delay, index) => (
        <DataColumn key={index} delay={delay} seed={index + 1} />
      ))}
    </div>
  );
};

const DataColumn: React.FC<{ delay: number; seed: number }> = ({ delay, seed }) => {
  const [content, setContent] = useState('');

  useEffect(() => {
    let tick = 0;
    const interval = setInterval(() => {
      setContent((prev) => {
        tick += 1;
        const charIndex = Math.floor(seededRandom(seed * 1000 + tick) * characters.length);
        return (characters[charIndex] + prev).substring(0, 20);
      });
    }, 100 + seededRandom(seed + 500) * 200);
    return () => clearInterval(interval);
  }, [seed]);

  return (
    <div
      className="data-column"
      style={{ animationDelay: `${delay}s` }}
    >
      {content.split('').map((char, index) => (
        <span key={`${char}-${index}`} style={{ opacity: 1 - index * 0.05 }}>{char}</span>
      ))}
    </div>
  );
};

export default DataStream;

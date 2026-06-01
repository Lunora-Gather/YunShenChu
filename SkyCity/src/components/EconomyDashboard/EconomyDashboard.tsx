import React, { useEffect, useState } from 'react';
import { useCity } from '../../context/CityContext';
import { TrendingUp, TrendingDown, DollarSign, BarChart2 } from 'lucide-react';
import './EconomyDashboard.css';

const createInitialHistory = (tradeVolume: number) => {
  return Array.from({ length: 20 }, (_, index) => {
    const wave = 0.85 + (Math.sin(index * 1.7) + 1) * 0.15;
    return tradeVolume * wave;
  });
};

const EconomyDashboard: React.FC = () => {
  const { world } = useCity();
  const economy = world.economy || {
    currency: 'Aether-Credits',
    market_trend: 'Stable',
    trade_volume: 1250000,
  };

  const [history, setHistory] = useState<number[]>(() => createInitialHistory(economy.trade_volume));

  useEffect(() => {
    const interval = setInterval(() => {
      setHistory((prev) => {
        const volatility = (Math.random() - 0.4) * 50000;
        const newValue = Math.max(500000, economy.trade_volume + volatility);
        const newHistory = [...prev, newValue];
        if (newHistory.length > 20) return newHistory.slice(newHistory.length - 20);
        return newHistory;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [economy.trade_volume]);

  const maxVolume = Math.max(...history, 1500000);
  const minVolume = Math.min(...history, 500000);

  const getTrendColorClass = (trend: string) => {
    if (trend === 'Bullish') return 'trend-bullish';
    if (trend === 'Bearish') return 'trend-bearish';
    return 'trend-stable';
  };

  return (
    <div className="economy-sidebar-section economy-dashboard">
      <h2><BarChart2 size={14} /> Economy Terminal</h2>

      <div className="economy-metrics">
        <div className="metric-row">
          <span className="metric-label"><DollarSign size={12} /> CURRENCY</span>
          <span className="metric-value currency-text">{economy.currency}</span>
        </div>

        <div className="metric-row">
          <span className="metric-label"><BarChart2 size={12} /> VOLUME</span>
          <span className="metric-value economy-mono">{economy.trade_volume.toLocaleString()}</span>
        </div>

        <div className="metric-row">
          <span className="metric-label">TREND</span>
          <span className={`metric-value trend-text ${getTrendColorClass(economy.market_trend)}`}>
            {economy.market_trend === 'Bullish' && <TrendingUp size={12} />}
            {economy.market_trend === 'Bearish' && <TrendingDown size={12} />}
            {economy.market_trend === 'Stable' && <TrendingUp size={12} style={{ transform: 'rotate(45deg)' }} />}
            <span style={{ marginLeft: '4px' }}>{economy.market_trend.toUpperCase()}</span>
          </span>
        </div>
      </div>

      <div className="market-chart">
        <div className="chart-grid">
          <div className="grid-line horizontal" />
          <div className="grid-line horizontal" />
          <div className="grid-line horizontal" />
        </div>
        <div className="chart-bars">
          {history.map((value, index) => {
            const heightPercent = ((value - minVolume * 0.9) / (maxVolume - minVolume * 0.9)) * 100;
            const barHeight = Math.max(5, Math.min(100, heightPercent));
            const isUp = index === 0 || value >= history[index - 1];
            return (
              <div
                key={`${Math.round(value)}-${index}`}
                className={`chart-bar ${isUp ? 'chart-bar-up' : 'chart-bar-down'}`}
                style={{ height: `${barHeight}%` }}
                title={value.toLocaleString()}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default EconomyDashboard;

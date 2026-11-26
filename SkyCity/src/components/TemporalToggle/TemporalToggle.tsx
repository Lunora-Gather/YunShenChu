import React from 'react';
import { History, ZapOff } from 'lucide-react';
import { useCity } from '../../context/CityContext';

const TemporalToggle: React.FC = () => {
  const { isPastMode, toggleTemporalView } = useCity();

  return (
    <button 
      className={`control-btn ${isPastMode ? 'temporal-active-btn' : 'glow-on-hover'}`}
      onClick={toggleTemporalView}
      title={isPastMode ? '返回实时城区' : '查看初代城区'}
      type="button"
      aria-pressed={isPastMode}
    >
      {isPastMode ? <ZapOff size={16} /> : <History size={16} />}
      {isPastMode ? '实时' : '初代'}
    </button>
  );
};

export default TemporalToggle;

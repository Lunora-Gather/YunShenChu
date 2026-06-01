import React from 'react';
import { History, ZapOff } from 'lucide-react';
import { useCity } from '../../context/CityContext';

const TemporalToggle: React.FC = () => {
  const { isPastMode, toggleTemporalView } = useCity();

  return (
    <button 
      className={`control-btn ${isPastMode ? 'temporal-active-btn' : 'glow-on-hover'}`}
      onClick={toggleTemporalView}
      title="Temporal View: Year 01"
      type="button"
      aria-pressed={isPastMode}
    >
      {isPastMode ? <ZapOff size={16} /> : <History size={16} />}
      {isPastMode ? "LIVE" : "YEAR 01"}
    </button>
  );
};

export default TemporalToggle;

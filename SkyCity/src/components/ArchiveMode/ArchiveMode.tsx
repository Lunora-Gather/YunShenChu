import React from 'react';
import { History } from 'lucide-react';

interface ArchiveModeProps {
  isActive: boolean;
  onToggle: () => void;
}

const ArchiveMode: React.FC<ArchiveModeProps> = ({ isActive, onToggle }) => {
  return (
    <button 
      className={`control-btn ${isActive ? 'active-archive' : ''}`}
      onClick={onToggle}
      title="Historical Archive Mode"
      type="button"
      aria-pressed={isActive}
    >
      <History size={16} />
      {isActive ? "ARCHIVE ACTIVE" : "HISTORICAL ARCHIVE"}
    </button>
  );
};

export default ArchiveMode;

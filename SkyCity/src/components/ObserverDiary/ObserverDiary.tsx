import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useCity } from '../../context/CityContext';
import { Book, ChevronDown, ChevronUp, Clock, MapPin, Search, Shield, Terminal } from 'lucide-react';
import './ObserverDiary.css';

const ObserverDiary: React.FC = () => {
  const { diary, latestSignal, observerMemory, signalTelemetry } = useCity();
  const [isOpen, setIsOpen] = useState(false);
  const entriesStartRef = useRef<HTMLDivElement>(null);
  const entryTypeCounts = useMemo(() => {
    return diary.reduce<Record<string, number>>((counts, entry) => {
      counts[entry.type] = (counts[entry.type] ?? 0) + 1;
      return counts;
    }, {});
  }, [diary]);

  useEffect(() => {
    if (isOpen && entriesStartRef.current) {
      entriesStartRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [diary, isOpen]);

  return (
    <div className={`observer-diary-drawer ${isOpen ? 'open' : ''}`}>
      <button
        className="diary-toggle"
        onClick={() => setIsOpen(!isOpen)}
        type="button"
        aria-expanded={isOpen}
        aria-label={isOpen ? 'Close observer diary' : 'Open observer diary'}
      >
        <Book size={16} />
        <span className="toggle-text">OBSERVER DIARY</span>
        <div className="entry-count-badge">{diary.length}</div>
        {isOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
      </button>
      
      <div className="diary-content">
        <div className="diary-header">
          <div className="header-main">
            <Terminal size={18} className="diary-header-icon" />
            <h3>CHRONOLOGICAL OBSERVATION LOG</h3>
          </div>
          <div className="diary-meta">
            <span className="meta-item"><Shield size={10} /> ENCRYPTION: AES-256-SKY</span>
            <span className="meta-item">OPERATOR: OBSERVER_01</span>
          </div>
        </div>

        <div className="diary-summary" aria-label="Observer memory summary">
          <div>
            <span>memory</span>
            <strong>{observerMemory.canPersist ? 'persistent' : 'volatile'}</strong>
          </div>
          <div>
            <span>signals</span>
            <strong>{observerMemory.discoveredCount}/{observerMemory.discoveredCount + signalTelemetry.unresolvedCount}</strong>
          </div>
          <div>
            <span>latest</span>
            <strong>{latestSignal?.title ?? 'No lock'}</strong>
          </div>
          <div>
            <span>secret</span>
            <strong>{entryTypeCounts.secret ?? 0}</strong>
          </div>
        </div>
        
        <div className="diary-entries">
          <div ref={entriesStartRef} />
          {diary.length === 0 ? (
            <div className="empty-diary">
              <div className="empty-icon"><Search size={48} /></div>
              <p>No observations preserved in observer memory.</p>
              <small>Local continuity is armed for the next signal lock...</small>
            </div>
          ) : (
            diary.map((entry) => (
              <div key={entry.id} className={`diary-entry type-${entry.type}`}>
                <div className="entry-header">
                  <span className="entry-timestamp">
                    <Clock size={10} /> {entry.timestamp.toLocaleTimeString([], { hour12: false })}
                  </span>
                  <span className="entry-type-tag">{entry.type.toUpperCase()}</span>
                  {entry.location && (
                    <span className="entry-location">
                      <MapPin size={10} /> {entry.location}
                    </span>
                  )}
                </div>
                <div className="entry-body">
                  <p>{entry.message}</p>
                </div>
                <div className="entry-footer">
                  <span className="ref-id">REF_ID: {entry.id.toUpperCase()}</span>
                  <span className="security-clearance">CLEARANCE: LEVEL 4</span>
                </div>
              </div>
            ))
          )}
        </div>
        
        <div className="diary-status-bar">
          <div className="status-indicator-group">
            <div className="status-dot diary-pulse"></div>
            <span>{observerMemory.canPersist ? 'LOCAL MEMORY SYNC ACTIVE' : 'LOCAL MEMORY VOLATILE'}</span>
          </div>
          <div className="timestamp-footer">{observerMemory.diaryCount}/{observerMemory.diaryLimit} ENTRIES</div>
        </div>
      </div>
    </div>
  );
};

export default ObserverDiary;

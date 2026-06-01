import React, { useState, useEffect, useRef } from 'react';
import { useCity } from '../../context/CityContext';
import { Book, ChevronDown, ChevronUp, Clock, MapPin, Search, Shield, Terminal } from 'lucide-react';
import './ObserverDiary.css';

const ObserverDiary: React.FC = () => {
  const { diary } = useCity();
  const [isOpen, setIsOpen] = useState(false);
  const entriesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && entriesEndRef.current) {
      entriesEndRef.current.scrollIntoView({ behavior: 'smooth' });
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
        
        <div className="diary-entries">
          {diary.length === 0 ? (
            <div className="empty-diary">
              <div className="empty-icon"><Search size={48} /></div>
              <p>No observations recorded in current session.</p>
              <small>System ready for data acquisition...</small>
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
          <div ref={entriesEndRef} />
        </div>
        
        <div className="diary-status-bar">
          <div className="status-indicator-group">
            <div className="status-dot diary-pulse"></div>
            <span>LIVE SYNC ACTIVE</span>
          </div>
          <div className="timestamp-footer">{new Date().toDateString()}</div>
        </div>
      </div>
    </div>
  );
};

export default ObserverDiary;

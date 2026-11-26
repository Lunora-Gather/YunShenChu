import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useCity } from '../../context/CityContext';
import type { DiaryEntry } from '../../context/observerStorage';
import { Book, ChevronDown, ChevronUp, Clock, MapPin, Search, Shield, Terminal } from 'lucide-react';
import './ObserverDiary.css';

type DiaryFilter = 'all' | DiaryEntry['type'];

const diaryFilterOptions: Array<{ id: DiaryFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'secret', label: 'Secret' },
  { id: 'system', label: 'System' },
  { id: 'visit', label: 'Visit' },
  { id: 'discovery', label: 'Discovery' },
];

interface ObserverDiaryProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const ObserverDiary: React.FC<ObserverDiaryProps> = ({ isOpen, onOpenChange }) => {
  const {
    completeInvestigationAction,
    diary,
    diaryReviewRequest,
    districts,
    investigationState,
    latestSignal,
    observerMemory,
  } = useCity();
  const [activeFilter, setActiveFilter] = useState<DiaryFilter>('all');
  const [location, setLocation] = useState('');
  const entriesRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const lastDiaryReviewRequestRef = useRef<number | null>(null);
  const districtNames = useMemo(() => new Map(districts.map(({ id, name }) => [id, name])), [districts]);
  const diaryEntries = useMemo(() => diary.map((entry) => ({
    ...entry,
    location: entry.location ? districtNames.get(entry.location) ?? entry.location : undefined,
  })), [diary, districtNames]);
  const locations = useMemo(() => Array.from(new Set(diaryEntries.flatMap((entry) => entry.location ? [entry.location] : []))).sort(), [diaryEntries]);
  const selectedLocation = locations.includes(location) ? location : '';
  const entryTypeCounts = useMemo(() => {
    return diary.reduce<Record<string, number>>((counts, entry) => {
      counts[entry.type] = (counts[entry.type] ?? 0) + 1;
      return counts;
    }, {});
  }, [diary]);
  const filteredDiary = useMemo(() => {
    return diaryEntries.filter((entry) => (activeFilter === 'all' || entry.type === activeFilter)
      && (!selectedLocation || entry.location === selectedLocation));
  }, [activeFilter, diaryEntries, selectedLocation]);

  useEffect(() => {
    if (entriesRef.current) entriesRef.current.scrollTop = 0;
  }, [activeFilter, isOpen, selectedLocation]);

  useEffect(() => {
    if (isOpen) toggleRef.current?.focus({ preventScroll: true });
  }, [isOpen]);

  useEffect(() => {
    if (!diaryReviewRequest || lastDiaryReviewRequestRef.current === diaryReviewRequest.id) return;

    lastDiaryReviewRequestRef.current = diaryReviewRequest.id;
    onOpenChange(true);
    setActiveFilter('secret');
    setLocation('');
    completeInvestigationAction(diaryReviewRequest.signalId, diaryReviewRequest.actionId);
  }, [completeInvestigationAction, diaryReviewRequest, onOpenChange]);

  const toggleDiary = () => {
    onOpenChange(!isOpen);
    if (isOpen || !latestSignal) return;

    const thread = investigationState.threads[latestSignal.id];
    const diaryAction = latestSignal.investigation.actions.find((action) => action.type === 'diary');

    if (thread && diaryAction && !thread.completedActionIds.includes(diaryAction.id)) {
      completeInvestigationAction(latestSignal.id, diaryAction.id);
    }
  };

  return (
    <div className={`observer-diary-drawer ${isOpen ? 'open' : ''}`} onKeyDown={(event) => {
      if (event.key !== 'Escape' || !isOpen || event.nativeEvent.isComposing) return;
      event.preventDefault();
      onOpenChange(false);
      toggleRef.current?.focus({ preventScroll: true });
    }}>
      <button
        ref={toggleRef}
        className="diary-toggle"
        onClick={toggleDiary}
        type="button"
        aria-expanded={isOpen}
        aria-controls="observer-diary-content"
        aria-label={isOpen ? 'Close observer diary' : 'Open observer diary'}
      >
        <Book size={16} />
        <span className="toggle-text">{isOpen ? 'OBSERVER DIARY' : '日记'}</span>
        <div className="entry-count-badge">{diary.length}</div>
        {isOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
      </button>
      
      <div className="diary-content" id="observer-diary-content" inert={!isOpen}>
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
            <span>latest</span>
            <strong>{latestSignal?.title ?? 'No lock'}</strong>
          </div>
          <div>
            <span>stage</span>
            <strong>{investigationState.latestThread?.stage ?? 'sealed'}</strong>
          </div>
        </div>

        <div className="diary-filter-bar" aria-label="Diary entry filters">
          {diaryFilterOptions.map((option) => {
            const count = option.id === 'all' ? diary.length : entryTypeCounts[option.id] ?? 0;
            return (
              <button
                key={option.id}
                type="button"
                className={activeFilter === option.id ? 'active' : ''}
                onClick={() => setActiveFilter(option.id)}
                aria-pressed={activeFilter === option.id}
              >
                <span>{option.label}</span>
                <strong>{count}</strong>
              </button>
            );
          })}
        </div>
        
        {locations.length > 0 && (
          <label className="diary-location-filter">
            Location
            <select value={selectedLocation} onChange={(event) => setLocation(event.target.value)}>
              <option value="">All locations</option>
              {locations.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
        )}
        <div className="diary-entries" ref={entriesRef}>
          {filteredDiary.length === 0 ? (
            <div className="empty-diary">
              <div className="empty-icon"><Search size={48} /></div>
              <p>{diary.length === 0 ? 'No observations preserved in observer memory.' : 'No observations match these filters.'}</p>
              <small>{diary.length === 0 ? 'Local continuity is armed for the next signal lock...' : 'Switch filters to review other retained entries.'}</small>
            </div>
          ) : (
            filteredDiary.map((entry) => (
              <div key={entry.id} className={`diary-entry type-${entry.type}`}>
                <div className="entry-header">
                  <span className="entry-timestamp">
                    <Clock size={10} />
                    <time dateTime={entry.timestamp.toISOString()}>{entry.timestamp.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</time>
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
              </div>
            ))
          )}
        </div>
        
        <div className="diary-status-bar">
          <div className="status-indicator-group">
            <div className="status-dot diary-pulse"></div>
            <span>{observerMemory.canPersist ? 'LOCAL MEMORY SYNC ACTIVE' : 'LOCAL MEMORY VOLATILE'}</span>
          </div>
          <div className="timestamp-footer">{filteredDiary.length}/{observerMemory.diaryCount} SHOWN</div>
        </div>
      </div>
    </div>
  );
};

export default ObserverDiary;

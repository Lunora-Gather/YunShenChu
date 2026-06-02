import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useCity } from '../../context/CityContext';
import type { DiaryEntry } from '../../context/CityContext';
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

const ObserverDiary: React.FC = () => {
  const {
    completeInvestigationAction,
    diary,
    diaryReviewRequest,
    investigationState,
    latestSignal,
    observerMemory,
    signalTelemetry,
  } = useCity();
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<DiaryFilter>('all');
  const entriesStartRef = useRef<HTMLDivElement>(null);
  const lastDiaryReviewRequestRef = useRef<number | null>(null);
  const entryTypeCounts = useMemo(() => {
    return diary.reduce<Record<string, number>>((counts, entry) => {
      counts[entry.type] = (counts[entry.type] ?? 0) + 1;
      return counts;
    }, {});
  }, [diary]);
  const filteredDiary = useMemo(() => {
    if (activeFilter === 'all') return diary;
    return diary.filter((entry) => entry.type === activeFilter);
  }, [activeFilter, diary]);

  useEffect(() => {
    if (isOpen && entriesStartRef.current) {
      entriesStartRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [diary, isOpen]);

  useEffect(() => {
    if (!diaryReviewRequest || lastDiaryReviewRequestRef.current === diaryReviewRequest.id) return;

    lastDiaryReviewRequestRef.current = diaryReviewRequest.id;
    setIsOpen(true);
    completeInvestigationAction(diaryReviewRequest.signalId, diaryReviewRequest.actionId);
  }, [completeInvestigationAction, diaryReviewRequest]);

  useEffect(() => {
    if (!isOpen || !latestSignal) return;

    const thread = investigationState.threads[latestSignal.id];
    const diaryAction = latestSignal.investigation.actions.find((action) => action.type === 'diary');

    if (thread && diaryAction && !thread.completedActionIds.includes(diaryAction.id)) {
      completeInvestigationAction(latestSignal.id, diaryAction.id);
    }
  }, [completeInvestigationAction, investigationState.threads, isOpen, latestSignal]);

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
            <span>stage</span>
            <strong>{investigationState.latestThread?.stage ?? 'sealed'}</strong>
          </div>
          <div>
            <span>secret</span>
            <strong>{entryTypeCounts.secret ?? 0}</strong>
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
        
        <div className="diary-entries">
          <div ref={entriesStartRef} />
          {filteredDiary.length === 0 ? (
            <div className="empty-diary">
              <div className="empty-icon"><Search size={48} /></div>
              <p>{diary.length === 0 ? 'No observations preserved in observer memory.' : `No ${activeFilter} observations in current memory.`}</p>
              <small>{diary.length === 0 ? 'Local continuity is armed for the next signal lock...' : 'Switch filters to review other retained entries.'}</small>
            </div>
          ) : (
            filteredDiary.map((entry) => (
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
          <div className="timestamp-footer">{filteredDiary.length}/{observerMemory.diaryCount} SHOWN</div>
        </div>
      </div>
    </div>
  );
};

export default ObserverDiary;

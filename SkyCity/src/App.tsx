import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  AudioLines,
  BookOpen,
  Camera,
  CheckCircle,
  Cloud,
  Compass,
  Database,
  Eye,
  Gauge,
  History,
  Landmark,
  MapPin,
  MessageSquare,
  Radio,
  Route,
  Shield,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';
import './App.css';
import { useCity } from './context/CityContext';
import { SIGNAL_CATALOG } from './data/signals';
import AudioEngine from './components/AudioEngine/AudioEngine';
import BootSequence from './components/BootSequence/BootSequence';
import Chronicle from './components/Chronicle/Chronicle';
import CitizenFeed from './components/CitizenFeed/CitizenFeed';
import DataStream from './components/DataStream/DataStream';
import DeepTerminal from './components/DeepTerminal/DeepTerminal';
import EconomyDashboard from './components/EconomyDashboard/EconomyDashboard';
import GlitchOverlay from './components/GlitchOverlay/GlitchOverlay';
import Map3D from './components/Map3D/Map3D';
import ObserverDiary from './components/ObserverDiary/ObserverDiary';
import Particles from './components/Particles/Particles';
import SecurityCamera from './components/SecurityCamera/SecurityCamera';
import SignalInterceptor from './components/SignalInterceptor/SignalInterceptor';
import Starfield from './components/Starfield/Starfield';
import SystemAlerts from './components/SystemAlerts/SystemAlerts';
import TemporalToggle from './components/TemporalToggle/TemporalToggle';
import TrafficVisualization from './components/TrafficVisualization/TrafficVisualization';
import WeatherOverlay from './components/WeatherOverlay/WeatherOverlay';

type InspectorPanel = 'district' | 'systems' | 'archive' | 'citizens';
type ArchiveFilter = 'all' | 'unlocked' | 'sealed';

const panelOptions: Array<{ id: InspectorPanel; label: string; icon: typeof Eye }> = [
  { id: 'district', label: 'District', icon: Eye },
  { id: 'systems', label: 'Systems', icon: Gauge },
  { id: 'archive', label: 'Archive', icon: BookOpen },
  { id: 'citizens', label: 'Pulse', icon: MessageSquare },
];

const archiveFilterOptions: Array<{ id: ArchiveFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'unlocked', label: 'Unlocked' },
  { id: 'sealed', label: 'Sealed' },
];

const formatPopulation = (value: number) => value.toLocaleString('en-US');

const getStatusClass = (status: string) => {
  const normalized = status.toLowerCase();
  if (normalized.includes('critical') || normalized.includes('hazard') || normalized.includes('testing')) {
    return 'status-critical';
  }
  return 'status-active';
};

const getDistrictInsight = (id: string) => {
  if (id === 'apex') return 'Transparent civic skin, sealed archive arteries, and command traffic rising above the cloudline.';
  if (id === 'mid_ring') return 'Warm commerce strata, dense pedestrian bridges, and the loudest civilian signal layer.';
  if (id === 'foundation') return 'Exposed engines, condensation towers, and the first place every anomaly becomes physical.';
  return 'Foundation archive: fragile scaffolds, manual routes, and a city still learning how to stay airborne.';
};

function App() {
  const [bootComplete, setBootComplete] = useState(false);
  const [isInterceptorOpen, setIsInterceptorOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<InspectorPanel>('district');
  const [archiveFilter, setArchiveFilter] = useState<ArchiveFilter>('all');
  const {
    activeDirective,
    addDiaryEntry,
    currentDistricts,
    currentTime,
    discoveredSignalIds,
    entities,
    focusSignal,
    completeInvestigationAction,
    investigationState,
    isDay,
    isPastMode,
    latestSignal,
    observerMemory,
    playUISound,
    requestDiaryReview,
    requestTerminalAction,
    selectedDistrict,
    setDistrict,
    signalIntel,
    signalTelemetry,
    weather,
    world,
  } = useCity();

  const altitudeRange = selectedDistrict.altitude_range.join(' - ');
  const clockLabel = currentTime.toLocaleTimeString([], { hour12: false });
  const anomalyState = useMemo(() => {
    const weatherRisk = weather.current_condition.toLowerCase().includes('storm') || weather.current_condition.toLowerCase().includes('ion');
    if (signalTelemetry.level === 'breach') return 'BREACH';
    if (world.global_stats.energy_index < 85 || weatherRisk || signalTelemetry.level === 'unstable') return 'ELEVATED';
    return isPastMode ? 'ARCHIVE' : 'STABLE';
  }, [isPastMode, signalTelemetry.level, weather.current_condition, world.global_stats.energy_index]);

  const socialMetrics = useMemo(() => {
    return Object.entries(selectedDistrict.social_metrics).map(([key, value]) => ({
      key,
      label: key.toUpperCase(),
      value,
    }));
  }, [selectedDistrict.social_metrics]);

  const discoveredSignalSet = useMemo(() => new Set(discoveredSignalIds), [discoveredSignalIds]);
  const discoveryProgress = Math.round((discoveredSignalIds.length / SIGNAL_CATALOG.length) * 100);
  const localSignalCount = signalTelemetry.districtSignalCounts[selectedDistrict.id] ?? 0;
  const filteredArchiveSignals = useMemo(() => {
    return SIGNAL_CATALOG.filter((signal) => {
      const isUnlocked = discoveredSignalSet.has(signal.id);
      if (archiveFilter === 'unlocked') return isUnlocked;
      if (archiveFilter === 'sealed') return !isUnlocked;
      return true;
    });
  }, [archiveFilter, discoveredSignalSet]);
  const latestInvestigationThread = investigationState.latestThread;
  const nextInvestigationAction = investigationState.nextAction;

  const openInterceptor = () => {
    setIsInterceptorOpen(true);
    playUISound('click');
    addDiaryEntry('Observer opened the encrypted signal interceptor.', 'system', selectedDistrict.name);
  };

  const openCamera = () => {
    setIsCameraOpen(true);
    playUISound('click');
    addDiaryEntry('Synthetic security camera feed requested.', 'visit', selectedDistrict.name);

    if (latestSignal) {
      const thread = investigationState.threads[latestSignal.id];
      const cameraAction = latestSignal.investigation.actions.find((action) => action.type === 'camera');
      if (thread && cameraAction && !thread.completedActionIds.includes(cameraAction.id)) {
        completeInvestigationAction(latestSignal.id, cameraAction.id);
      }
    }
  };

  const markDiscovery = (id: string, title: string) => {
    if (discoveredSignalSet.has(id)) {
      focusSignal(id);
      addDiaryEntry(`Anomaly thread focused: ${title}.`, 'secret', selectedDistrict.name);
      return;
    }

    addDiaryEntry(`Observer reviewed a locked anomaly stub: ${title}. Signal evidence still required.`, 'system', selectedDistrict.name);
    playUISound('beep');
    setIsInterceptorOpen(true);
  };

  const runInvestigationAction = (signalId: string, actionId: string) => {
    const signal = SIGNAL_CATALOG.find((item) => item.id === signalId);
    const action = signal?.investigation.actions.find((item) => item.id === actionId);
    if (!signal || !action) return;

    if (action.type === 'terminal') {
      requestTerminalAction(signal.id, action.id);
      return;
    }

    if (action.type === 'diary') {
      requestDiaryReview(signal.id, action.id);
      return;
    }

    focusSignal(signal.id);

    if (action.type === 'district' && action.districtId) {
      setDistrict(action.districtId);
    }

    if (action.type === 'camera') {
      setIsCameraOpen(true);
    }

    if (action.type === 'citizens') {
      setActivePanel('citizens');
    }

    if (action.type === 'archive') {
      setActivePanel(action.id === 'review-systems' ? 'systems' : 'archive');
    }

    completeInvestigationAction(signal.id, action.id);
  };

  useEffect(() => {
    if (!isCameraOpen && !isInterceptorOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setIsCameraOpen(false);
      setIsInterceptorOpen(false);
      playUISound('click');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCameraOpen, isInterceptorOpen, playUISound]);

  useEffect(() => {
    if (!latestSignal) return;

    const thread = investigationState.threads[latestSignal.id];
    if (!thread || thread.stage === 'sealed') return;

    const districtAction = latestSignal.investigation.actions.find((action) => (
      action.type === 'district' && action.districtId === selectedDistrict.id
    ));

    if (districtAction && !thread.completedActionIds.includes(districtAction.id)) {
      completeInvestigationAction(latestSignal.id, districtAction.id);
    }
  }, [completeInvestigationAction, investigationState.threads, latestSignal, selectedDistrict.id]);

  useEffect(() => {
    if (!latestSignal) return;

    const thread = investigationState.threads[latestSignal.id];
    if (!thread || thread.stage === 'sealed') return;

    const matchingAction = latestSignal.investigation.actions.find((action) => {
      if (activePanel === 'citizens') return action.type === 'citizens';
      if (activePanel === 'archive') return action.type === 'archive';
      if (activePanel === 'systems') return action.id === 'review-systems';
      return false;
    });

    if (matchingAction && !thread.completedActionIds.includes(matchingAction.id)) {
      completeInvestigationAction(latestSignal.id, matchingAction.id);
    }
  }, [activePanel, completeInvestigationAction, investigationState.threads, latestSignal]);

  if (!bootComplete) {
    return <BootSequence onComplete={() => setBootComplete(true)} />;
  }

  return (
    <div className={`app-shell observer-shell scanline ${isDay ? 'day-mode' : 'night-mode'} ${isPastMode ? 'temporal-active' : ''}`}>
      <Starfield />
      <DataStream />
      <Particles />
      <WeatherOverlay condition={weather.current_condition} />
      <GlitchOverlay />

      <main className="observer-console" aria-label="Yun Shen Chu observer console">
        <header className="observer-topbar">
          <div className="brand-lockup">
            <button
              className="round-signal"
              type="button"
              onClick={openInterceptor}
              title="Open Signal Interceptor"
              aria-label="Open global signal interceptor"
            >
              <Radio size={16} />
            </button>
            <div>
              <h1>{world.city_name}</h1>
              <p>OBSERVER PROTOCOL / v{world.version} / {isPastMode ? 'FOUNDATION ARCHIVE' : 'LIVE CITY'}</p>
            </div>
          </div>

          <div className="top-metrics">
            <div className="top-metric">
              <Zap size={13} />
              <span>Energy</span>
              <strong>{world.global_stats.energy_index.toFixed(1)}%</strong>
            </div>
            <div className="top-metric">
              <Users size={13} />
              <span>Population</span>
              <strong>{formatPopulation(world.global_stats.total_population)}</strong>
            </div>
            <div className="top-metric">
              <Compass size={13} />
              <span>Altitude</span>
              <strong>{world.global_stats.average_altitude}m</strong>
            </div>
            <div className="top-metric">
              <Activity size={13} />
              <span>Clock</span>
              <strong>{clockLabel}</strong>
            </div>
            <div className={`top-metric signal-pressure-tile level-${signalTelemetry.level}`}>
              <Radio size={13} />
              <span>Signal</span>
              <strong>{signalTelemetry.pressure}% {signalTelemetry.level}</strong>
            </div>
          </div>
        </header>

        <aside className="district-rail" aria-label="District navigation">
          <div className="rail-label"><MapPin size={13} /> Districts</div>
          {currentDistricts.map((district) => (
            <button
              key={district.id}
              className={`rail-district ${selectedDistrict.id === district.id ? 'active' : ''}`}
              type="button"
              onClick={() => setDistrict(district.id)}
              aria-pressed={selectedDistrict.id === district.id}
            >
              <span className="rail-dot" />
              <span>
                <strong>{district.name}</strong>
                <small>{district.altitude_range[0]}-{district.altitude_range[1]}m</small>
              </span>
            </button>
          ))}
        </aside>

        <section className="city-window" aria-label="Interactive cloud city viewport">
          <TrafficVisualization />
          <Map3D />

          <div className="window-toolbar">
            <TemporalToggle />
            <button className="control-btn glow-on-hover" type="button" onClick={openCamera}>
              <Camera size={16} />
              Camera
            </button>
            <button className="control-btn glow-on-hover" type="button" onClick={openInterceptor}>
              <AudioLines size={16} />
              Signals
            </button>
          </div>

          <div className="city-readout">
            <span className="id-tag">{selectedDistrict.id.toUpperCase()}</span>
            <h2>{selectedDistrict.name}</h2>
            <p>{getDistrictInsight(selectedDistrict.id)}</p>
            <div className="readout-meta">
              <span>X {selectedDistrict.coordinates.x}</span>
              <span>Y {selectedDistrict.coordinates.y}</span>
              <span>Z {selectedDistrict.coordinates.z}</span>
            </div>
          </div>

          {latestSignal && (
            <div className={`signal-echo echo-${latestSignal.mapFocus}`}>
              <span>{latestSignal.freq.toFixed(1)} MHz</span>
              <strong>{latestSignal.title}</strong>
            </div>
          )}

          <div className={`anomaly-badge state-${anomalyState.toLowerCase()}`}>
            <AlertTriangle size={15} />
            <span>{anomalyState}</span>
          </div>
        </section>

        <aside className="inspector-panel" aria-label="Context inspector">
          <div className="panel-tabs" role="tablist" aria-label="Inspector panels">
            {panelOptions.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.id}
                  id={`inspector-tab-${option.id}`}
                  type="button"
                  role="tab"
                  aria-selected={activePanel === option.id}
                  aria-controls={`inspector-panel-${option.id}`}
                  className={activePanel === option.id ? 'active' : ''}
                  onClick={() => setActivePanel(option.id)}
                >
                  <Icon size={14} />
                  {option.label}
                </button>
              );
            })}
          </div>

          {activePanel === 'district' && (
            <div className="panel-body" id="inspector-panel-district" role="tabpanel" aria-labelledby="inspector-tab-district">
              <div className="panel-heading">
                <span>Selected Layer</span>
                <strong>{selectedDistrict.visual_style}</strong>
              </div>
              <p className="panel-copy">{selectedDistrict.description}</p>

              <div className="operation-grid">
                <div>
                  <Landmark size={16} />
                  <span>Altitude Band</span>
                  <strong>{altitudeRange}m</strong>
                </div>
                <div>
                  <Users size={16} />
                  <span>District Load</span>
                  <strong>{formatPopulation(selectedDistrict.population)}</strong>
                </div>
                <div>
                  <Shield size={16} />
                  <span>Security</span>
                  <strong>{selectedDistrict.security_level ?? world.global_stats.status}</strong>
                </div>
                <div>
                  <Route size={16} />
                  <span>Network</span>
                  <strong>{currentDistricts.length} sectors</strong>
                </div>
                <div>
                  <Radio size={16} />
                  <span>Local Echoes</span>
                  <strong>{localSignalCount} locked</strong>
                </div>
              </div>

              <div className="social-grid">
                {socialMetrics.map((metric) => (
                  <div key={metric.key} className="metric-chip">
                    <span>{metric.label}</span>
                    <div className="metric-track">
                      <div className="metric-fill" style={{ width: `${metric.value}%` }} />
                    </div>
                    <strong>{metric.value}%</strong>
                  </div>
                ))}
              </div>

              <div className="landmark-list">
                <h3>Key Landmarks</h3>
                {selectedDistrict.landmarks.map((landmark) => (
                  <div key={`${landmark.name}-${landmark.type}`} className="landmark-row">
                    <span className={`status-indicator ${getStatusClass(landmark.status)}`} />
                    <div>
                      <strong>{landmark.name}</strong>
                      <small>{landmark.type} / {landmark.status}</small>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activePanel === 'systems' && (
            <div className="panel-body compact-panel" id="inspector-panel-systems" role="tabpanel" aria-labelledby="inspector-tab-systems">
              <div className="weather-matrix">
                <div><Cloud size={16} /><span>Weather</span><strong>{weather.current_condition}</strong></div>
                <div><Route size={16} /><span>Routes</span><strong>{world.traffic_system.active_routes}</strong></div>
                <div><Gauge size={16} /><span>Directive</span><strong>{activeDirective}</strong></div>
                <div><Radio size={16} /><span>Signal Pressure</span><strong>{signalTelemetry.pressure}% / {signalTelemetry.level}</strong></div>
              </div>
              <div className="observer-memory-console">
                <div className="memory-console-header">
                  <Database size={16} />
                  <span>Observer Memory</span>
                  <strong>{observerMemory.canPersist ? 'persistent' : 'volatile'}</strong>
                </div>
                <div className="memory-stat-grid">
                  <div>
                    <span>Signals</span>
                    <strong>{observerMemory.discoveredCount}/{SIGNAL_CATALOG.length}</strong>
                  </div>
                  <div>
                    <span>Diary</span>
                    <strong>{observerMemory.diaryCount}/{observerMemory.diaryLimit}</strong>
                  </div>
                  <div>
                    <span>Restore</span>
                    <strong>{observerMemory.restored ? 'yes' : 'no'}</strong>
                  </div>
                  <div>
                    <span>Persist Cap</span>
                    <strong>{observerMemory.persistedDiaryLimit}</strong>
                  </div>
                </div>
              </div>
              <div className={`next-action-console stage-${latestInvestigationThread?.stage ?? 'sealed'}`}>
                <div className="next-action-header">
                  <CheckCircle size={16} />
                  <span>Next Action</span>
                  <strong>{latestInvestigationThread?.stage ?? 'sealed'}</strong>
                </div>
                {nextInvestigationAction ? (
                  <>
                    <p>{nextInvestigationAction.action.description}</p>
                    <button
                      type="button"
                      onClick={() => runInvestigationAction(nextInvestigationAction.signal.id, nextInvestigationAction.action.id)}
                    >
                      {nextInvestigationAction.action.label}
                    </button>
                  </>
                ) : (
                  <p>{latestInvestigationThread ? latestInvestigationThread.stageText : 'Lock a signal to begin anomaly investigation.'}</p>
                )}
              </div>
              <div className={`resonance-console level-${signalTelemetry.level}`}>
                <div className="resonance-header">
                  <span>Resonance Matrix</span>
                  <strong>{signalTelemetry.unresolvedCount} sealed threads</strong>
                </div>
                <div className="resonance-track" aria-label={`Signal pressure ${signalTelemetry.pressure}%`}>
                  <span style={{ width: `${signalTelemetry.pressure}%` }} />
                </div>
                <p>{signalTelemetry.nextLead}</p>
                <div className="impact-list">
                  {signalTelemetry.activeImpacts.length ? signalTelemetry.activeImpacts.map((impact) => (
                    <span key={impact}>{impact}</span>
                  )) : <span>No active anomaly impact. Passive listening only.</span>}
                </div>
              </div>
              <EconomyDashboard />
            </div>
          )}

          {activePanel === 'archive' && (
            <div className="panel-body compact-panel" id="inspector-panel-archive" role="tabpanel" aria-labelledby="inspector-tab-archive">
              <div className="archive-banner">
                <History size={16} />
                <div>
                  <span>Forbidden Depths / {discoveryProgress}% resolved</span>
                  <strong>{latestSignal ? latestSignal.evidence : 'Evidence is revealed by signal, not by menu.'}</strong>
                </div>
              </div>
              <div className="evidence-board">
                <span>Latest Lock</span>
                <strong>{latestSignal?.title ?? 'No signal locked'}</strong>
                <small>{latestSignal?.message ?? 'Open the interceptor and sweep the hidden bands.'}</small>
                {latestSignal && <em>{latestSignal.containment}</em>}
              </div>
              <div className="lead-board">
                <span>Next Lead</span>
                <strong>{signalTelemetry.nextLead}</strong>
              </div>
              <div className="archive-filter-bar" aria-label="Archive signal filters">
                {archiveFilterOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={archiveFilter === option.id ? 'active' : ''}
                    onClick={() => setArchiveFilter(option.id)}
                    aria-pressed={archiveFilter === option.id}
                  >
                    {option.label}
                  </button>
                ))}
                <span>{filteredArchiveSignals.length} threads</span>
              </div>
              <div className="discovery-stack">
                {filteredArchiveSignals.map((card) => {
                  const isUnlocked = discoveredSignalSet.has(card.id);
                  const isFocused = latestSignal?.id === card.id;
                  const thread = investigationState.threads[card.id];
                  return (
                    <div
                      key={card.id}
                      className={`discovery-card ${isUnlocked ? 'unlocked' : 'locked'} ${isFocused ? 'focused' : ''}`}
                    >
                      <button
                        type="button"
                        className="discovery-card-main"
                        onClick={() => markDiscovery(card.id, card.title)}
                        aria-label={`Review anomaly thread ${card.title}`}
                      >
                        <span>{isUnlocked ? `${card.freq.toFixed(1)} MHz / ${card.origin}` : 'LOCKED FREQUENCY'}</span>
                        <strong>{card.title}</strong>
                        <small>{isUnlocked ? card.evidence : card.lead}</small>
                        {isUnlocked && <em>{card.impact}</em>}
                      </button>
                      {thread && (
                        <div className={`investigation-strip stage-${thread.stage}`}>
                          <div className="investigation-strip-header">
                            <span>{thread.stage}</span>
                            <strong>{thread.completedActionIds.length}/{thread.totalActions} actions</strong>
                          </div>
                          <div className="investigation-progress" aria-label={`${card.title} investigation progress ${thread.progress}%`}>
                            <span style={{ width: `${thread.progress}%` }} />
                          </div>
                          {isUnlocked && (
                            <div className="investigation-actions">
                              {card.investigation.actions.map((action) => {
                                const isComplete = thread.completedActionIds.includes(action.id);
                                return (
                                  <button
                                    key={action.id}
                                    type="button"
                                    className={isComplete ? 'complete' : ''}
                                    onClick={() => runInvestigationAction(card.id, action.id)}
                                    disabled={isComplete}
                                  >
                                    {isComplete ? 'done' : action.label}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                          <p>{thread.stageText}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <Chronicle timeline={entities.historical_timeline} />
            </div>
          )}

          {activePanel === 'citizens' && (
            <div className="panel-body compact-panel" id="inspector-panel-citizens" role="tabpanel" aria-labelledby="inspector-tab-citizens">
              <CitizenFeed />
            </div>
          )}
        </aside>

        <section className="signal-strip" aria-label="Anomaly signal strip">
          <div>
            <Sparkles size={15} />
            <span>Active Directive</span>
            <strong>{activeDirective}</strong>
          </div>
          <button type="button" onClick={openInterceptor} aria-label="Scan hidden frequencies">
            <Radio size={15} />
            Scan hidden frequencies
          </button>
          <div>
            <Radio size={15} />
            <span>Signal Memory</span>
            <strong>{signalIntel.length ? `${signalTelemetry.pressure}% ${latestSignal?.title ?? 'locked'}` : weather.current_condition}</strong>
          </div>
        </section>
      </main>

      <SystemAlerts />
      <ObserverDiary />
      <DeepTerminal />
      <AudioEngine />
      <SecurityCamera isActive={isCameraOpen} onClose={() => setIsCameraOpen(false)} />
      {isInterceptorOpen && <SignalInterceptor onClose={() => setIsInterceptorOpen(false)} />}
      {isPastMode && <div className="vcr-filter" aria-hidden="true" />}
      {isPastMode && <div className="vcr-noise" aria-hidden="true" />}
    </div>
  );
}

export default App;

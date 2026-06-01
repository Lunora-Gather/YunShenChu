import { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  AudioLines,
  BookOpen,
  Camera,
  Cloud,
  Compass,
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

const panelOptions: Array<{ id: InspectorPanel; label: string; icon: typeof Eye }> = [
  { id: 'district', label: 'District', icon: Eye },
  { id: 'systems', label: 'Systems', icon: Gauge },
  { id: 'archive', label: 'Archive', icon: BookOpen },
  { id: 'citizens', label: 'Pulse', icon: MessageSquare },
];

const formatPopulation = (value: number) => value.toLocaleString('en-US');

const getStatusClass = (status: string) => {
  const normalized = status.toLowerCase();
  if (normalized.includes('critical') || normalized.includes('hazard') || normalized.includes('testing')) {
    return 'status-critical';
  }
  return 'status-active';
};

const discoveryCards = [
  {
    title: '归墟 / Missing Island 14',
    detail: 'Satellite silence contradicts public maps. Shadow pings return from below the cloud barrier.',
    meta: '104.2 MHz',
  },
  {
    title: 'Ghost Rail',
    detail: 'An unnumbered route appears only when the current district is under high administrative load.',
    meta: 'Black line',
  },
  {
    title: 'Core Heartbeat',
    detail: 'The gravity cores pulse in a rhythm closer to biology than machinery.',
    meta: 'Level 5',
  },
];

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
  const {
    activeDirective,
    addDiaryEntry,
    currentDistricts,
    currentTime,
    entities,
    isDay,
    isPastMode,
    playUISound,
    selectedDistrict,
    setDistrict,
    weather,
    world,
  } = useCity();

  const altitudeRange = selectedDistrict.altitude_range.join(' - ');
  const clockLabel = currentTime.toLocaleTimeString([], { hour12: false });
  const anomalyState = useMemo(() => {
    const weatherRisk = weather.current_condition.toLowerCase().includes('storm') || weather.current_condition.toLowerCase().includes('ion');
    if (world.global_stats.energy_index < 85 || weatherRisk) return 'ELEVATED';
    return isPastMode ? 'ARCHIVE' : 'STABLE';
  }, [isPastMode, weather.current_condition, world.global_stats.energy_index]);

  const socialMetrics = useMemo(() => {
    return Object.entries(selectedDistrict.social_metrics).map(([key, value]) => ({
      key,
      label: key.toUpperCase(),
      value,
    }));
  }, [selectedDistrict.social_metrics]);

  const openInterceptor = () => {
    setIsInterceptorOpen(true);
    playUISound('click');
    addDiaryEntry('Observer opened the encrypted signal interceptor.', 'system', selectedDistrict.name);
  };

  const openCamera = () => {
    setIsCameraOpen(true);
    playUISound('click');
    addDiaryEntry('Synthetic security camera feed requested.', 'visit', selectedDistrict.name);
  };

  const markDiscovery = (title: string) => {
    addDiaryEntry(`Anomaly thread reviewed: ${title}.`, 'secret', selectedDistrict.name);
    playUISound('beep');
  };

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
              </div>
              <EconomyDashboard />
            </div>
          )}

          {activePanel === 'archive' && (
            <div className="panel-body compact-panel" id="inspector-panel-archive" role="tabpanel" aria-labelledby="inspector-tab-archive">
              <div className="archive-banner">
                <History size={16} />
                <div>
                  <span>Forbidden Depths</span>
                  <strong>Evidence is revealed by signal, not by menu.</strong>
                </div>
              </div>
              <div className="discovery-stack">
                {discoveryCards.map((card) => (
                  <button
                    key={card.title}
                    type="button"
                    className="discovery-card"
                    onClick={() => markDiscovery(card.title)}
                    aria-label={`Review anomaly thread ${card.title}`}
                  >
                    <span>{card.meta}</span>
                    <strong>{card.title}</strong>
                    <small>{card.detail}</small>
                  </button>
                ))}
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
            <Cloud size={15} />
            <span>Atmosphere</span>
            <strong>{weather.current_condition}</strong>
          </div>
        </section>
      </main>

      <SystemAlerts />
      <ObserverDiary />
      <DeepTerminal />
      <AudioEngine />
      <SecurityCamera isActive={isCameraOpen} onClose={() => setIsCameraOpen(false)} districtName={selectedDistrict.name} />
      {isInterceptorOpen && <SignalInterceptor onClose={() => setIsInterceptorOpen(false)} />}
      {isPastMode && <div className="vcr-filter" aria-hidden="true" />}
      {isPastMode && <div className="vcr-noise" aria-hidden="true" />}
    </div>
  );
}

export default App;

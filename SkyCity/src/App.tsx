import { revealPinnedTabs } from './components/revealPinnedTabs';
import { useEffect, useEffectEvent, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { KeyboardEvent } from 'react';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  AudioLines,
  BookOpen,
  Camera,
  CheckCircle,
  Cloud,
  Command,
  Database,
  Eye,
  Gauge,
  History,
  Layers3,
  Landmark,
  LockKeyhole,
  MessageSquare,
  Moon,
  Radio,
  Route,
  Search,
  Shield,
  Sparkles,
  Users,
  X,
  Zap,
} from 'lucide-react';
import './App.css';
import './FieldConsole.css';
import { streetReply, watchSites, watchResume } from './data/nightWatch';
import { caseNames, fieldSites, fieldLeads } from './data/fieldSites';
import { CityProvider, useCity } from './context/CityContext';
import { REPLAY_STORAGE_KEY } from './context/observerStorage';
import { SIGNAL_CATALOG } from './data/signals';
import NightWatch from './components/NightWatch/NightWatch';
import AudioEngine from './components/AudioEngine/AudioEngine';
import ScenePhoto from './components/ScenePhoto/ScenePhoto';
import TitleScreen from './components/TitleScreen/TitleScreen';
import CaseDesk, { DepartureFile } from './components/CaseDesk/CaseDesk';
import InstrumentWorkbench from './components/CaseDesk/InstrumentWorkbench';
import { getInstrument } from './data/instruments';
import { getCaseFile } from './data/caseFiles';
import CommandPalette from './components/CommandPalette/CommandPalette';
import type { ConsoleCommand } from './components/CommandPalette/CommandPalette';
import Chronicle from './components/Chronicle/Chronicle';
import CitizenFeed from './components/CitizenFeed/CitizenFeed';
import DeepTerminal from './components/DeepTerminal/DeepTerminal';
import EconomyDashboard from './components/EconomyDashboard/EconomyDashboard';
import GlitchOverlay from './components/GlitchOverlay/GlitchOverlay';
import Map3D from './components/Map3D/Map3D';
import ObserverDiary from './components/ObserverDiary/ObserverDiary';
import Particles from './components/Particles/Particles';
import SaveDesk from './components/SaveDesk/SaveDesk';
import SecurityCamera from './components/SecurityCamera/SecurityCamera';
import SignalInterceptor from './components/SignalInterceptor/SignalInterceptor';
import Starfield from './components/Starfield/Starfield';
import SystemAlerts from './components/SystemAlerts/SystemAlerts';
import TemporalToggle from './components/TemporalToggle/TemporalToggle';
import TrafficVisualization from './components/TrafficVisualization/TrafficVisualization';
import WeatherOverlay from './components/WeatherOverlay/WeatherOverlay';

type InspectorPanel = 'district' | 'systems' | 'archive' | 'citizens';
type ArchiveFilter = 'all' | 'unlocked' | 'sealed';
type ConsoleOverlay =
  | { type: 'signals'; opener: HTMLElement | null; targetId?: string; fieldVisit?: boolean }
  | { type: 'case'; opener: HTMLElement | null; signalId: string }
  | { type: 'capture'; opener: HTMLElement | null; signalId: string; actionId: string; practice?: boolean; returnToCase?: boolean }
  | { type: 'camera' | 'palette' | 'departure' | 'save'; opener: HTMLElement | null };
type ConsoleDrawer = 'terminal' | 'diary';

const panelOptions: Array<{ id: InspectorPanel; label: string; icon: typeof Eye }> = [
  { id: 'district', label: '现场', icon: Eye },
  { id: 'systems', label: '系统', icon: Gauge },
  { id: 'archive', label: '档案', icon: BookOpen },
  { id: 'citizens', label: '居民', icon: MessageSquare },
];

const archiveFilterOptions: Array<{ id: ArchiveFilter; label: string }> = [
  { id: 'all', label: '全部' },
  { id: 'unlocked', label: '已锁定' },
  { id: 'sealed', label: '待锁定' },
];

const stageLabels = { sealed: '待锁定', detected: '已锁定', corroborated: '取证中', contained: '已归档' };

const pressureLabels = { quiet: '平稳', watch: '留意', unstable: '不稳', breach: '干扰' };
const weatherLabels: Record<string, string> = {
  'Clear Sky with Ion Clouds': '晴，有离子云', 'Heavy Ion Storm': '强离子风暴',
  'Static Cloud Cover': '静电云层', 'Perfectly Clear': '晴朗', 'Under-cloud Pressure Waves': '云下压力波',
  'Heavy Fog & Industrial Smoke': '浓雾与工业烟尘',
};

const formatPopulation = (value: number) => value.toLocaleString('en-US');
const getIsDay = () => {
  const hour = new Date().getHours();
  return hour >= 6 && hour < 18;
};

function ConsoleClock() {
  const [time, setTime] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return <strong>{time.toLocaleTimeString([], { hour12: false })}</strong>;
}

const getStatusClass = (status: string) => {
  const normalized = status.toLowerCase();
  if (normalized.includes('critical') || normalized.includes('hazard') || normalized.includes('testing')) {
    return 'status-critical';
  }
  return 'status-active';
};

type Screen = 'title' | 'field' | 'watch';

function currentScreen(): Screen {
  if (window.location.hash === '#watch') return 'watch';
  if (window.location.hash === '#field' || new URLSearchParams(window.location.search).get('view') === 'field') return 'field';
  return 'title';
}

function fieldViewKey() {
  return new URLSearchParams(window.location.search).has('replay') ? 'yunshenchu.replay.view' : 'yunshenchu.original.view';
}

function savedFieldView() {
  if (currentScreen() !== 'field') return;
  let view;
  try {
    view = JSON.parse(window.sessionStorage.getItem(fieldViewKey()) ?? 'null');
  } catch { return; }
  if (!view || typeof view.district !== 'string' || !Object.hasOwn(fieldSites, view.district)) return;
  const panel = panelOptions.find(option => option.id === view.panel)?.id ?? 'district';
  return { district: view.district as string, near: view.near === true, map: view.map === true, panel };
}

function subscribeRoute(notify: () => void) {
  window.addEventListener('hashchange', notify);
  window.addEventListener('popstate', notify);
  window.addEventListener('screenchange', notify);
  return () => {
    window.removeEventListener('hashchange', notify);
    window.removeEventListener('popstate', notify);
    window.removeEventListener('screenchange', notify);
  };
}

function navigateTo(screen: Screen) {
  if (currentScreen() === screen) return;
  const destination = new URL(window.location.href);
  destination.searchParams.delete('view');
  destination.hash = screen === 'title' ? '' : screen;
  try {
    window.history.pushState(null, '', destination);
  } catch {
    window.location.assign(destination.href);
    return;
  }
  window.dispatchEvent(new Event('screenchange'));
}

function ObserverConsole({ replay, screen }: { replay: boolean; screen: Screen }) {
  const entered = screen === 'field';
  const watching = screen === 'watch';
  const watchLink = useRef<HTMLAnchorElement>(null);
  const [mapView, setMapView] = useState(() => savedFieldView()?.map ?? false);
  const [nearbyDistrict, setNearbyDistrict] = useState<string | null>(() => {
    const view = savedFieldView();
    return view?.near ? view.district : null;
  });
  const entryFocus = useRef(false);
  const [overlay, setOverlay] = useState<ConsoleOverlay | null>(null);
  const [activeDrawer, setActiveDrawer] = useState<ConsoleDrawer | null>(null);
  const [isDay, setIsDay] = useState(getIsDay);
  const [activePanel, setActivePanel] = useState<InspectorPanel>(() => savedFieldView()?.panel ?? 'district');
  const [archiveFilter, setArchiveFilter] = useState<ArchiveFilter>('all');
  const archiveInput = useRef<HTMLInputElement>(null);
  const [archiveQuery, setArchiveQuery] = useState('');
  const {
    activeDirective,
    nightWatch,
    addDiaryEntry,
    currentDistricts,
    discoveredSignalIds,
    districts,
    entities,
    focusSignal,
    completeInvestigationAction,
    departureDecision,
    investigationState,
    isPastMode,
    latestSignal,
    observerMemory,
    playUISound,
    requestDiaryReview,
    requestTerminalAction,
    selectedDistrict,
    visitLiveDistrict,
    toggleTemporalView,
    signalIntel,
    signalTelemetry,
    weather,
    world,
  } = useCity();

  const altitudeRange = selectedDistrict.altitude_range.join(' - ');

  useEffect(() => {
    const timer = setInterval(() => setIsDay(getIsDay()), 30_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!entered || watching) return;

    const handleShortcut = (event: globalThis.KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'k' || !(event.metaKey || event.ctrlKey) || event.altKey || event.isComposing) return;
      if (overlay && overlay.type !== 'palette') return;

      event.preventDefault();
      setOverlay(overlay ? null : { type: 'palette', opener: document.activeElement instanceof HTMLElement ? document.activeElement : null });
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [entered, overlay, watching]);

  useEffect(() => {
    if (!entryFocus.current || watching) return;
    entryFocus.current = false;
    document.querySelector<HTMLElement>(entered ? '.observer-console' : '.title-play')?.focus({ preventScroll: true });
  }, [entered, watching]);
  const restoreView = useEffectEvent(() => {
    entryFocus.current = true;
    setOverlay(null);
    setActiveDrawer(null);
    const view = savedFieldView();
    if (!view) return;
    visitLiveDistrict(view.district);
    setNearbyDistrict(view.near ? view.district : null);
    setMapView(view.map);
    setActivePanel(view.panel);
  });
  useEffect(() => {
    const restore = () => restoreView();
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, []);

  useEffect(() => {
    if (!entered || isPastMode || currentScreen() !== 'field') return;
    const fieldView = { district: selectedDistrict.id, near: nearbyDistrict === selectedDistrict.id, map: mapView, panel: activePanel };
    try {
      window.sessionStorage.setItem(fieldViewKey(), JSON.stringify(fieldView));
    } catch { /* Exploring the field also works when the browser disables session storage. */ }
  }, [entered, isPastMode, selectedDistrict.id, nearbyDistrict, mapView, activePanel]);
  const socialMetrics = useMemo(() => {
    return Object.entries(selectedDistrict.social_metrics).map(([key, value]) => ({
      key,
      label: key.toUpperCase(),
      value,
    }));
  }, [selectedDistrict.social_metrics]);

  const discoveredSignalSet = useMemo(() => new Set(discoveredSignalIds), [discoveredSignalIds]);
  const hasSignalMemory = signalIntel.length > 0;
  const scanActionLabel = discoveredSignalIds.length === SIGNAL_CATALOG.length ? '查看已锁定信号' : '全城扫频';
  const localSignalCount = isPastMode ? 0 : signalTelemetry.districtSignalCounts[selectedDistrict.id] ?? 0;
  const filteredArchiveSignals = useMemo(() => {
    const query = archiveQuery.trim().toLowerCase();
    const districtNames = new Map(districts.map((district) => [district.id, district.name]));

    return SIGNAL_CATALOG.filter((signal) => {
      const isUnlocked = discoveredSignalSet.has(signal.id);
      if (archiveFilter === 'unlocked') return isUnlocked;
      if (archiveFilter === 'sealed') return !isUnlocked;
      return true;
    }).filter((signal) => {
      if (!query) return true;

      const identity = [
        signal.id,
        signal.title,
        caseNames[signal.id],
        signal.origin,
        signal.lead,
        signal.districtId,
        signal.districtId?.replaceAll('_', ' '),
        signal.districtId && districtNames.get(signal.districtId),
      ];
      const unlockedDetails = discoveredSignalSet.has(signal.id) ? [
        signal.evidence, signal.impact, signal.containment,
        ...signal.investigation.actions.flatMap((action) => [action.id, action.label, action.description]),
      ] : [];

      return [...identity, ...unlockedDetails].join(' ').toLowerCase().includes(query);
    });
  }, [archiveFilter, archiveQuery, discoveredSignalSet, districts]);
  const latestInvestigationThread = investigationState.latestThread;
  const nextInvestigationAction = investigationState.nextAction;
  const guidedSignal = nextInvestigationAction?.signal;
  const guidedRegion = watchSites.find(site => site.id === guidedSignal?.districtId)?.ring ?? '观察台';
  const guidedCase = guidedSignal ? guidedRegion + ' · ' + caseNames[guidedSignal.id] : '';
  const guidedAction = nextInvestigationAction?.action.label ?? '';
  const nextThread = nextInvestigationAction ? investigationState.threads[nextInvestigationAction.signal.id] : latestInvestigationThread;
  const filedCount = SIGNAL_CATALOG.filter(({ id }) => investigationState.threads[id]?.stage === 'contained').length;
  const hasFinalDispatch = filedCount === SIGNAL_CATALOG.length;
  const showMap = mapView || isPastMode || activeDrawer === 'terminal';
  const fieldLog = useMemo(() => SIGNAL_CATALOG.flatMap((signal) =>
    (getCaseFile(signal.id)?.records ?? [])
      .filter(({ actionId }) => investigationState.completedActionIds[signal.id]?.includes(actionId))
      .map((record) => ({ record, signal })))
    .sort((a, b) => a.record.time.localeCompare(b.record.time)), [investigationState.completedActionIds]);

  const openInterceptor = (opener: HTMLElement | null) => {
    setOverlay({ type: 'signals', opener });
    playUISound('click');
    addDiaryEntry('Observer opened the encrypted signal interceptor.', 'system', selectedDistrict.name);
  };

  const openCamera = (opener: HTMLElement | null) => {
    setOverlay({ type: 'camera', opener });
    playUISound('click');
    addDiaryEntry('Synthetic security camera feed requested.', 'visit', selectedDistrict.name);
  };

  const closeOverlay = () => {
    setOverlay(null);
    playUISound('click');
  };

  const openSaveDesk = (opener: HTMLElement) => {
    setOverlay({ type: 'save', opener });
  };

  const returnToTitle = () => {
    setNearbyDistrict(null);
    setOverlay(null);
    setActiveDrawer(null);
    entryFocus.current = true;
    navigateTo('title');
  };

  const openCase = (id: string, opener: HTMLElement) => {
    if (!discoveredSignalSet.has(id)) {
      setOverlay({ type: 'signals', targetId: id, opener });
    } else {
      setOverlay({ type: 'case', signalId: id, opener });
    }
    playUISound('click');
  };

  const markDiscovery = (id: string, title: string, opener: HTMLElement) => {
    if (discoveredSignalSet.has(id)) {
      focusSignal(id);
      addDiaryEntry(`Anomaly thread focused: ${title}.`, 'secret', selectedDistrict.name);
      return;
    }

    addDiaryEntry(`Observer reviewed a locked anomaly stub: ${title}. Signal evidence still required.`, 'system', selectedDistrict.name);
    playUISound('beep');
    setOverlay({ type: 'signals', opener, targetId: id });
  };

  const showEvidencePanel = (panel: InspectorPanel) => {
    setActivePanel(panel);
    requestAnimationFrame(() => {
      const tab = document.getElementById(`inspector-tab-${panel}`);
      tab?.focus({ preventScroll: true });
      tab?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
  };

  const runConsoleCommand = (command: ConsoleCommand) => {
    const opener = overlay?.opener ?? document.getElementById('command-palette-trigger');
    if (command === 'signals') {
      openInterceptor(opener);
      return;
    }
    if (command === 'camera') {
      openCamera(opener);
      return;
    }
    closeOverlay();
    if (command === 'archive') {
      setActivePanel('archive');
      requestAnimationFrame(() => document.getElementById('inspector-tab-archive')?.focus());
      return;
    }
    setActiveDrawer(command);
  };

  const handlePanelKeys = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number;
    switch (event.key) {
      case 'ArrowLeft': nextIndex = (index + panelOptions.length - 1) % panelOptions.length; break;
      case 'ArrowRight': nextIndex = (index + 1) % panelOptions.length; break;
      case 'Home': nextIndex = 0; break;
      case 'End': nextIndex = panelOptions.length - 1; break;
      default: return;
    }
    event.preventDefault();
    const nextPanel = panelOptions[nextIndex].id;
    document.getElementById(`inspector-tab-${nextPanel}`)?.focus();
    revealPinnedTabs(event.currentTarget);
    setActivePanel(nextPanel);
  };

  const runInvestigationAction = (signalId: string, actionId: string, opener: HTMLElement | null) => {
    const signal = SIGNAL_CATALOG.find((item) => item.id === signalId);
    const action = signal?.investigation.actions.find((item) => item.id === actionId);
    if (!signal || !action) return;

    if (getInstrument(signal.id, action.id)) {
      focusSignal(signal.id);
      if (action.type === 'camera' && signal.districtId) visitLiveDistrict(signal.districtId);
      setOverlay({ type: 'capture', signalId, actionId, opener });
      return;
    }

    if (action.type === 'report') {
      setOverlay({ type: 'case', signalId, opener });
      playUISound('click');
      return;
    }

    if (action.type === 'terminal') {
      requestTerminalAction(signal.id, action.id);
      return;
    }

    if (action.type === 'diary') {
      requestDiaryReview(signal.id, action.id);
      return;
    }

    if (action.type === 'district' && action.districtId) {
      visitLiveDistrict(action.districtId);
      setActivePanel('district');
    }

    if (action.type === 'camera') {
      if (signal.districtId) visitLiveDistrict(signal.districtId);
      setOverlay({ type: 'camera', opener });
    }

    if (action.type === 'citizens') {
      focusSignal(signal.id);
      showEvidencePanel('citizens');
      return;
    }

    if (action.type === 'archive') {
      showEvidencePanel(action.id === 'review-systems' ? 'systems' : 'archive');
    }

    completeInvestigationAction(signal.id, action.id);
  };

  const site = fieldSites[selectedDistrict.id];
  const patrolIndex = watchSites.findIndex(s => s.id === selectedDistrict.id);
  const completedWorks = nightWatch?.works[patrolIndex] ?? 0;
  const nearby = !showMap && nearbyDistrict === selectedDistrict.id;
  const shownPhoto = nearby ? site.nearby : site;
  const fieldByDistrict = currentDistricts.map(district => {
    const threads = SIGNAL_CATALOG.filter(signal => signal.districtId === district.id)
      .map(signal => investigationState.threads[signal.id]);
    const lead = threads.find(thread => thread.nextAction && thread.signal.id === latestSignal?.id)
      ?? threads.find(thread => thread.nextAction)
      ?? threads.find(thread => thread.stage === 'sealed')
      ?? threads[0];
    const sign = lead.nextAction?.type === 'report' ? '可交结论'
      : lead.stage === 'contained' ? '本环已结案' : lead.stage === 'sealed' ? fieldLeads[lead.signal.id].sign
      : lead.stage === 'detected' ? '信号已锁定'
      : '已取证 ' + lead.completedActionIds.length + ' / 3';
    return { district, threads, lead, sign };
  });
  const { threads: localThreads, lead } = fieldByDistrict.find(({ district }) => district.id === selectedDistrict.id)!;
  const localReply = streetReply(nightWatch, patrolIndex);
  const resume = watchResume(nightWatch, hasFinalDispatch);
  const note = fieldLeads[lead.signal.id];
  const next = lead.nextAction;
  const instruction = next ? note.actions[next.id] : undefined;
  const firstRecord = getCaseFile(lead.signal.id)?.records[0];
  const readingHere = nearby && next?.type === 'district' ? firstRecord : undefined;
  const visitLabel = readingHere ? note.record : !next ? (lead.stage === 'sealed' ? note.scan : '重读调查结论')
    : next.label;
  const condition = next?.type === 'report' ? '待结案'
    : { sealed: '待核实', detected: '信号已锁定', corroborated: '取证中', contained: '已结案' }[lead.stage];
  const observation = next?.type === 'report' ? '三份记录已齐。选出解释现象的判断，用两条独立读数支持它。'
    : lead.stage === 'contained' ? note.filed : instruction ?? note.observation;
  const lastRecord = getCaseFile(lead.signal.id)?.records.filter(({ actionId }) => lead.completedActionIds.includes(actionId)).at(-1);
  const investigateSite = (opener: HTMLElement) => {
    if (next?.type === 'district' && !nearby) {
      setMapView(false);
      setActiveDrawer(null);
      setNearbyDistrict(selectedDistrict.id);
      return;
    }
    if (next) {
      focusSignal(lead.signal.id);
      runInvestigationAction(lead.signal.id, next.id, opener);
      if (readingHere) setNearbyDistrict(null);
    } else if (lead.stage === 'sealed') {
      setOverlay({ type: 'signals', targetId: lead.signal.id, fieldVisit: true, opener });
      playUISound('click');
    } else {
      openCase(lead.signal.id, opener);
    }
  };

  if (watching) return <NightWatch onExit={() => {
    navigateTo('field');
    requestAnimationFrame(() => watchLink.current?.focus());
  }} />;

  if (!entered) {
    const finalWorksheet = hasFinalDispatch && !departureDecision;
    const unexplored = !guidedSignal && hasSignalMemory && !hasFinalDispatch
      ? (lead.stage === 'sealed' ? lead.signal : SIGNAL_CATALOG.find(signal => !discoveredSignalSet.has(signal.id))) : undefined;
    const destination = guidedSignal ?? unexplored;
    const districtId = destination?.districtId;
    const pendingFile = guidedSignal && getCaseFile(guidedSignal.id);
    const lastSource = pendingFile?.records.filter(record => nextThread?.completedActionIds.includes(record.actionId)).at(-1);
    const premise = finalWorksheet ? '五份结论都已归档。零号月台送来一张发车清单，站务员在等你的回电。'
      : pendingFile ? (lastSource ? '上次查到「' + lastSource.source + '」。' : '') + pendingFile.question
      : unexplored ? fieldLeads[unexplored.id]?.observation ?? '三环的案卷都已归档。接收器上，还有一个频道没有查清来源。'
      : undefined;
    const resumeLead = finalWorksheet ? '零号月台 · 复原发车清单'
      : guidedSignal ? guidedCase + ' · ' + guidedAction
      : districtId && unexplored ? fieldSites[districtId].site + ' · ' + fieldLeads[unexplored.id].scan
      : unexplored ? '观察台 · 监听未记录的频道'
      : isPastMode ? '初代平台 · 历史档案' : site.site + ' · ' + visitLabel;

    const continueInvestigation = () => {
      navigateTo('field');
      if (finalWorksheet) {
        setOverlay({ type: 'departure', opener: null });
      } else if (destination && !districtId) {
        if (guidedSignal) {
          if (guidedSignal.id !== latestSignal?.id) focusSignal(guidedSignal.id);
          setOverlay({ type: 'case', signalId: guidedSignal.id, opener: null });
        } else {
          setOverlay({ type: 'signals', targetId: destination.id, opener: null });
        }
      } else {
        if (districtId) {
          visitLiveDistrict(districtId);
          if (guidedSignal && guidedSignal.id !== latestSignal?.id) focusSignal(guidedSignal.id);
          setMapView(false);
          setActivePanel('district');
        }
        entryFocus.current = true;
      }
    };
    return (
      <>
        <TitleScreen replay={replay} nightWatch={nightWatch} locked={discoveredSignalIds.length} filed={filedCount}
          lead={resumeLead} premise={premise} finished={departureDecision !== null} canPersist={observerMemory.canPersist}
          onManageSaves={openSaveDesk} onEnter={continueInvestigation} />
        {overlay?.type === 'save' && <SaveDesk replay={replay} opener={overlay.opener} onClose={closeOverlay} />}
      </>
    );
  }

  return (
    <div className={`app-shell observer-shell ${isDay ? 'day-mode' : 'night-mode'} ${isPastMode ? 'temporal-active' : ''} ${overlay ? 'has-modal' : ''}`}>
      <Starfield />

      <main className="observer-console" aria-label="云深处调查台" tabIndex={-1}>
        <header className="observer-topbar">
          <div className="brand-lockup">
            <button
              className="round-signal console-menu"
              type="button"
              onClick={returnToTitle}
              title="返回标题画面"
              aria-label="返回标题画面"
            >
              <ArrowLeft size={16} aria-hidden="true" />
            </button>
            <div>
              <h1 lang="zh-CN">云深处</h1>
              <p>{replay ? '重玩 · ' : ''}{isPastMode ? '初代历史档案' : '城市调查台'}</p>
            </div>
            <div className="brand-controls">
              <button
                id="command-palette-trigger"
                className="command-palette-trigger"
                type="button"
                aria-label="打开快捷指令"
                aria-keyshortcuts="Meta+K Control+K"
                title="快捷指令（⌘K / Ctrl+K）"
                onClick={(event) => setOverlay({ type: 'palette', opener: event.currentTarget })}
              >
                <Command size={16} aria-hidden="true" />
              </button>
              <AudioEngine />
            </div>
          </div>

          <details className="city-telemetry"><summary><Activity size={15} /> 城市读数</summary>
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
                <Layers3 size={13} />
                <span>Altitude</span>
                <strong>{world.global_stats.average_altitude}m</strong>
              </div>
              <div className="top-metric">
                <Activity size={13} />
                <span>Clock</span>
                <ConsoleClock />
              </div>
              <div className={`top-metric signal-pressure-tile level-${signalTelemetry.level}`}>
                <Radio size={13} />
                <span>Signal</span>
                <strong>{signalTelemetry.pressure}% {pressureLabels[signalTelemetry.level]}</strong>
              </div>
            </div>
          </details>
          <span className="header-progress"><BookOpen size={15} /> 已结案 <b>{filedCount} / {SIGNAL_CATALOG.length}</b></span>
        </header>

        <nav className="district-rail" aria-label="城区选择">
          {fieldByDistrict.map(({ district, sign }) => (
            <button key={district.id} type="button" aria-pressed={selectedDistrict.id === district.id}
              className={`rail-district ${selectedDistrict.id === district.id ? 'active' : ''}`}
              onClick={() => {
                if (!isPastMode) visitLiveDistrict(district.id);
                setActivePanel('district');
                setMapView(false);
                setNearbyDistrict(null);
                setActiveDrawer(null);
              }}>
              {!isPastMode && <img src={fieldSites[district.id].image} alt="" />}
              <span><strong>{district.name}</strong><small>{isPastMode ? '初代施工中' : sign}</small></span>
            </button>
          ))}
        </nav>

        <section className={`city-window ${showMap ? 'view-map' : 'view-exterior'}`} data-district={selectedDistrict.id} data-distance={nearby ? 'near' : 'far'} aria-label="城区观景窗">
          <div className="scene-frame">
            {showMap ? <>
              <TrafficVisualization paused={overlay !== null} />
              <Map3D />
            </> : <>
              <ScenePhoto src={shownPhoto.image} alt={shownPhoto.alt} />
              <button type="button" className="scene-waypoint" aria-pressed={nearby} aria-label={nearby ? '回到远景' : site.nearby.invite}
                onClick={() => {
                  setNearbyDistrict(nearby ? null : selectedDistrict.id);
                  playUISound('click');
                }}>
                <span className="waypoint-lens" aria-hidden="true">{nearby ? <ArrowLeft size={15} /> : <Eye size={15} />}</span>
                <span className="waypoint-name">{nearby ? '回到远景' : site.nearby.invite}</span>
              </button>
            </>}
            {isPastMode ? <div className="vcr-filter" aria-hidden="true" /> : <>
              <WeatherOverlay condition={weather.current_condition} />
              <Particles />
            </>}
            <div className="scene-caption">
              <GlitchOverlay />
              <span>{isPastMode ? 'YEAR 01' : site.englishName} / {selectedDistrict.coordinates.z.toLocaleString()} m</span>
              <h2>{isPastMode ? '初代定居平台' : nearby ? site.nearby.name : site.site}</h2>
            </div>
            <div className="window-toolbar">
              {!isPastMode && activeDrawer !== 'terminal' && (
                <button className="control-btn map-toggle" aria-pressed={showMap} aria-label={showMap ? '查看城区外景' : '查看城区地图'} title={showMap ? '查看城区外景' : '查看城区地图'} type="button" onClick={() => { setMapView(!mapView); setNearbyDistrict(null); }}>
                  <Layers3 size={16} aria-hidden="true" /> <span>{showMap ? '外景' : '地图'}</span>
                </button>
              )}
              <TemporalToggle />
              <button className="control-btn camera-launch glow-on-hover" type="button" aria-label="查看城区监控" title="查看城区监控" onClick={(event) => openCamera(event.currentTarget)}>
                <Camera size={16} />
                <span>监控</span>
              </button>
              <button id="signal-toolbar-trigger" className="control-btn glow-on-hover signal-launch" type="button" aria-label="全城信号接收器" title="全城信号接收器" onClick={(event) => openInterceptor(event.currentTarget)}>
                <AudioLines size={16} />
                <span>信号</span>
              </button>
            </div>

          </div>
          {isPastMode ? (
            <div className="site-observation"><div><small>Year 01 · 历史记录</small><h3>初代平台施工中</h3>
              <p>{selectedDistrict.description}</p></div>
              <button type="button" className="site-primary" onClick={toggleTemporalView}>返回实时城区 <ArrowRight size={17} /></button>
            </div>
          ) : (
            <div className="site-observation" data-lead={lead.signal.id} data-stage={lead.stage}>
              <div aria-live="polite" aria-atomic="true">
                <small><span className="site-lamp" />{condition} · {selectedDistrict.name}</small>
                <h3>{caseNames[lead.signal.id]}</h3>
                {nearby && lead.stage !== 'contained' && !readingHere ? (
                  <blockquote className="local-fragment"><cite>{note.source}</cite>{note.fragment}</blockquote>
                ) : readingHere ? (
                  <blockquote className="local-fragment"><cite>{readingHere.time} · {note.sourceLabel}</cite>
                    {note.reading}
                  </blockquote>
                ) : <p>{observation}</p>}
              </div>
              <button type="button" className="site-primary" onClick={(event) => investigateSite(event.currentTarget)}>
                {visitLabel}<ArrowRight size={17} aria-hidden="true" />
              </button>
            </div>
          )}
        </section>

        <aside className="inspector-panel" aria-label="调查手册">
          <div className="panel-tabs" role="tablist" aria-label="手册栏目">
            {panelOptions.map((option, index) => {
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
                  tabIndex={activePanel === option.id ? 0 : -1}
                  onClick={event => { revealPinnedTabs(event.currentTarget); setActivePanel(option.id); }}
                  onKeyDown={(event) => handlePanelKeys(event, index)}
                >
                  <Icon size={14} />
                  {option.label}
                </button>
              );
            })}
          </div>

          {activePanel === 'district' && (
            <div className="panel-body" id="inspector-panel-district" role="tabpanel" aria-labelledby="inspector-tab-district" tabIndex={0}>
              <section className="site-notebook">
                <small>{isPastMode ? 'YEAR 01' : site.englishName} / 现场簿</small>
                <h2>{isPastMode ? '初代平台记录' : selectedDistrict.name}</h2>
                <p>{selectedDistrict.description}</p>
                {!isPastMode && <div className="site-reports">
                  {localThreads.map(({ signal, stage, completedActionIds }) => (
                    <button key={signal.id} type="button" onClick={(event) => openCase(signal.id, event.currentTarget)}>
                      <span>{caseNames[signal.id]}</span>
                      <small>{stage === 'contained' ? '结论已归档' : stage === 'sealed' ? '待核实' : `${completedActionIds.length} / 3 份记录`}</small>
                      <ArrowRight size={15} />
                    </button>
                  ))}
                </div>}
                {!isPastMode && lastRecord && <blockquote><cite>{lastRecord.time} · {lastRecord.source}</cite>{lastRecord.readings[0].value}</blockquote>}
                {!observerMemory.canPersist && <p className="launch-brief" role="status">本次调查仅保存在此页，可在存档管理中下载备份。</p>}
                {!isPastMode && localReply && <blockquote className="watch-city-letter">
                  <cite>{watchSites[patrolIndex].keeper} · {localReply.title}</cite>
                  {localReply.reply}
                </blockquote>}
                {!isPastMode && !localReply && completedWorks > 0 && <blockquote className="watch-city-letter">
                  <cite>{watchSites[patrolIndex].keeper} · {watchSites[patrolIndex].works[completedWorks - 1]}</cite>
                  {watchSites[patrolIndex].letters[completedWorks - 1]}
                </blockquote>}
                {!isPastMode && <a ref={watchLink} className="watch-entry" href="#watch">
                  <Moon size={18} /><span><strong>值夜巡查</strong>
                    <small>{nightWatch ? resume.label + ' · ' + resume.detail : resume.detail}</small></span>
                  <ArrowRight size={15} />
                </a>}
              </section>
              <nav className="case-rail" aria-label="Investigation cases">
                <div className="rail-label"><BookOpen size={13} aria-hidden="true" /> 其他案卷</div>
                <ul>
                  {SIGNAL_CATALOG.filter((signal) => isPastMode || signal.districtId !== selectedDistrict.id).map((signal) => {
                    const stage = investigationState.threads[signal.id]?.stage ?? 'sealed';
                    const active = nextThread?.signal.id === signal.id && stage !== 'contained';
                    const Status = stage === 'contained' ? CheckCircle : stage === 'sealed' ? LockKeyhole : Radio;
                    return <li key={signal.id}>
                      <button className={`case-rail-link stage-${stage}`} type="button" aria-current={active ? 'step' : undefined}
                        onClick={(event) => openCase(signal.id, event.currentTarget)}>
                        <Status size={13} aria-hidden="true" /><span>{caseNames[signal.id]}</span><small>{stage === 'sealed' ? '未锁定' : stage === 'contained' ? '已归档' : '进行中'}</small>
                      </button>
                    </li>;
                  })}
                </ul>
              </nav>
              {hasFinalDispatch && <button className="notebook-ending" type="button"
                onClick={(event) => setOverlay({ type: 'departure', opener: event.currentTarget })}>
                <BookOpen size={16} />{departureDecision ? '重读调度回执' : '复原 Q-17 发车清单'}<ArrowRight size={16} />
              </button>}
              <details className="site-details"><summary>城区资料与遥测</summary>
                <div className="operation-grid">
                  <div>
                    <Landmark size={16} />
                    <span>海拔区间</span>
                    <strong>{altitudeRange}m</strong>
                  </div>
                  <div>
                    <Users size={16} />
                    <span>城区人口</span>
                    <strong>{formatPopulation(selectedDistrict.population)}</strong>
                  </div>
                  <div>
                    <Shield size={16} />
                    <span>防护等级</span>
                    <strong>{selectedDistrict.security_level ?? world.global_stats.status}</strong>
                  </div>
                  <div>
                    <Radio size={16} />
                    <span>本地回波</span>
                    <strong>已锁定 {localSignalCount}</strong>
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
                  <h3>城区地标</h3>
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
              </details>
            </div>
          )}

          {activePanel === 'systems' && (
            <div className="panel-body compact-panel" id="inspector-panel-systems" role="tabpanel" aria-labelledby="inspector-tab-systems">
              <div className="weather-matrix">
                <div><Cloud size={16} /><span>天气</span><strong>{weatherLabels[weather.current_condition] ?? weather.current_condition}</strong></div>
                <div><Route size={16} /><span>航线</span><strong>{world.traffic_system.active_routes}</strong></div>
                <div><Gauge size={16} /><span>当班指令</span><strong>{activeDirective}</strong></div>
                <div><Radio size={16} /><span>信号压力</span><strong>{signalTelemetry.pressure}% / {pressureLabels[signalTelemetry.level]}</strong></div>
              </div>
              <div className="observer-memory-console">
                <div className="memory-console-header">
                  <Database size={16} />
                  <span>本机存档</span>
                  <strong>{observerMemory.canPersist ? '自动保存' : '仅此页'}</strong>
                </div>
                <button type="button" className="field-case-link field-save-link" onClick={(event) => openSaveDesk(event.currentTarget)}>
                  管理存档 <ArrowRight size={14} aria-hidden="true" />
                </button>
                <div className="memory-stat-grid">
                  <div>
                    <span>已锁定信号</span>
                    <strong>{observerMemory.discoveredCount}/{SIGNAL_CATALOG.length}</strong>
                  </div>
                  <div>
                    <span>日记</span>
                    <strong>{observerMemory.diaryCount}/{observerMemory.diaryLimit}</strong>
                  </div>
                  <div>
                    <span>本次载入</span>
                    <strong>{observerMemory.restored ? '已有记录' : '新记录'}</strong>
                  </div>
                  <div>
                    <span>可保存日记</span>
                    <strong>{observerMemory.persistedDiaryLimit}</strong>
                  </div>
                </div>
              </div>
              <div className={`next-action-console stage-${nextThread?.stage ?? 'sealed'}`}>
                <div className="next-action-header">
                  <CheckCircle size={16} />
                  <span>下一步行动</span>
                  <strong>{stageLabels[nextThread?.stage ?? 'sealed']}</strong>
                </div>
                {nextInvestigationAction ? (
                  <>
                    <p><strong>{nextInvestigationAction.signal.title}</strong><br />{nextInvestigationAction.action.description}</p>
                    <button
                      type="button"
                      onClick={(event) => runInvestigationAction(nextInvestigationAction.signal.id, nextInvestigationAction.action.id, event.currentTarget)}
                    >
                      {nextInvestigationAction.action.label}
                    </button>
                  </>
                ) : (
                  <p>{latestInvestigationThread ? latestInvestigationThread.stageText : '从现场或接收器锁定一段信号，即可开始取证。'}</p>
                )}
              </div>
              <div className={`resonance-console level-${signalTelemetry.level}`}>
                <div className="resonance-header">
                  <span>信号共振</span>
                  <strong>{signalTelemetry.unresolvedCount} 个信号待锁定</strong>
                </div>
                <div className="resonance-track" aria-label={`Signal pressure ${signalTelemetry.pressure}%`}>
                  <span style={{ width: `${signalTelemetry.pressure}%` }} />
                </div>
                <p>{signalTelemetry.nextLead}</p>
                <div className="impact-list">
                  {signalTelemetry.activeImpacts.length ? signalTelemetry.activeImpacts.map((signal) => (
                    <button key={signal.id} type="button" onClick={() => focusSignal(signal.id)} aria-pressed={latestSignal?.id === signal.id}>
                      <strong>{signal.title}</strong>
                      <span>{signal.impact}</span>
                    </button>
                  )) : <span>暂无异常影响，接收器正在监听。</span>}
                </div>
              </div>
              <SystemAlerts />
              <EconomyDashboard />
            </div>
          )}

          {activePanel === 'archive' && (
            <div className="panel-body compact-panel" id="inspector-panel-archive" role="tabpanel" aria-labelledby="inspector-tab-archive">
              {hasFinalDispatch && (
                <button className="archive-case-link archive-departure-link" type="button" onClick={(event) => setOverlay({ type: 'departure', opener: event.currentTarget })}>
                  查看联合调度单
                </button>
              )}
              <div className="archive-banner">
                <History size={16} />
                <div>
                  <span>已锁定 {discoveredSignalIds.length}/{SIGNAL_CATALOG.length} 个信号 · 已归档 {filedCount} 起</span>
                  <strong>{latestSignal ? latestSignal.evidence : '打开接收器，沿频段寻找第一份线索。'}</strong>
                </div>
              </div>
              <div className="evidence-board">
                <span>最近锁定</span>
                <strong>{latestSignal ? caseNames[latestSignal.id] : '等待第一段信号'}</strong>
                <small>{latestSignal?.message ?? '从任一城区的现场也可以开始调查。'}</small>
                {latestSignal && <em>{latestSignal.containment}</em>}
              </div>
              <div className="lead-board">
                <span>下一条线索</span>
                <strong>{signalTelemetry.nextLead}</strong>
              </div>
              {fieldLog.length > 0 && (
                <details className="field-chronology">
                  <summary>现场日志 · {fieldLog.length} 条记录</summary>
                  <ol>
                    {fieldLog.map(({ record, signal }) => (
                      <li key={`${signal.id}/${record.actionId}`}>
                        <button type="button" onClick={(event) => setOverlay({
                          type: 'case', signalId: signal.id, opener: event.currentTarget,
                        })}>
                          <time>{record.time}</time>
                          <span><strong>{record.source}</strong><small>{caseNames[signal.id]}</small></span>
                        </button>
                      </li>
                    ))}
                  </ol>
                </details>
              )}
              <div className="archive-search-bar">
                <Search size={14} />
                <input
                  type="search"
                  ref={archiveInput}
                  value={archiveQuery}
                  onChange={(event) => setArchiveQuery(event.target.value)}
                  placeholder="搜索案名、地区或证据"
                  aria-label="搜索案卷"
                />
                {archiveQuery && (
                  <button
                    type="button"
                    onClick={() => { setArchiveQuery(''); archiveInput.current?.focus(); }}
                    aria-label="清空案卷搜索"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <div className="archive-filter-bar" aria-label="按信号状态筛选">
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
                <span>{filteredArchiveSignals.length} 起</span>
              </div>
              <div className="discovery-stack">
                {filteredArchiveSignals.length ? filteredArchiveSignals.map((card) => {
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
                        onClick={(event) => markDiscovery(card.id, card.title, event.currentTarget)}
                        aria-label={`查阅案卷 · ${caseNames[card.id]}`}
                      >
                        <span>{isUnlocked ? `${card.freq.toFixed(1)} MHz / ${card.origin}` : '频率待锁定'}</span>
                        <strong>{caseNames[card.id]}</strong>
                        <small>{isUnlocked ? card.evidence : card.lead}</small>
                        {isUnlocked && <em>{card.impact}</em>}
                      </button>
                      {thread && (
                        <div className={`investigation-strip stage-${thread.stage}`}>
                          <div className="investigation-strip-header">
                            <span>{stageLabels[thread.stage]}</span>
                            <strong>{thread.completedActionIds.length}/{thread.totalActions} 项</strong>
                          </div>
                          <div className="investigation-progress" aria-label={`${caseNames[card.id]}调查进度 ${thread.progress}%`}>
                            <span style={{ width: `${thread.progress}%` }} />
                          </div>
                          {isUnlocked && (
                            <div className="investigation-actions">
                              {thread.nextAction && thread.nextAction.type !== 'report' && (
                                <button type="button" onClick={(event) => {
                                  if (thread.nextAction) runInvestigationAction(card.id, thread.nextAction.id, event.currentTarget);
                                }}>
                                  {thread.nextAction.label}
                                </button>
                              )}
                              <button type="button" className="archive-case-link" onClick={(event) => setOverlay({ type: 'case', signalId: card.id, opener: event.currentTarget })}>
                                {thread.stage === 'contained' ? '重读调查结论' : '翻开案卷'}
                              </button>
                            </div>
                          )}
                          <p>{thread.stageText}</p>
                        </div>
                      )}
                    </div>
                  );
                }) : (
                  <div className="archive-empty-state">
                    <Search size={18} />
                    <strong>没有符合条件的案卷</strong>
                    <span>{archiveQuery ? '试试其他案名或地区' : '可切换上方的状态筛选'}</span>
                  </div>
                )}
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

        <section className={`signal-strip ${nextInvestigationAction || hasFinalDispatch ? 'has-next-action' : ''}`} aria-label="调查快捷操作">
          <div>
            <Sparkles size={15} />
            <span>城市指令</span>
            <strong>{activeDirective}</strong>
          </div>
          <button
            type="button"
            id="field-scan" className={`strip-scan-action ${hasSignalMemory ? '' : 'is-awaiting'}`}
            onClick={(event) => openInterceptor(event.currentTarget)}
            aria-label={scanActionLabel}
          >
            <Radio size={15} />
            {scanActionLabel}
          </button>
          {nextInvestigationAction && (
            <button
              type="button"
              id="field-next-action" className="strip-next-action"
              onClick={(event) => runInvestigationAction(nextInvestigationAction.signal.id, nextInvestigationAction.action.id, event.currentTarget)}
              aria-label={guidedCase + '，' + guidedAction}
            >
              <Route size={16} aria-hidden="true" />
              <small>{guidedCase}</small>
              <strong>{guidedAction}</strong>
            </button>
          )}
          {hasFinalDispatch && (
            <button id="field-dispatch" type="button" className="strip-dispatch" onClick={(event) => setOverlay({ type: 'departure', opener: event.currentTarget })}>
              <BookOpen size={15} aria-hidden="true" /> {departureDecision ? '重读结局' : '打开最终调度单'}
              <ArrowRight size={15} aria-hidden="true" />
            </button>
          )}
          <div>
            <Radio size={15} />
            <span>已结案</span>
            <strong>{filedCount}/{SIGNAL_CATALOG.length}</strong>
          </div>
        </section>
      </main>

      <ObserverDiary isOpen={activeDrawer === 'diary'} onOpenChange={(open) => setActiveDrawer(open ? 'diary' : null)} />
      <DeepTerminal isOpen={activeDrawer === 'terminal'} onOpenChange={(open) => setActiveDrawer(open ? 'terminal' : null)} />
      {overlay?.type === 'camera' && <SecurityCamera opener={overlay.opener} onClose={closeOverlay} />}
      {overlay?.type === 'signals' && <SignalInterceptor opener={overlay.opener} targetId={overlay.targetId} onClose={closeOverlay}
        siteName={overlay.fieldVisit ? site.nearby.name : undefined}
        onReturnToSite={() => {
          setNearbyDistrict(selectedDistrict.id);
          closeOverlay();
        }}
        onInvestigate={(id) => {
          focusSignal(id);
          setOverlay({ type: 'case', signalId: id, opener: overlay.opener });
        }} />}
      {overlay?.type === 'palette' && <CommandPalette opener={overlay.opener} onClose={closeOverlay} onSelect={runConsoleCommand} />}
      {overlay?.type === 'case' && (
        <CaseDesk key={overlay.signalId} signalId={overlay.signalId} opener={overlay.opener} onClose={closeOverlay}
          onOpenInstrument={(actionId, practice) => setOverlay({
            type: 'capture', signalId: overlay.signalId, opener: overlay.opener, actionId, practice, returnToCase: true,
          })}
          onContinue={(actionId) => {
            closeOverlay();
            runInvestigationAction(overlay.signalId, actionId, overlay.opener);
          }}
        />
      )}
      {overlay?.type === 'capture' && (
        <InstrumentWorkbench key={overlay.signalId} signalId={overlay.signalId} actionId={overlay.actionId}
          opener={overlay.opener} practice={overlay.practice} returnToCase={overlay.returnToCase} onClose={overlay.returnToCase
            ? () => setOverlay({ type: 'case', signalId: overlay.signalId, opener: overlay.opener })
            : closeOverlay}
        />
      )}
      {overlay?.type === 'departure' && <DepartureFile opener={overlay.opener} onClose={closeOverlay} />}
      {overlay?.type === 'save' && <SaveDesk replay={replay} opener={overlay.opener} onClose={closeOverlay} />}
    </div>
  );
}

export default function App({ replay }: { replay: boolean }) {
  const screen = useSyncExternalStore(subscribeRoute, currentScreen);

  return (
    <CityProvider initialDistrict={savedFieldView()?.district} storageKey={replay ? REPLAY_STORAGE_KEY : undefined} observing={screen !== 'title'}>
      <ObserverConsole replay={replay} screen={screen} />
    </CityProvider>
  );
}

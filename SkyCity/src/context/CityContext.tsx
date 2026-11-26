import { advanceWatch, initialWatch } from '../data/nightWatch';
import type { WatchBook, WatchAction } from '../data/nightWatch';
/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import worldData from '../data/world.json';
import districtsData from '../data/districts.json';
import entitiesData from '../data/entities.json';
import pastWorldData from '../data/past_world.json';
import pastDistrictsData from '../data/past_districts.json';
import { getSignalById, SIGNAL_CATALOG } from '../data/signals';
import type { InvestigationAction, InvestigationStage, SignalIntel } from '../data/signals';
import { checkFinding, DEPARTURE_CHOICES, getCaseFile, hasFiledAllFindings, REPORT_ACTION_ID } from '../data/caseFiles';
import type { CaseSubmission, DepartureChoice, DepartureDecision } from '../data/caseFiles';
import { getInstrument, verifyInstrument } from '../data/instruments';
import type { InstrumentInput } from '../data/instruments';
import {
  canUseObserverStorage,
  createObserverBackup,
  MAX_PERSISTED_DIARY_ENTRIES,
  MAX_SESSION_DIARY_ENTRIES,
  mergeObserverProgress,
  OBSERVER_STORAGE_KEY,
  OBSERVER_STORAGE_VERSION,
  parseObserverStorage,
  readObserverStorage,
  restoreObserverStorage,
  readObserverSlot,
  writeObserverSlot,
  withObserverStorageLock,
} from './observerStorage';
import type { DiaryEntry, ObserverBackup, ObserverRestoreResult, ObserverStorageState } from './observerStorage';

interface District {
  id: string;
  name: string;
  description: string;
  coordinates: { x: number; y: number; z: number };
  altitude_range: number[];
  visual_style: string;
  security_level?: string;
  dominant_faction?: string;
  landmarks: Array<{ name: string; type: string; status: string }>;
  population: number;
  social_metrics: {
    happiness: number;
    education: number;
    productivity: number;
  };
}

type DistrictSource = Omit<District, 'population' | 'social_metrics'> & {
  social_metrics?: District['social_metrics'];
};
type WorldState = typeof worldData;
type WeatherState = WorldState['weather'];
type AlertType = SystemAlert['type'];
type ResonanceLevel = 'quiet' | 'watch' | 'unstable' | 'breach';

const presentDistricts = districtsData as DistrictSource[];
const archiveDistricts = pastDistrictsData as DistrictSource[];
const ALERT_DEDUPE_WINDOW_MS = 6500;

interface CityState {
  nightWatch?: WatchBook;
  recordWatch: (action: WatchAction) => void;
  selectedDistrict: District;
  districts: District[];
  activeDirective: string;
  weather: WeatherState;
  alerts: SystemAlert[];
  diary: DiaryEntry[];
  setDistrict: (id: string) => void;
  visitLiveDistrict: (id: string) => void;
  playUISound: (type?: 'beep' | 'click') => void;
  lastSoundTrigger: { type: 'beep' | 'click'; timestamp: number } | null;
  addAlert: (message: string, type?: 'info' | 'warning' | 'critical') => void;
  removeAlert: (id: string) => void;
  addDiaryEntry: (message: string, type: DiaryEntry['type'], location?: string) => void;
  discoveredSignalIds: string[];
  latestSignal: SignalIntel | null;
  signalIntel: SignalIntel[];
  signalTelemetry: SignalTelemetry;
  observerMemory: ObserverMemoryState;
  exportObserverBackup: () => string;
  restoreObserverBackup: (backup: ObserverBackup) => Promise<ObserverRestoreResult>;
  investigationState: InvestigationState;
  terminalCommandRequest: TerminalCommandRequest | null;
  diaryReviewRequest: DiaryReviewRequest | null;
  focusSignal: (id: string) => void;
  completeInvestigationAction: (signalId: string, actionId: string) => void;
  captureInstrumentRecord: (signalId: string, actionId: string, sample: InstrumentInput) => string | null;
  submitCaseFinding: (signalId: string, submission: CaseSubmission) => string | null;
  departureDecision: DepartureDecision | null;
  fileDepartureDecision: (choice: DepartureChoice) => void;
  requestTerminalAction: (signalId: string, actionId: string) => void;
  requestDiaryReview: (signalId: string, actionId: string) => void;
  registerSignalDiscovery: (signal: SignalIntel) => void;
  world: WorldState;
  entities: typeof entitiesData;
  isPastMode: boolean;
  toggleTemporalView: () => void;
  currentDistricts: District[];
}

interface SystemAlert {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'critical';
  timestamp: Date;
}

interface SignalTelemetry {
  pressure: number;
  level: ResonanceLevel;
  nextLead: string;
  activeImpacts: SignalIntel[];
  unresolvedCount: number;
  districtSignalCounts: Record<string, number>;
}

interface ObserverMemoryState {
  canPersist: boolean;
  restored: boolean;
  discoveredCount: number;
  diaryCount: number;
  diaryLimit: number;
  persistedDiaryLimit: number;
  storageKey: string;
  schemaVersion: number;
}

export interface InvestigationThreadState {
  signal: SignalIntel;
  stage: InvestigationStage;
  stageText: string;
  completedActionIds: string[];
  totalActions: number;
  nextAction: InvestigationAction | null;
  progress: number;
}

interface InvestigationNextAction {
  signal: SignalIntel;
  action: InvestigationAction;
}

interface InvestigationState {
  threads: Record<string, InvestigationThreadState>;
  latestThread: InvestigationThreadState | null;
  nextAction: InvestigationNextAction | null;
  completedActionIds: Record<string, string[]>;
}

interface TerminalCommandRequest {
  id: number;
  command: string;
  label: string;
}

interface DiaryReviewRequest {
  id: number;
  signalId: string;
  actionId: string;
  label: string;
}

const CityContext = createContext<CityState | undefined>(undefined);

const getInvestigationStage = (signal: SignalIntel, isDiscovered: boolean, completedActionIds: string[]): InvestigationStage => {
  if (!isDiscovered) return 'sealed';
  if (completedActionIds.length >= signal.investigation.actions.length) return 'contained';
  if (completedActionIds.length > 0) return 'corroborated';
  return 'detected';
};

const getInvestigationStageText = (signal: SignalIntel, stage: InvestigationStage) => {
  if (stage === 'sealed') return signal.lead;
  return signal.investigation[stage];
};

export const CityProvider: React.FC<{ children: ReactNode; initialDistrict?: string; storageKey?: string; observing?: boolean }> = ({
  children, initialDistrict, storageKey = OBSERVER_STORAGE_KEY, observing = true,
}) => {
  const [storedObserverState] = useState<ObserverStorageState>(() => readObserverStorage(storageKey));
  const [canPersistObserverMemory, setCanPersistObserverMemory] = useState(() => (
    storedObserverState.schemaVersion <= OBSERVER_STORAGE_VERSION && canUseObserverStorage(storageKey)
  ));
  const [selectedDistrictId, setSelectedDistrictId] = useState(() => initialDistrict ?? getSignalById(storedObserverState.latestSignalId ?? '')?.districtId ?? 'foundation');
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [diary, setDiary] = useState<DiaryEntry[]>(storedObserverState.diary);
  const [lastSoundTrigger, setLastSoundTrigger] = useState<{ type: 'beep' | 'click'; timestamp: number } | null>(null);
  const [isPastMode, setIsPastMode] = useState(false);
  const [discoveredSignalIds, setDiscoveredSignalIds] = useState<string[]>(storedObserverState.discoveredSignalIds);
  const [latestSignalId, setLatestSignalId] = useState<string | null>(storedObserverState.latestSignalId);
  const [completedInvestigationActions, setCompletedInvestigationActions] = useState<Record<string, string[]>>(storedObserverState.completedInvestigationActions);
  const [nightWatch, setNightWatch] = useState(storedObserverState.nightWatch);
  const watchRef = useRef(storedObserverState.nightWatch);
  const [departureDecision, setDepartureDecision] = useState(storedObserverState.departureDecision);
  const [terminalCommandRequest, setTerminalCommandRequest] = useState<TerminalCommandRequest | null>(null);
  const [diaryReviewRequest, setDiaryReviewRequest] = useState<DiaryReviewRequest | null>(null);
  const alertCounterRef = useRef(0);
  const requestCounterRef = useRef(0);
  const discoveredSignalIdsRef = useRef<string[]>(storedObserverState.discoveredSignalIds);
  const completedInvestigationActionsRef = useRef<Record<string, string[]>>(storedObserverState.completedInvestigationActions);
  const departureDecisionRef = useRef(storedObserverState.departureDecision);
  const focusedSignalRef = useRef(storedObserverState.latestSignalId);
  const diaryRef = useRef(storedObserverState.diary);
  const savedLocalFocus = useRef(storedObserverState.latestSignalId);
  const alertDedupeRef = useRef<Record<string, number>>({});

  const recordWatch = useCallback((action: WatchAction) => {
    const current = watchRef.current ?? initialWatch;
    const permit = action.type === 'accept' && hasFiledAllFindings(completedInvestigationActionsRef.current)
      ? departureDecisionRef.current?.choice ?? 'local' : undefined;
    const next = advanceWatch(current, action, permit);
    if (next === current) return;
    watchRef.current = next;
    setNightWatch(next);
  }, []);

  const setObserverFocus = useCallback((id: string | null) => {
    focusedSignalRef.current = id;
    setLatestSignalId(id);
  }, []);

  const snapshotObserverState = useCallback((): ObserverStorageState => ({
    schemaVersion: OBSERVER_STORAGE_VERSION,
    discoveredSignalIds: discoveredSignalIdsRef.current,
    completedInvestigationActions: completedInvestigationActionsRef.current,
    nightWatch: watchRef.current,
    departureDecision: departureDecisionRef.current,
    latestSignalId: focusedSignalRef.current,
    diary: diaryRef.current,
  }), []);

  // Dynamic City State
  const [districts, setDistricts] = useState<District[]>(() => {
    // Initialize population distribution
    const totalPop = worldData.global_stats.total_population;
    return presentDistricts.map(d => ({
      ...d,
      population: d.id === 'apex' ? Math.floor(totalPop * 0.12) : 
                  d.id === 'mid_ring' ? Math.floor(totalPop * 0.64) : 
                  Math.floor(totalPop * 0.24),
      social_metrics: d.social_metrics || { happiness: 80, education: 80, productivity: 80 }
    }));
  });
  const [liveDirective, setLiveDirective] = useState(worldData.active_directives[0]);
  const [liveWorld, setLiveWorld] = useState<WorldState>(worldData);
  const [liveWeather, setLiveWeather] = useState<WeatherState>(worldData.weather);

  const hasOpenAnomaly = (id: string) => discoveredSignalIds.includes(id)
    && !completedInvestigationActions[id]?.includes(REPORT_ACTION_ID);
  const ventPressure = hasOpenAnomaly('abyss-whale');
  const corePulse = hasOpenAnomaly('core-heartbeat');
  const liveVentWeather = useMemo(() => ventPressure ? {
    ...liveWeather, current_condition: 'Under-cloud Pressure Waves', wind_speed: Math.max(liveWeather.wind_speed, 18),
  } : liveWeather, [liveWeather, ventPressure]);
  const observedLiveWorld = useMemo(() => corePulse ? {
    ...liveWorld,
    global_stats: {
      ...liveWorld.global_stats,
      energy_index: Math.max(70, Number((liveWorld.global_stats.energy_index - 0.9).toFixed(1))),
    },
  } : liveWorld, [corePulse, liveWorld]);
  const world: WorldState = isPastMode ? pastWorldData : observedLiveWorld;
  const weather = isPastMode ? pastWorldData.weather : liveVentWeather;
  const departureDirective = departureDecision ? DEPARTURE_CHOICES[departureDecision.choice].directive : null;
  const activeDirective = isPastMode ? pastWorldData.active_directives[0] : departureDirective ?? liveDirective;
  const liveDistrictBeforeArchive = useRef(presentDistricts[0].id);

  const currentDistricts = useMemo<District[]>(() => {
    if (!isPastMode) return districts;

    return archiveDistricts.map(d => ({
      ...d,
      population: 0,
      social_metrics: d.social_metrics || { happiness: 50, education: 50, productivity: 50 }
    }));
  }, [districts, isPastMode]);
  const selectedDistrict = useMemo(() => {
    return currentDistricts.find(d => d.id === selectedDistrictId) || currentDistricts[0];
  }, [currentDistricts, selectedDistrictId]);
  
  const playUISound = useCallback((type: 'beep' | 'click' = 'beep') => {
    setLastSoundTrigger({ type, timestamp: Date.now() });
  }, []);

  const removeAlert = useCallback((id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  }, []);

  const addAlert = useCallback((message: string, type: AlertType = 'info') => {
    const now = Date.now();
    const dedupeKey = `${type}:${message}`;
    const lastShownAt = alertDedupeRef.current[dedupeKey] ?? 0;

    if (now - lastShownAt < ALERT_DEDUPE_WINDOW_MS) {
      return;
    }

    alertDedupeRef.current[dedupeKey] = now;
    const id = `alert-${++alertCounterRef.current}`;
    const newAlert = { id, message, type, timestamp: new Date(now) };
    setAlerts(prev => [newAlert, ...prev].slice(0, 5));
    
    // Auto-remove alert after 10 seconds
    setTimeout(() => removeAlert(id), 10000);
  }, [removeAlert]);

  const addDiaryEntry = useCallback((message: string, type: DiaryEntry['type'], location?: string) => {
    const entry: DiaryEntry = {
      id: `diary-${crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`}`,
      timestamp: new Date(),
      type,
      location,
      message
    };
    diaryRef.current = [entry, ...diaryRef.current].slice(0, MAX_SESSION_DIARY_ENTRIES);
    setDiary(diaryRef.current);
  }, []);

  const signalIntel = useMemo(() => {
    return discoveredSignalIds
      .map((id) => getSignalById(id))
      .filter((signal): signal is SignalIntel => Boolean(signal));
  }, [discoveredSignalIds]);

  const latestSignal = useMemo(() => {
    return latestSignalId ? getSignalById(latestSignalId) : null;
  }, [latestSignalId]);

  const observerMemory = useMemo<ObserverMemoryState>(() => ({
    canPersist: canPersistObserverMemory,
    restored: Boolean(storedObserverState.nightWatch || storedObserverState.latestSignalId || storedObserverState.discoveredSignalIds.length || storedObserverState.diary.length),
    discoveredCount: discoveredSignalIds.length,
    diaryCount: diary.length,
    diaryLimit: MAX_SESSION_DIARY_ENTRIES,
    persistedDiaryLimit: MAX_PERSISTED_DIARY_ENTRIES,
    storageKey,
    schemaVersion: OBSERVER_STORAGE_VERSION,
  }), [canPersistObserverMemory, diary.length, discoveredSignalIds.length, storageKey, storedObserverState]);

  const investigationState = useMemo<InvestigationState>(() => {
    const discoveredSet = new Set(discoveredSignalIds);
    const threads = SIGNAL_CATALOG.reduce<Record<string, InvestigationThreadState>>((state, signal) => {
      const completedActionIds = completedInvestigationActions[signal.id] ?? [];
      const stage = getInvestigationStage(signal, discoveredSet.has(signal.id), completedActionIds);
      const completedSet = new Set(completedActionIds);
      const nextAction = stage === 'sealed'
        ? null
        : signal.investigation.actions.find((action) => !completedSet.has(action.id)) ?? null;

      state[signal.id] = {
        signal,
        stage,
        stageText: getInvestigationStageText(signal, stage),
        completedActionIds,
        totalActions: signal.investigation.actions.length,
        nextAction,
        progress: signal.investigation.actions.length
          ? Math.round((completedActionIds.length / signal.investigation.actions.length) * 100)
          : stage === 'sealed' ? 0 : 100,
      };

      return state;
    }, {});

    const latestThread = latestSignal ? threads[latestSignal.id] ?? null : null;
    const nextThread = latestThread?.nextAction
      ? latestThread
      : discoveredSignalIds
        .map((id) => threads[id])
        .find((thread) => thread?.nextAction) ?? null;

    return {
      threads,
      latestThread,
      nextAction: nextThread?.nextAction ? { signal: nextThread.signal, action: nextThread.nextAction } : null,
      completedActionIds: completedInvestigationActions,
    };
  }, [completedInvestigationActions, discoveredSignalIds, latestSignal]);

  const signalTelemetry = useMemo<SignalTelemetry>(() => {
    const discoveredSet = new Set(discoveredSignalIds);
    const unresolvedSignal = SIGNAL_CATALOG.find((signal) => !discoveredSet.has(signal.id));
    const weatherPressure = weather.current_condition.toLowerCase().includes('storm') || weather.current_condition.toLowerCase().includes('pressure') ? 10 : 0;
    const energyPressure = Math.max(0, Math.round((92 - world.global_stats.energy_index) * 1.8));
    const activeSignals = signalIntel.filter((signal) => investigationState.threads[signal.id].stage !== 'contained');
    const signalPressure = activeSignals.reduce((total, signal) => total + signal.pressure, 0);
    const pressure = Math.min(100, Math.max(0, signalPressure + weatherPressure + energyPressure));

    const level: ResonanceLevel = pressure >= 72
      ? 'breach'
      : pressure >= 48
        ? 'unstable'
        : pressure >= 22
          ? 'watch'
          : 'quiet';

    const districtSignalCounts = signalIntel.reduce<Record<string, number>>((counts, signal) => {
      const key = signal.districtId ?? 'citywide';
      counts[key] = (counts[key] ?? 0) + 1;
      return counts;
    }, {});

    return {
      pressure,
      level,
      nextLead: investigationState.nextAction?.action.description ?? unresolvedSignal?.lead ?? '全部案卷已归档，可查阅零号月台的调度单。',
      activeImpacts: activeSignals,
      unresolvedCount: SIGNAL_CATALOG.length - discoveredSignalIds.length,
      districtSignalCounts,
    };
  }, [discoveredSignalIds, investigationState, signalIntel, weather.current_condition, world.global_stats.energy_index]);

  const focusSignal = useCallback((id: string) => {
    if (discoveredSignalIdsRef.current.includes(id)) {
      setObserverFocus(id);
      playUISound('click');
    }
  }, [playUISound, setObserverFocus]);

  const recordInvestigationAction = useCallback((signalId: string, actionId: string) => {
    const signal = getSignalById(signalId);
    if (!signal || !discoveredSignalIdsRef.current.includes(signal.id)) return;

    const action = signal.investigation.actions.find((item) => item.id === actionId);
    if (!action) return;

    const currentActionIds = completedInvestigationActionsRef.current[signal.id] ?? [];
    if (currentActionIds.includes(action.id)) {
      setObserverFocus(signal.id);
      playUISound('click');
      return;
    }

    const nextActionIds = [...currentActionIds, action.id];
    const nextCompletedActions = {
      ...completedInvestigationActionsRef.current,
      [signal.id]: nextActionIds,
    };
    completedInvestigationActionsRef.current = nextCompletedActions;
    setCompletedInvestigationActions(nextCompletedActions);
    setObserverFocus(signal.id);
    playUISound('click');

    const nextStage = getInvestigationStage(signal, true, nextActionIds);
    const dispatch = action.type === 'report' ? getCaseFile(signal.id)?.dispatch : undefined;
    addDiaryEntry(dispatch ? `Finding filed for ${signal.title}. ${dispatch}` : `Field record captured for ${signal.title}: ${action.label}.`, 'secret', signal.districtId);

    if (nextStage === 'contained') {
      addAlert(`INVESTIGATION CONTAINED: ${signal.title}`, signal.severity);
    }
  }, [addAlert, addDiaryEntry, playUISound, setObserverFocus]);

  const completeInvestigationAction = useCallback((signalId: string, actionId: string) => {
    if (actionId !== REPORT_ACTION_ID && !getInstrument(signalId, actionId)) recordInvestigationAction(signalId, actionId);
  }, [recordInvestigationAction]);

  const captureInstrumentRecord = useCallback((signalId: string, actionId: string, sample: InstrumentInput) => {
    if (!discoveredSignalIdsRef.current.includes(signalId)) return '先锁定信号，再采集样本。';
    const actionIds = completedInvestigationActionsRef.current[signalId] ?? [];
    if (actionIds.includes(actionId)) return null;
    if (signalId === 'ghost-rail' && actionId === 'review-archive' && !actionIds.includes('trace-ghost-rail')) {
      return '先调取道岔的放行日志，再核对许可。';
    }
    if (sample.kind === 'clock' && isPastMode) return '请返回当班日记，再应用时钟修正量。';
    const feedback = verifyInstrument(signalId, actionId, sample);
    if (!feedback) recordInvestigationAction(signalId, actionId);
    return feedback;
  }, [isPastMode, recordInvestigationAction]);

  const submitCaseFinding = useCallback((signalId: string, submission: CaseSubmission) => {
    const file = getCaseFile(signalId);
    if (!file || !discoveredSignalIdsRef.current.includes(signalId)) return '先锁定本案信号，再提交结论。';

    const actionIds = completedInvestigationActionsRef.current[signalId] ?? [];
    const reason = checkFinding(file, actionIds, submission);
    if (!reason && !actionIds.includes(REPORT_ACTION_ID)) recordInvestigationAction(signalId, REPORT_ACTION_ID);
    return reason;
  }, [recordInvestigationAction]);

  const fileDepartureDecision = useCallback((choice: DepartureChoice) => {
    if (departureDecisionRef.current || !hasFiledAllFindings(completedInvestigationActionsRef.current)) return;
    if (!Object.hasOwn(DEPARTURE_CHOICES, choice)) return;

    const directive = DEPARTURE_CHOICES[choice];
    const decision = { choice, recordedAt: Date.now() };
    departureDecisionRef.current = decision;
    setDepartureDecision(decision);
    addAlert(`PLATFORM 0 TRANSMISSION: ${directive.label}`, 'info');
    addDiaryEntry(`Observer transmitted "${directive.label}" for Departure Q-17. Read the dispatch receipt for the current directive.`, 'secret', 'foundation');
    playUISound('click');
  }, [addAlert, addDiaryEntry, playUISound]);

  const setDistrict = useCallback((id: string) => {
    const district = currentDistricts.find((item) => item.id === id);
    if (!district) return;

    if (id !== selectedDistrictId) {
      setSelectedDistrictId(id);
      playUISound('beep');
      addDiaryEntry(`Observer inspected ${district.name}.`, 'visit', district.name);
    }

    if (isPastMode || !latestSignal) return;

    const action = latestSignal.investigation.actions.find((item) => item.type === 'district' && item.districtId === id);
    if (action && !completedInvestigationActionsRef.current[latestSignal.id]?.includes(action.id)) {
      completeInvestigationAction(latestSignal.id, action.id);
    }
  }, [addDiaryEntry, completeInvestigationAction, currentDistricts, isPastMode, latestSignal, playUISound, selectedDistrictId]);

  const visitLiveDistrict = useCallback((id: string) => {
    const district = presentDistricts.find((item) => item.id === id);
    if (!district) return;

    if (isPastMode) {
      setIsPastMode(false);
      addAlert('TEMPORAL STABILIZED: Returning to Present', 'info');
    }
    setSelectedDistrictId(id);
    if (isPastMode || id !== selectedDistrictId) {
      addDiaryEntry(`Observer inspected ${district.name}.`, 'visit', district.name);
    }
  }, [addAlert, addDiaryEntry, isPastMode, selectedDistrictId]);

  const requestTerminalAction = useCallback((signalId: string, actionId: string) => {
    const signal = getSignalById(signalId);
    if (!signal || !discoveredSignalIdsRef.current.includes(signal.id)) return;

    const action = signal.investigation.actions.find((item) => item.id === actionId);
    if (!action || action.type !== 'terminal' || !action.command) return;

    requestCounterRef.current += 1;
    setObserverFocus(signal.id);
    setTerminalCommandRequest({
      id: requestCounterRef.current,
      command: action.command,
      label: action.label,
    });
    playUISound('click');
  }, [playUISound, setObserverFocus]);

  const requestDiaryReview = useCallback((signalId: string, actionId: string) => {
    const signal = getSignalById(signalId);
    if (!signal || !discoveredSignalIdsRef.current.includes(signal.id)) return;

    const action = signal.investigation.actions.find((item) => item.id === actionId);
    if (!action || action.type !== 'diary') return;

    requestCounterRef.current += 1;
    setObserverFocus(signal.id);
    setDiaryReviewRequest({
      id: requestCounterRef.current,
      signalId: signal.id,
      actionId: action.id,
      label: action.label,
    });
    playUISound('click');
  }, [playUISound, setObserverFocus]);

  const registerSignalDiscovery = useCallback((signal: SignalIntel) => {
    const alreadyDiscovered = discoveredSignalIdsRef.current.includes(signal.id);
    setObserverFocus(signal.id);
    playUISound('beep');

    if (alreadyDiscovered) {
      return;
    }

    const nextSignals = [signal.id, ...discoveredSignalIdsRef.current];
    const nextCompletedActions = {
      ...completedInvestigationActionsRef.current,
      [signal.id]: completedInvestigationActionsRef.current[signal.id] ?? [],
    };
    discoveredSignalIdsRef.current = nextSignals;
    completedInvestigationActionsRef.current = nextCompletedActions;
    setDiscoveredSignalIds(nextSignals);
    setCompletedInvestigationActions(nextCompletedActions);
    addAlert(`SIGNAL LOCKED: ${signal.title}`, signal.severity);
    addDiaryEntry(`Signal locked at ${signal.freq.toFixed(1)}MHz: ${signal.title}. ${signal.evidence}`, 'secret', signal.districtId);

    if (signal.id === 'observer-return') {
      addAlert('OBSERVER LOOP DETECTED: Local session telemetry reflected back to console', 'critical');
    }
  }, [addAlert, addDiaryEntry, playUISound, setObserverFocus]);

  const applyObserverProgress = useCallback((progress: ObserverStorageState) => {
    if (progress.nightWatch !== watchRef.current) {
      watchRef.current = progress.nightWatch;
      setNightWatch(progress.nightWatch);
    }
    if (progress.discoveredSignalIds !== discoveredSignalIdsRef.current) {
      discoveredSignalIdsRef.current = progress.discoveredSignalIds;
      setDiscoveredSignalIds(progress.discoveredSignalIds);
    }
    if (progress.completedInvestigationActions !== completedInvestigationActionsRef.current) {
      completedInvestigationActionsRef.current = progress.completedInvestigationActions;
      setCompletedInvestigationActions(progress.completedInvestigationActions);
    }
    if (progress.departureDecision !== departureDecisionRef.current) {
      departureDecisionRef.current = progress.departureDecision;
      setDepartureDecision(progress.departureDecision);
    }
    if (progress.diary !== diaryRef.current) {
      diaryRef.current = progress.diary;
      setDiary(progress.diary);
    }
    if (progress.latestSignalId !== focusedSignalRef.current) {
      savedLocalFocus.current = progress.latestSignalId;
      setObserverFocus(progress.latestSignalId);
    }
  }, [setObserverFocus]);

  const syncObserverProgress = useCallback((stored: ObserverStorageState) => {
    if (stored.schemaVersion > OBSERVER_STORAGE_VERSION) {
      setCanPersistObserverMemory(false);
      return;
    }

    const local = snapshotObserverState();
    const merged = mergeObserverProgress(local, stored);
    applyObserverProgress({ ...merged, latestSignalId: local.latestSignalId ?? stored.latestSignalId });
  }, [applyObserverProgress, snapshotObserverState]);

  const exportObserverBackup = useCallback(() => createObserverBackup(snapshotObserverState(), storageKey),
    [snapshotObserverState, storageKey]);

  const restoreObserverBackup = useCallback(async (backup: ObserverBackup): Promise<ObserverRestoreResult> => {
    try {
      return await withObserverStorageLock(storageKey, (): ObserverRestoreResult => {
        const result = restoreObserverStorage(window.localStorage, storageKey, snapshotObserverState(), backup);
        if ('error' in result) return { saved: false, message: result.error };

        applyObserverProgress(result.progress);
        savedLocalFocus.current = result.progress.latestSignalId;
        setCanPersistObserverMemory(true);
        return { saved: true, keptEnding: result.keptEnding };
      });
    } catch {
      return { saved: false, message: '当前无法写入本机存储。存储恢复后仍可导入这份备份。' };
    }
  }, [applyObserverProgress, snapshotObserverState, storageKey]);

  useEffect(() => {
    if (!canPersistObserverMemory) return;

    const receive = (event: StorageEvent) => {
      if (event.key !== storageKey || event.storageArea !== window.localStorage) return;
      const stored = parseObserverStorage(event.newValue);
      if (stored) syncObserverProgress(stored);
    };
    window.addEventListener('storage', receive);
    return () => window.removeEventListener('storage', receive);
  }, [canPersistObserverMemory, storageKey, syncObserverProgress]);

  useEffect(() => {
    if (!canPersistObserverMemory) return;
    let active = true;

    const save = () => {
      if (!active) return;
      try {
        const local = snapshotObserverState();
        const storage = window.localStorage;
        const slot = readObserverSlot(storage, storageKey);
        const stored = slot.progress;
        if (stored && stored.schemaVersion > OBSERVER_STORAGE_VERSION) {
          queueMicrotask(() => syncObserverProgress(stored));
          return;
        }

        const merged = stored ? mergeObserverProgress(local, stored) : local;
        const focus = local.latestSignalId === savedLocalFocus.current ? stored?.latestSignalId ?? local.latestSignalId : local.latestSignalId;
        writeObserverSlot(storage, storageKey, slot, { ...merged, latestSignalId: focus });
        savedLocalFocus.current = local.latestSignalId;
        if (stored && (merged.discoveredSignalIds !== local.discoveredSignalIds
          || merged.completedInvestigationActions !== local.completedInvestigationActions
          || merged.nightWatch !== local.nightWatch || merged.departureDecision !== local.departureDecision || merged.diary !== local.diary)) {
          queueMicrotask(() => {
            if (active) syncObserverProgress(stored);
          });
        }
      } catch {
        queueMicrotask(() => {
          if (active) setCanPersistObserverMemory(false);
        });
      }
    };

    void withObserverStorageLock(storageKey, save);
    return () => { active = false; };
  }, [canPersistObserverMemory, completedInvestigationActions, departureDecision, nightWatch, diary, discoveredSignalIds, latestSignalId,
    snapshotObserverState, storageKey, syncObserverProgress]);

  const toggleTemporalView = useCallback(() => {
    if (isPastMode) {
      setSelectedDistrictId(liveDistrictBeforeArchive.current);
      addAlert("TEMPORAL STABILIZED: Returning to Present", "info");
    } else {
      liveDistrictBeforeArchive.current = selectedDistrictId;
      setSelectedDistrictId(archiveDistricts[0].id);
      addAlert("TEMPORAL SHIFT DETECTED: Accessing Year 01 Archive", "warning");
      addDiaryEntry("Temporal anomaly triggered. System recalibrating to Foundation Era data.", "secret");
    }
    playUISound('click');
    setIsPastMode(!isPastMode);
  }, [addAlert, addDiaryEntry, isPastMode, playUISound, selectedDistrictId]);

  // Migration Engine: Randomly shift population and productivity
  useEffect(() => {
    if (!observing) return;
    const migrationTimer = setInterval(() => {
      if (document.hidden) return;
      const sourceIdx = Math.floor(Math.random() * presentDistricts.length);
      const offset = 1 + Math.floor(Math.random() * (presentDistricts.length - 1));
      const targetIdx = (sourceIdx + offset) % presentDistricts.length;
      const migrationRate = 0.01 + Math.random() * 0.02;
      const productivityShift = (Math.random() - 0.5) * 5;

      setDistricts(prev => {
        const nextDistricts = [...prev];
        const source = { ...nextDistricts[sourceIdx] };
        const target = { ...nextDistricts[targetIdx] };

        // Population shift (commute simulation)
        const popShift = Math.floor(source.population * migrationRate);
        source.population -= popShift;
        target.population += popShift;

        // Productivity flux
        source.social_metrics = { 
          ...source.social_metrics, 
          productivity: Math.max(50, Math.min(100, source.social_metrics.productivity + productivityShift))
        };
        target.social_metrics = { 
          ...target.social_metrics, 
          productivity: Math.max(50, Math.min(100, target.social_metrics.productivity - productivityShift))
        };

        nextDistricts[sourceIdx] = source;
        nextDistricts[targetIdx] = target;
        
        return nextDistricts;
      });

      if (Math.random() > 0.7) {
        addDiaryEntry("City Migration: Heavy transit flow detected between sectors.", "system");
      }
    }, 30000);

    return () => clearInterval(migrationTimer);
  }, [addDiaryEntry, observing]);

  const rotateDirective = useEffectEvent(() => {
    if (departureDecision) return;
    const directives = worldData.active_directives;
    const nextDirective = directives[Math.floor(Math.random() * directives.length)];
    if (nextDirective === liveDirective) return;

    setLiveDirective(nextDirective);
    if (isPastMode) return;

    addAlert(`NEW DIRECTIVE ISSUED: ${nextDirective}`, 'info');
    addDiaryEntry(`Governance Update: High Council issued directive "${nextDirective}".`, 'system');
  });

  useEffect(() => {
    if (!observing) return;
    const directiveTimer = setInterval(() => {
      if (!document.hidden) rotateDirective();
    }, 45000);
    return () => clearInterval(directiveTimer);
  }, [observing]);

  const updateLiveEconomy = useEffectEvent(() => {
    const isStorm = /storm|pressure waves/i.test(liveVentWeather.current_condition);
    const energy = liveWorld.global_stats.energy_index;
    const energyChange = isStorm ? -Math.random() * 2 : energy < 98.5 ? Math.random() * 0.5 : 0;
    const nextEnergy = Number(Math.max(70, Math.min(100, energy + energyChange)).toFixed(1));
    const tradeVolumeChange = Math.random() * (isStorm ? -50000 : 20000);
    const nextVolume = Math.floor(Math.max(500000, Math.min(2000000, liveWorld.economy.trade_volume + tradeVolumeChange)));

    setLiveWorld({
      ...liveWorld,
      global_stats: { ...liveWorld.global_stats, energy_index: nextEnergy },
      economy: {
        ...liveWorld.economy,
        market_trend: isStorm ? 'Bearish' : Math.random() > 0.5 ? 'Bullish' : 'Stable',
        trade_volume: nextVolume,
      },
    });

    if (!isPastMode && nextEnergy < 85 && energy >= 85) {
      addAlert('CRITICAL ENERGY DROP: Gravity Cores under-performing', 'critical');
      addDiaryEntry('Critical System Failure: Energy levels dropped below safety threshold.', 'system');
    }
  });

  useEffect(() => {
    if (!observing) return;
    const ecologyTimer = setInterval(() => {
      if (!document.hidden) updateLiveEconomy();
    }, 5000);
    return () => clearInterval(ecologyTimer);
  }, [observing]);

  const simulateWeather = useEffectEvent(() => {
    const events: Array<{ condition: string; type: AlertType; weather: string }> = [
      { condition: "Ion Storm Incoming", type: "warning", weather: "Heavy Ion Storm" },
      { condition: "Traffic Congestion", type: "info", weather: "Clear Sky with Ion Clouds" },
      { condition: "Gravity Core Flux", type: "critical", weather: "Static Cloud Cover" },
      { condition: "Clear Skies", type: "info", weather: "Perfectly Clear" }
    ];

    if (Math.random() <= 0.8) return;

    const event = events[Math.floor(Math.random() * events.length)];
    setLiveWeather(prev => ({ ...prev, current_condition: event.weather }));
    if (isPastMode) return;

    addAlert(event.condition, event.type);
    if (event.type === 'critical' || event.type === 'warning') {
      addDiaryEntry(`Weather Shift: ${event.weather}. Observer warned of atmospheric volatility.`, 'system');
    }
  });

  useEffect(() => {
    if (!observing) return;
    const interval = setInterval(() => {
      if (!document.hidden) simulateWeather();
    }, 20000);
    return () => clearInterval(interval);
  }, [observing]);

  return (
    <CityContext.Provider value={{ 
      selectedDistrict, 
      districts,
      currentDistricts,
      activeDirective,
      weather, 
      alerts, 
      diary,
      setDistrict,
      visitLiveDistrict,
      playUISound,
      lastSoundTrigger,
      addAlert,
      removeAlert,
      addDiaryEntry,
      discoveredSignalIds,
      latestSignal,
      signalIntel,
      signalTelemetry,
      observerMemory,
      nightWatch,
      recordWatch,
      exportObserverBackup,
      restoreObserverBackup,
      investigationState,
      terminalCommandRequest,
      diaryReviewRequest,
      focusSignal,
      completeInvestigationAction,
      captureInstrumentRecord,
      submitCaseFinding,
      departureDecision,
      fileDepartureDecision,
      requestTerminalAction,
      requestDiaryReview,
      registerSignalDiscovery,
      world,
      entities: entitiesData,
      isPastMode,
      toggleTemporalView
    }}>
      {children}
    </CityContext.Provider>
  );
};

export const useCity = () => {
  const context = useContext(CityContext);
  if (context === undefined) {
    throw new Error('useCity must be used within a CityProvider');
  }
  return context;
};

/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import worldData from '../data/world.json';
import districtsData from '../data/districts.json';
import entitiesData from '../data/entities.json';
import pastWorldData from '../data/past_world.json';
import pastDistrictsData from '../data/past_districts.json';
import { getSignalById, SIGNAL_CATALOG } from '../data/signals';
import type { InvestigationAction, InvestigationStage, SignalIntel } from '../data/signals';

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
const OBSERVER_STORAGE_VERSION = 3;
const OBSERVER_STORAGE_KEY = 'yunshenchu.observer.v3';
const LEGACY_OBSERVER_STORAGE_KEYS = ['yunshenchu.observer.v2'];
const ALERT_DEDUPE_WINDOW_MS = 6500;
const MAX_SESSION_DIARY_ENTRIES = 80;
const MAX_PERSISTED_DIARY_ENTRIES = 48;

export interface DiaryEntry {
  id: string;
  timestamp: Date;
  type: 'visit' | 'discovery' | 'system' | 'secret';
  location?: string;
  message: string;
}

interface CityState {
  currentTime: Date;
  selectedDistrict: District;
  districts: District[];
  activeDirective: string;
  weather: WeatherState;
  alerts: SystemAlert[];
  diary: DiaryEntry[];
  isDay: boolean;
  setDistrict: (id: string) => void;
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
  investigationState: InvestigationState;
  terminalCommandRequest: TerminalCommandRequest | null;
  diaryReviewRequest: DiaryReviewRequest | null;
  focusSignal: (id: string) => void;
  completeInvestigationAction: (signalId: string, actionId: string) => void;
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
  activeImpacts: string[];
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
  signalId: string;
  actionId: string;
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

interface PersistedDiaryEntry extends Omit<DiaryEntry, 'timestamp'> {
  timestamp: string;
}

interface ObserverStorageState {
  schemaVersion: number;
  discoveredSignalIds: string[];
  latestSignalId: string | null;
  diary: DiaryEntry[];
  completedInvestigationActions: Record<string, string[]>;
}

const emptyObserverStorage: ObserverStorageState = {
  schemaVersion: OBSERVER_STORAGE_VERSION,
  discoveredSignalIds: [],
  latestSignalId: null,
  diary: [],
  completedInvestigationActions: {},
};

const isDiaryType = (value: unknown): value is DiaryEntry['type'] => (
  value === 'visit' || value === 'discovery' || value === 'system' || value === 'secret'
);

const normalizeSignalIds = (value: unknown) => {
  if (!Array.isArray(value)) return [];

  return Array.from(new Set(value))
    .filter((id): id is string => typeof id === 'string' && Boolean(getSignalById(id)));
};

const normalizeCompletedInvestigationActions = (value: unknown) => {
  if (!value || typeof value !== 'object') return {};

  return Object.entries(value as Record<string, unknown>).reduce<Record<string, string[]>>((normalized, [signalId, actionIds]) => {
    const signal = getSignalById(signalId);
    if (!signal || !Array.isArray(actionIds)) return normalized;

    const validActionIds = new Set(signal.investigation.actions.map((action) => action.id));
    const uniqueActionIds = Array.from(new Set(actionIds))
      .filter((actionId): actionId is string => typeof actionId === 'string' && validActionIds.has(actionId));

    normalized[signal.id] = uniqueActionIds;

    return normalized;
  }, {});
};

const seedCompletedInvestigationActions = (
  completedActionIds: Record<string, string[]>,
  discoveredSignalIds: string[],
) => {
  return discoveredSignalIds.reduce<Record<string, string[]>>((seeded, signalId) => {
    seeded[signalId] = seeded[signalId] ?? [];
    return seeded;
  }, { ...completedActionIds });
};

const parseDiaryEntry = (value: unknown): DiaryEntry | null => {
  if (!value || typeof value !== 'object') return null;

  const entry = value as Partial<PersistedDiaryEntry>;
  if (
    typeof entry.id !== 'string' ||
    typeof entry.message !== 'string' ||
    typeof entry.timestamp !== 'string' ||
    !isDiaryType(entry.type)
  ) {
    return null;
  }

  const timestamp = new Date(entry.timestamp);
  if (Number.isNaN(timestamp.getTime())) return null;

  return {
    id: entry.id,
    message: entry.message,
    timestamp,
    type: entry.type,
    location: typeof entry.location === 'string' ? entry.location : undefined,
  };
};

const parseObserverStorage = (rawStorage: string | null): ObserverStorageState | null => {
  if (!rawStorage) return null;

  try {
    const parsed = JSON.parse(rawStorage) as Partial<{
      schemaVersion: unknown;
      discoveredSignalIds: unknown;
      latestSignalId: unknown;
      diary: unknown;
      completedInvestigationActions: unknown;
    }>;

    const discoveredSignalIds = normalizeSignalIds(parsed.discoveredSignalIds);
    const latestSignalId = typeof parsed.latestSignalId === 'string' && discoveredSignalIds.includes(parsed.latestSignalId)
      ? parsed.latestSignalId
      : discoveredSignalIds[0] ?? null;
    const diary = Array.isArray(parsed.diary)
      ? parsed.diary
        .map(parseDiaryEntry)
        .filter((entry): entry is DiaryEntry => Boolean(entry))
        .slice(0, MAX_PERSISTED_DIARY_ENTRIES)
      : [];

    return {
      schemaVersion: typeof parsed.schemaVersion === 'number' ? parsed.schemaVersion : 2,
      discoveredSignalIds,
      latestSignalId,
      diary,
      completedInvestigationActions: seedCompletedInvestigationActions(
        normalizeCompletedInvestigationActions(parsed.completedInvestigationActions),
        discoveredSignalIds,
      ),
    };
  } catch {
    return null;
  }
};

const readObserverStorage = (): ObserverStorageState => {
  if (typeof window === 'undefined') return emptyObserverStorage;

  const currentStorage = parseObserverStorage(window.localStorage.getItem(OBSERVER_STORAGE_KEY));
  if (currentStorage) return currentStorage;

  for (const legacyKey of LEGACY_OBSERVER_STORAGE_KEYS) {
    const legacyStorage = parseObserverStorage(window.localStorage.getItem(legacyKey));
    if (legacyStorage) return legacyStorage;
  }

  return emptyObserverStorage;
};

const canUseObserverStorage = () => {
  if (typeof window === 'undefined') return false;

  try {
    const probeKey = `${OBSERVER_STORAGE_KEY}.probe`;
    window.localStorage.setItem(probeKey, '1');
    window.localStorage.removeItem(probeKey);
    return true;
  } catch {
    return false;
  }
};

const getStoredCounterFloor = (storage: ObserverStorageState) => {
  const diaryNumbers = storage.diary
    .map((entry) => Number(entry.id.match(/-(\d+)$/)?.[1] ?? 0))
    .filter(Number.isFinite);

  return Math.max(0, ...diaryNumbers);
};

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

export const CityProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [storedObserverState] = useState<ObserverStorageState>(readObserverStorage);
  const [canPersistObserverMemory] = useState(canUseObserverStorage);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedDistrictId, setSelectedDistrictId] = useState(districtsData[0].id);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [diary, setDiary] = useState<DiaryEntry[]>(storedObserverState.diary);
  const [lastSoundTrigger, setLastSoundTrigger] = useState<{ type: 'beep' | 'click'; timestamp: number } | null>(null);
  const [isPastMode, setIsPastMode] = useState(false);
  const [discoveredSignalIds, setDiscoveredSignalIds] = useState<string[]>(storedObserverState.discoveredSignalIds);
  const [latestSignalId, setLatestSignalId] = useState<string | null>(storedObserverState.latestSignalId);
  const [completedInvestigationActions, setCompletedInvestigationActions] = useState<Record<string, string[]>>(storedObserverState.completedInvestigationActions);
  const [terminalCommandRequest, setTerminalCommandRequest] = useState<TerminalCommandRequest | null>(null);
  const [diaryReviewRequest, setDiaryReviewRequest] = useState<DiaryReviewRequest | null>(null);
  const idCounterRef = useRef(getStoredCounterFloor(storedObserverState));
  const requestCounterRef = useRef(0);
  const discoveredSignalIdsRef = useRef<string[]>(storedObserverState.discoveredSignalIds);
  const completedInvestigationActionsRef = useRef<Record<string, string[]>>(storedObserverState.completedInvestigationActions);
  const alertDedupeRef = useRef<Record<string, number>>({});

  const nextId = useCallback((prefix: string) => {
    idCounterRef.current += 1;
    return `${prefix}-${idCounterRef.current}`;
  }, []);
  
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
  const [activeDirective, setActiveDirective] = useState(worldData.active_directives[0]);
  const [world, setWorld] = useState<WorldState>(worldData);
  const [weather, setWeather] = useState<WeatherState>(worldData.weather);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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
  
  // Day/Night logic: 6 AM to 6 PM is day
  const hour = currentTime.getHours();
  const isDay = hour >= 6 && hour < 18;

  const playUISound = useCallback((type: 'beep' | 'click' = 'beep') => {
    setLastSoundTrigger({ type, timestamp: Date.now() });
  }, []);

  const setDistrict = useCallback((id: string) => {
    if (id !== selectedDistrictId) {
      setSelectedDistrictId(id);
      playUISound('beep');
    }
  }, [playUISound, selectedDistrictId]);

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
    const id = nextId('alert');
    const newAlert = { id, message, type, timestamp: new Date(now) };
    setAlerts(prev => [newAlert, ...prev].slice(0, 5));
    
    // Auto-remove alert after 10 seconds
    setTimeout(() => removeAlert(id), 10000);
  }, [nextId, removeAlert]);

  const addDiaryEntry = useCallback((message: string, type: DiaryEntry['type'], location?: string) => {
    const entry: DiaryEntry = {
      id: nextId('diary'),
      timestamp: new Date(),
      type,
      location,
      message
    };
    setDiary(prev => [entry, ...prev].slice(0, MAX_SESSION_DIARY_ENTRIES));
  }, [nextId]);

  const signalIntel = useMemo(() => {
    return discoveredSignalIds
      .map((id) => getSignalById(id))
      .filter((signal): signal is SignalIntel => Boolean(signal));
  }, [discoveredSignalIds]);

  const latestSignal = useMemo(() => {
    return latestSignalId ? getSignalById(latestSignalId) : null;
  }, [latestSignalId]);

  const signalTelemetry = useMemo<SignalTelemetry>(() => {
    const discoveredSet = new Set(discoveredSignalIds);
    const unresolvedSignal = SIGNAL_CATALOG.find((signal) => !discoveredSet.has(signal.id));
    const weatherPressure = weather.current_condition.toLowerCase().includes('storm') || weather.current_condition.toLowerCase().includes('pressure') ? 10 : 0;
    const energyPressure = Math.max(0, Math.round((92 - world.global_stats.energy_index) * 1.8));
    const signalPressure = signalIntel.reduce((total, signal) => total + signal.pressure, 0);
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
      nextLead: latestSignal?.lead ?? unresolvedSignal?.lead ?? 'All known signal threads are resolved. Maintain passive listening.',
      activeImpacts: signalIntel.map((signal) => signal.impact).slice(0, 4),
      unresolvedCount: SIGNAL_CATALOG.length - discoveredSignalIds.length,
      districtSignalCounts,
    };
  }, [discoveredSignalIds, latestSignal, signalIntel, weather.current_condition, world.global_stats.energy_index]);

  const observerMemory = useMemo<ObserverMemoryState>(() => ({
    canPersist: canPersistObserverMemory,
    restored: Boolean(storedObserverState.latestSignalId || storedObserverState.discoveredSignalIds.length || storedObserverState.diary.length),
    discoveredCount: discoveredSignalIds.length,
    diaryCount: diary.length,
    diaryLimit: MAX_SESSION_DIARY_ENTRIES,
    persistedDiaryLimit: MAX_PERSISTED_DIARY_ENTRIES,
    storageKey: OBSERVER_STORAGE_KEY,
    schemaVersion: OBSERVER_STORAGE_VERSION,
  }), [canPersistObserverMemory, diary.length, discoveredSignalIds.length, storedObserverState]);

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

  const focusSignal = useCallback((id: string) => {
    if (discoveredSignalIdsRef.current.includes(id)) {
      setLatestSignalId(id);
      playUISound('click');
    }
  }, [playUISound]);

  const completeInvestigationAction = useCallback((signalId: string, actionId: string) => {
    const signal = getSignalById(signalId);
    if (!signal || !discoveredSignalIdsRef.current.includes(signal.id)) return;

    const action = signal.investigation.actions.find((item) => item.id === actionId);
    if (!action) return;

    const currentActionIds = completedInvestigationActionsRef.current[signal.id] ?? [];
    if (currentActionIds.includes(action.id)) {
      setLatestSignalId(signal.id);
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
    setLatestSignalId(signal.id);
    playUISound('click');

    const nextStage = getInvestigationStage(signal, true, nextActionIds);
    addDiaryEntry(`Investigation advanced for ${signal.title}: ${action.label}. Stage=${nextStage}.`, 'secret', signal.districtId);

    if (nextStage === 'contained') {
      addAlert(`INVESTIGATION CONTAINED: ${signal.title}`, signal.severity);
    }
  }, [addAlert, addDiaryEntry, playUISound]);

  const requestTerminalAction = useCallback((signalId: string, actionId: string) => {
    const signal = getSignalById(signalId);
    if (!signal || !discoveredSignalIdsRef.current.includes(signal.id)) return;

    const action = signal.investigation.actions.find((item) => item.id === actionId);
    if (!action || action.type !== 'terminal' || !action.command) return;

    requestCounterRef.current += 1;
    setLatestSignalId(signal.id);
    setTerminalCommandRequest({
      id: requestCounterRef.current,
      signalId: signal.id,
      actionId: action.id,
      command: action.command,
      label: action.label,
    });
    playUISound('click');
  }, [playUISound]);

  const requestDiaryReview = useCallback((signalId: string, actionId: string) => {
    const signal = getSignalById(signalId);
    if (!signal || !discoveredSignalIdsRef.current.includes(signal.id)) return;

    const action = signal.investigation.actions.find((item) => item.id === actionId);
    if (!action || action.type !== 'diary') return;

    requestCounterRef.current += 1;
    setLatestSignalId(signal.id);
    setDiaryReviewRequest({
      id: requestCounterRef.current,
      signalId: signal.id,
      actionId: action.id,
      label: action.label,
    });
    playUISound('click');
  }, [playUISound]);

  const registerSignalDiscovery = useCallback((signal: SignalIntel) => {
    const alreadyDiscovered = discoveredSignalIdsRef.current.includes(signal.id);
    setLatestSignalId(signal.id);
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

    if (signal.id === 'abyss-whale') {
      setWeather(prev => ({
        ...prev,
        current_condition: 'Under-cloud Pressure Waves',
        wind_speed: Math.max(prev.wind_speed, 18),
      }));
    }

    if (signal.id === 'core-heartbeat') {
      setWorld(prev => ({
        ...prev,
        global_stats: {
          ...prev.global_stats,
          energy_index: Math.max(70, Number((prev.global_stats.energy_index - 0.9).toFixed(1))),
        },
      }));
    }

    if (signal.id === 'observer-return') {
      addAlert('OBSERVER LOOP DETECTED: Local session telemetry reflected back to console', 'critical');
    }
  }, [addAlert, addDiaryEntry, playUISound]);

  useEffect(() => {
    discoveredSignalIdsRef.current = discoveredSignalIds;
  }, [discoveredSignalIds]);

  useEffect(() => {
    completedInvestigationActionsRef.current = completedInvestigationActions;
  }, [completedInvestigationActions]);

  useEffect(() => {
    if (!canPersistObserverMemory || typeof window === 'undefined') return;

    const payload = {
      schemaVersion: OBSERVER_STORAGE_VERSION,
      discoveredSignalIds,
      latestSignalId,
      completedInvestigationActions: seedCompletedInvestigationActions(completedInvestigationActions, discoveredSignalIds),
      diary: diary.slice(0, MAX_PERSISTED_DIARY_ENTRIES).map((entry) => ({
        ...entry,
        timestamp: entry.timestamp.toISOString(),
      })),
    };

    try {
      window.localStorage.setItem(OBSERVER_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Local memory is a progressive enhancement; the live observer state should keep running without it.
    }
  }, [canPersistObserverMemory, completedInvestigationActions, diary, discoveredSignalIds, latestSignalId]);

  const toggleTemporalView = useCallback(() => {
    setIsPastMode(prev => {
      const next = !prev;
      if (next) {
        setWorld(pastWorldData as WorldState);
        setWeather(pastWorldData.weather as WeatherState);
        setSelectedDistrictId(archiveDistricts[0].id);
        addAlert("TEMPORAL SHIFT DETECTED: Accessing Year 01 Archive", "warning");
        addDiaryEntry("Temporal anomaly triggered. System recalibrating to Foundation Era data.", "secret");
      } else {
        setWorld(worldData);
        setWeather(worldData.weather);
        setSelectedDistrictId(presentDistricts[0].id);
        addAlert("TEMPORAL STABILIZED: Returning to Present", "info");
      }
      playUISound('click');
      return next;
    });
  }, [addAlert, addDiaryEntry, playUISound]);

  // Migration Engine: Randomly shift population and productivity
  useEffect(() => {
    const migrationTimer = setInterval(() => {
      setDistricts(prev => {
        const nextDistricts = [...prev];
        const sourceIdx = Math.floor(Math.random() * nextDistricts.length);
        let targetIdx = Math.floor(Math.random() * nextDistricts.length);
        while (targetIdx === sourceIdx) {
          targetIdx = Math.floor(Math.random() * nextDistricts.length);
        }

        const source = { ...nextDistricts[sourceIdx] };
        const target = { ...nextDistricts[targetIdx] };

        // Population shift (commute simulation)
        const popShift = Math.floor(source.population * (0.01 + Math.random() * 0.02));
        source.population -= popShift;
        target.population += popShift;

        // Productivity flux
        const prodShift = (Math.random() - 0.5) * 5;
        source.social_metrics = { 
          ...source.social_metrics, 
          productivity: Math.max(50, Math.min(100, source.social_metrics.productivity + prodShift))
        };
        target.social_metrics = { 
          ...target.social_metrics, 
          productivity: Math.max(50, Math.min(100, target.social_metrics.productivity - prodShift))
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
  }, [addDiaryEntry]);

  // Active Directive Simulation
  useEffect(() => {
    const directiveTimer = setInterval(() => {
      const directives = worldData.active_directives;
      const nextDirective = directives[Math.floor(Math.random() * directives.length)];
      
      setActiveDirective(current => {
        if (current !== nextDirective) {
          addAlert(`NEW DIRECTIVE ISSUED: ${nextDirective}`, "info");
          addDiaryEntry(`Governance Update: High Council issued directive "${nextDirective}".`, "system");
        }
        return nextDirective;
      });
    }, 45000);

    return () => clearInterval(directiveTimer);
  }, [addAlert, addDiaryEntry]);

  // Ecology Engine: Weather-Energy-Economy Dynamics
  useEffect(() => {
    const ecologyTimer = setInterval(() => {
      setWorld(prev => {
        const isStorm = weather.current_condition.toLowerCase().includes('storm') || 
                        weather.current_condition.toLowerCase().includes('ion');
        
        let energyChange = 0;
        let economyTrend: string;
        let tradeVolumeChange: number;

        if (isStorm) {
          // Storms drain energy and crash markets
          energyChange = -(Math.random() * 2);
          economyTrend = 'Bearish';
          tradeVolumeChange = -(Math.random() * 50000);
        } else {
          // Normal weather allows slow recovery and steady markets
          if (prev.global_stats.energy_index < 98.5) {
            energyChange = Math.random() * 0.5;
          }
          economyTrend = Math.random() > 0.5 ? 'Bullish' : 'Stable';
          tradeVolumeChange = Math.random() * 20000;
        }

        const nextEnergy = Math.max(70, Math.min(100, prev.global_stats.energy_index + energyChange));
        const nextVolume = Math.max(500000, Math.min(2000000, (prev.economy?.trade_volume || 1250000) + tradeVolumeChange));
        
        // Critical alerts
        if (nextEnergy < 85 && prev.global_stats.energy_index >= 85) {
          addAlert("CRITICAL ENERGY DROP: Gravity Cores under-performing", "critical");
          addDiaryEntry("Critical System Failure: Energy levels dropped below safety threshold.", "system");
        }

        return {
          ...prev,
          global_stats: {
            ...prev.global_stats,
            energy_index: Number(nextEnergy.toFixed(1))
          },
          economy: {
            ...prev.economy,
            currency: 'Aether-Credits',
            market_trend: economyTrend,
            trade_volume: Math.floor(nextVolume)
          }
        };
      });
    }, 5000);

    return () => clearInterval(ecologyTimer);
  }, [weather, addAlert, addDiaryEntry]);

  // Random event simulator
  useEffect(() => {
    const events: Array<{ condition: string; type: AlertType; weather: string }> = [
      { condition: "Ion Storm Incoming", type: "warning", weather: "Heavy Ion Storm" },
      { condition: "Traffic Congestion", type: "info", weather: "Clear Sky with Ion Clouds" },
      { condition: "Gravity Core Flux", type: "critical", weather: "Static Cloud Cover" },
      { condition: "Clear Skies", type: "info", weather: "Perfectly Clear" }
    ];

    const interval = setInterval(() => {
      if (Math.random() > 0.8) {
        const event = events[Math.floor(Math.random() * events.length)];
        addAlert(event.condition, event.type);
        
        // Update actual weather state
        if (event.weather) {
          setWeather(prev => ({ ...prev, current_condition: event.weather }));
        }
        
        if (event.type === 'critical' || event.type === 'warning') {
          addDiaryEntry(`Weather Shift: ${event.weather}. Observer warned of atmospheric volatility.`, 'system');
        }
      }
    }, 20000);

    return () => clearInterval(interval);
  }, [addAlert, addDiaryEntry]);

  return (
    <CityContext.Provider value={{ 
      currentTime, 
      selectedDistrict, 
      districts,
      currentDistricts,
      activeDirective,
      weather, 
      alerts, 
      diary,
      isDay,
      setDistrict,
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
      investigationState,
      terminalCommandRequest,
      diaryReviewRequest,
      focusSignal,
      completeInvestigationAction,
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

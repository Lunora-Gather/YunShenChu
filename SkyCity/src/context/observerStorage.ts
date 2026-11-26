import { mergeWatch, validWatch } from '../data/nightWatch';
import type { WatchBook } from '../data/nightWatch';
import { getSignalById } from '../data/signals';
import { DEPARTURE_CHOICES, getCaseFile, hasFiledAllFindings, REPORT_ACTION_ID } from '../data/caseFiles';
import type { DepartureDecision } from '../data/caseFiles';

export const OBSERVER_STORAGE_VERSION = 5;
export const OBSERVER_STORAGE_KEY = 'yunshenchu.observer.v4';
export const REPLAY_STORAGE_KEY = 'yunshenchu.observer.replay.v4';
const LEGACY_OBSERVER_STORAGE_KEYS = ['yunshenchu.observer.v3', 'yunshenchu.observer.v2'];
const OBSERVER_BACKUP_FORMAT = 'yunshenchu.observer-backup';
const OBSERVER_BACKUP_VERSION = 1;
export const MAX_OBSERVER_BACKUP_BYTES = 256 * 1024;
export const MAX_SESSION_DIARY_ENTRIES = 80;
export const MAX_PERSISTED_DIARY_ENTRIES = 48;

export interface DiaryEntry {
  id: string;
  timestamp: Date;
  type: 'visit' | 'discovery' | 'system' | 'secret';
  location?: string;
  message: string;
}

interface PersistedDiaryEntry extends Omit<DiaryEntry, 'timestamp'> {
  timestamp: string;
}

export interface ObserverStorageState {
  nightWatch?: WatchBook;
  schemaVersion: number;
  discoveredSignalIds: string[];
  latestSignalId: string | null;
  diary: DiaryEntry[];
  completedInvestigationActions: Record<string, string[]>;
  departureDecision: DepartureDecision | null;
}

type ObserverSlot = 'original' | 'replay';

export interface ObserverBackup {
  source: ObserverSlot | 'legacy';
  progress: ObserverStorageState;
}

type ObserverBackupResult =
  | { backup: ObserverBackup }
  | { error: string };

export type ObserverRestoreResult =
  | { saved: true; keptEnding: boolean }
  | { saved: false; message: string };

const emptyObserverStorage: ObserverStorageState = {
  schemaVersion: OBSERVER_STORAGE_VERSION,
  discoveredSignalIds: [],
  latestSignalId: null,
  diary: [],
  completedInvestigationActions: {},
  departureDecision: null,
};

const isDiaryType = (value: unknown): value is DiaryEntry['type'] => (
  value === 'visit' || value === 'discovery' || value === 'system' || value === 'secret'
);

const normalizeSignalIds = (value: unknown) => {
  if (!Array.isArray(value)) return [];

  return Array.from(new Set(value))
    .filter((id): id is string => typeof id === 'string' && Boolean(getSignalById(id)));
};

const normalizeCompletedInvestigationActions = (value: unknown, acceptsFindings: boolean) => {
  if (!value || typeof value !== 'object') return {};

  return Object.entries(value as Record<string, unknown>).reduce<Record<string, string[]>>((normalized, [signalId, actionIds]) => {
    const signal = getSignalById(signalId);
    if (!signal || !Array.isArray(actionIds)) return normalized;

    const validActionIds = new Set(signal.investigation.actions.map((action) => action.id));
    const uniqueActionIds = Array.from(new Set(actionIds))
      .filter((actionId): actionId is string => typeof actionId === 'string' && validActionIds.has(actionId));

    const hasAllRecords = getCaseFile(signalId)?.records.every(({ actionId }) => uniqueActionIds.includes(actionId));
    normalized[signal.id] = acceptsFindings && hasAllRecords ? uniqueActionIds : uniqueActionIds.filter((id) => id !== REPORT_ACTION_ID);

    return normalized;
  }, {});
};

const parseDepartureDecision = (value: unknown): DepartureDecision | null => {
  if (!value || typeof value !== 'object') return null;
  const { choice, recordedAt } = value as Partial<DepartureDecision>;
  if (typeof choice !== 'string' || !Object.hasOwn(DEPARTURE_CHOICES, choice) || typeof recordedAt !== 'number' || !Number.isSafeInteger(recordedAt) || recordedAt <= 0) {
    return null;
  }
  return { choice, recordedAt };
};

const seedCompletedInvestigationActions = (
  completedActionIds: Record<string, string[]>,
  discoveredSignalIds: string[],
) => Object.fromEntries(discoveredSignalIds.map((id) => [id, completedActionIds[id] ?? []]));

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

export const parseObserverStorage = (rawStorage: string | null): ObserverStorageState | null => {
  if (!rawStorage) return null;

  try {
    const parsed = JSON.parse(rawStorage) as Partial<{
      nightWatch: unknown;
      schemaVersion: unknown;
      discoveredSignalIds: unknown;
      latestSignalId: unknown;
      diary: unknown;
      completedInvestigationActions: unknown;
      departureDecision: unknown;
    }>;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;

    const schemaVersion = typeof parsed.schemaVersion === 'number' ? parsed.schemaVersion : 2;
    if (schemaVersion <= OBSERVER_STORAGE_VERSION && !Array.isArray(parsed.discoveredSignalIds)) return null;
    const nightWatch = validWatch(parsed.nightWatch) ? parsed.nightWatch : undefined;
    if (schemaVersion === OBSERVER_STORAGE_VERSION && parsed.nightWatch !== undefined && !nightWatch) return null;
    const discoveredSignalIds = normalizeSignalIds(parsed.discoveredSignalIds);
    const latestSignalId = typeof parsed.latestSignalId === 'string' && discoveredSignalIds.includes(parsed.latestSignalId)
      ? parsed.latestSignalId
      : discoveredSignalIds[0] ?? null;
    const diary = Array.isArray(parsed.diary)
      ? Array.from(new Map<string, DiaryEntry>(parsed.diary
        .map(parseDiaryEntry)
        .filter((entry): entry is DiaryEntry => Boolean(entry))
        .map((entry) => [entry.id, entry])).values()).slice(0, MAX_PERSISTED_DIARY_ENTRIES)
      : [];

    const completedInvestigationActions = seedCompletedInvestigationActions(
      normalizeCompletedInvestigationActions(parsed.completedInvestigationActions, schemaVersion >= 4),
      discoveredSignalIds,
    );
    return {
      ...(nightWatch && { nightWatch }),
      schemaVersion,
      discoveredSignalIds,
      latestSignalId,
      diary,
      completedInvestigationActions,
      departureDecision: hasFiledAllFindings(completedInvestigationActions) ? parseDepartureDecision(parsed.departureDecision) : null,
    };
  } catch {
    return null;
  }
};

type SlotStorage = Pick<Storage, 'getItem' | 'setItem'> & Partial<Pick<Storage, 'removeItem'>>;

export function readObserverSlot(storage: Pick<Storage, 'getItem'>, key: string) {
  const raw = storage.getItem(key);
  const primary = parseObserverStorage(raw);
  const damaged = raw !== null && !primary;
  const progress = damaged ? parseObserverStorage(storage.getItem(key + '.recovery')) : primary;
  return { raw, progress, damaged };
}

export function writeObserverSlot(storage: SlotStorage, key: string, slot: ReturnType<typeof readObserverSlot>,
  progress: ObserverStorageState, explicitRestore = false) {
  if (slot.progress && slot.progress.schemaVersion > OBSERVER_STORAGE_VERSION) throw new Error('Newer save version');
  if (slot.damaged && !slot.progress && !explicitRestore) throw new Error('Unreadable save');
  const payload = serializeObserverStorage(progress);
  const recoveryKey = key + '.recovery';
  if (slot.damaged && slot.raw !== null) storage.setItem(key + '.damaged', slot.raw);
  if (payload !== slot.raw) {
    try {
      storage.setItem(key, payload);
    } catch (error) {
      // A redundant copy must never take the last space needed for the actual save.
      if (!(error instanceof DOMException && error.name === 'QuotaExceededError')
        || !storage.removeItem || slot.damaged || !slot.raw || storage.getItem(recoveryKey) !== slot.raw) throw error;
      storage.removeItem(recoveryKey);
      try {
        storage.setItem(key, payload);
      } catch (retryError) {
        try { storage.setItem(recoveryKey, slot.raw); } catch { /* The primary still holds the original. */ }
        throw retryError;
      }
    }
  }
  try {
    if (storage.getItem(recoveryKey) !== payload) storage.setItem(recoveryKey, payload);
  } catch { /* Saving the primary succeeded even if the optional copy does not fit. */ }
}

export const readObserverStorage = (storageKey = OBSERVER_STORAGE_KEY): ObserverStorageState => {
  if (typeof window === 'undefined') return emptyObserverStorage;

  try {
    const storage = window.localStorage;
    const currentStorage = readObserverSlot(storage, storageKey).progress;
    if (currentStorage) return currentStorage;
    if (storageKey !== OBSERVER_STORAGE_KEY) return emptyObserverStorage;

    for (const legacyKey of LEGACY_OBSERVER_STORAGE_KEYS) {
      const legacyStorage = parseObserverStorage(storage.getItem(legacyKey));
      if (legacyStorage) return legacyStorage;
    }
  } catch {
    return emptyObserverStorage;
  }

  return emptyObserverStorage;
};

export const canUseObserverStorage = (storageKey = OBSERVER_STORAGE_KEY) => {
  if (typeof window === 'undefined') return false;

  try {
    window.localStorage.getItem(storageKey);
    return true;
  } catch {
    return false;
  }
};

const appendNew = (current: string[], incoming: string[]) => {
  const additions = incoming.filter((item) => !current.includes(item));
  return additions.length ? [...current, ...additions] : current;
};

export const mergeObserverDiary = (local: DiaryEntry[], stored: DiaryEntry[]) => {
  const localEntryIds = new Set(local.map(({ id }) => id));
  const newEntries = stored.filter(({ id }) => !localEntryIds.has(id));
  if (!newEntries.length) return local;

  const merged = [...local, ...newEntries]
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime() || b.id.localeCompare(a.id))
    .slice(0, MAX_SESSION_DIARY_ENTRIES);
  return merged.length === local.length && merged.every((entry, index) => entry.id === local[index].id)
    ? local
    : merged;
};

export const mergeObserverProgress = (local: ObserverStorageState, stored: ObserverStorageState): ObserverStorageState => {
  const discoveredSignalIds = appendNew(local.discoveredSignalIds, stored.discoveredSignalIds);
  let completedInvestigationActions = local.completedInvestigationActions;

  for (const id of discoveredSignalIds) {
    const localActions = local.completedInvestigationActions[id] ?? [];
    const actions = appendNew(localActions, stored.completedInvestigationActions[id] ?? []);
    if (actions === local.completedInvestigationActions[id]) continue;

    if (completedInvestigationActions === local.completedInvestigationActions) {
      completedInvestigationActions = { ...completedInvestigationActions };
    }
    completedInvestigationActions[id] = actions;
  }

  let departureDecision = local.departureDecision;
  const incoming = stored.departureDecision;
  if (incoming && (!departureDecision || incoming.recordedAt < departureDecision.recordedAt
    || (incoming.recordedAt === departureDecision.recordedAt && incoming.choice < departureDecision.choice))) {
    departureDecision = incoming;
  }

  const nightWatch = mergeWatch(local.nightWatch, stored.nightWatch);
  return { ...local, ...(nightWatch && { nightWatch }), discoveredSignalIds, completedInvestigationActions, departureDecision, diary: mergeObserverDiary(local.diary, stored.diary) };
};

export const serializeObserverStorage = (storage: ObserverStorageState) => JSON.stringify({
  ...storage,
  schemaVersion: OBSERVER_STORAGE_VERSION,
  diary: storage.diary.slice(0, MAX_PERSISTED_DIARY_ENTRIES).map((entry) => ({
    ...entry,
    timestamp: entry.timestamp.toISOString(),
  })),
});

export const createObserverBackup = (progress: ObserverStorageState, storageKey: string) => JSON.stringify({
  format: OBSERVER_BACKUP_FORMAT,
  version: OBSERVER_BACKUP_VERSION,
  source: storageKey === REPLAY_STORAGE_KEY ? 'replay' : 'original',
  progress: JSON.parse(serializeObserverStorage(progress)) as unknown,
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isStringList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

export function parseObserverBackup(text: string): ObserverBackupResult {
  if (new Blob([text]).size > MAX_OBSERVER_BACKUP_BYTES) {
    return { error: '备份文件超过 256 KB 上限。' };
  }

  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { error: '文件无法解析为 JSON 备份。' };
  }
  if (!isRecord(value)) return { error: '请选择《云深处》的调查备份。' };

  let source: ObserverBackup['source'] = 'legacy';
  if (value.format === OBSERVER_BACKUP_FORMAT) {
    if (value.version !== OBSERVER_BACKUP_VERSION) return { error: '当前版本无法读取这种备份格式。' };
    if ((value.source !== 'original' && value.source !== 'replay') || !isRecord(value.progress)) {
      return { error: '调查备份缺少必要记录。' };
    }
    source = value.source;
    value = value.progress;
  }

  if (!isRecord(value)) return { error: '请选择《云深处》的调查备份。' };
  const { schemaVersion, discoveredSignalIds, latestSignalId, diary, completedInvestigationActions, departureDecision } = value;
  if (typeof schemaVersion !== 'number' || !Number.isSafeInteger(schemaVersion) || schemaVersion < 2
    || !isStringList(discoveredSignalIds)) {
    return { error: '文件中找不到可识别的调查记录。' };
  }
  if (schemaVersion > OBSERVER_STORAGE_VERSION) return { error: '这份调查来自较新的游戏版本。' };
  if ((latestSignalId != null && (typeof latestSignalId !== 'string' || !discoveredSignalIds.includes(latestSignalId)))
    || (diary !== undefined && (!Array.isArray(diary) || diary.some((entry) => !parseDiaryEntry(entry))))
    || (completedInvestigationActions !== undefined && (!isRecord(completedInvestigationActions)
      || Object.values(completedInvestigationActions).some((ids) => !isStringList(ids))))) {
    return { error: '备份中的案卷或日记记录格式有误。' };
  }

  if (value.nightWatch !== undefined && !validWatch(value.nightWatch)) return { error: '巡查簿记录不完整。' };
  const progress = parseObserverStorage(JSON.stringify(value));
  if (!progress) return { error: '调查备份缺少必要记录。' };
  if (schemaVersion >= 4 && (
    progress.discoveredSignalIds.length !== discoveredSignalIds.length
    || (Array.isArray(diary) && progress.diary.length !== diary.length)
    || (completedInvestigationActions && Object.entries(completedInvestigationActions).some(
      ([id, actions]) => progress.completedInvestigationActions[id]?.length !== (actions as string[]).length,
    ))
    || (departureDecision != null && !progress.departureDecision)
  )) {
    return { error: '备份含有未知记录，或结局资料不完整。' };
  }
  return { backup: { source, progress } };
}

type RestoreTransaction =
  | { progress: ObserverStorageState; keptEnding: boolean }
  | { error: string };

export function restoreObserverStorage(
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  storageKey: string,
  local: ObserverStorageState,
  backup: ObserverBackup,
): RestoreTransaction {
  try {
    const slot = readObserverSlot(storage, storageKey);
    const stored = slot.progress;
    if (stored && stored.schemaVersion > OBSERVER_STORAGE_VERSION) {
      return { error: '这个存档来自较新的版本，已保留原有记录。' };
    }
    const current = stored ? mergeObserverProgress(local, stored) : local;
    const incoming = mergeObserverProgress(current, backup.progress);
    const progress = {
      ...incoming,
      latestSignalId: current.latestSignalId ?? stored?.latestSignalId ?? backup.progress.latestSignalId,
      departureDecision: current.departureDecision ?? incoming.departureDecision,
    };
    if (new Blob([createObserverBackup(progress, storageKey)]).size > MAX_OBSERVER_BACKUP_BYTES) {
      return { error: '合并后的调查超过 256 KB 存档上限。' };
    }
    writeObserverSlot(storage, storageKey, slot, progress, true);
    const keptEnding = Boolean(current.departureDecision && backup.progress.departureDecision
      && current.departureDecision.choice !== backup.progress.departureDecision.choice);
    return { progress, keptEnding };
  } catch {
    return { error: '浏览器无法写入备份。请检查可用的存储空间后重试。' };
  }
}

export function withObserverStorageLock<T>(storageKey: string, operation: () => T): Promise<T> {
  let started = false;
  const run = () => {
    started = true;
    return operation();
  };
  return Promise.resolve().then(() => {
    const locks = typeof navigator === 'undefined' ? undefined : navigator.locks;
    return locks ? locks.request(storageKey, run) : run();
  }).catch((error: unknown) => {
    if (started) throw error;
    return run();
  });
}

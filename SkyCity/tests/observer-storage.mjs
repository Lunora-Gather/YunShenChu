import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const entry = fileURLToPath(new URL('../src/context/observerStorage.ts', import.meta.url));
const bundle = await build({
  configFile: false,
  logLevel: 'silent',
  build: { write: false, lib: { entry, formats: ['es'] } },
});
const source = bundle[0].output.find(({ type }) => type === 'chunk').code;
const {
  createObserverBackup,
  MAX_OBSERVER_BACKUP_BYTES,
  OBSERVER_STORAGE_KEY,
  parseObserverBackup,
  readObserverSlot,
  writeObserverSlot,
  parseObserverStorage,
  REPLAY_STORAGE_KEY,
  restoreObserverStorage,
  serializeObserverStorage,
  withObserverStorageLock,
} = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

const allFindings = {
  guixu: ['inspect-foundation', 'trace-guixu', 'review-camera', 'file-finding'],
  'abyss-whale': ['inspect-foundation', 'trace-abyss', 'review-citizens', 'file-finding'],
  'ghost-rail': ['inspect-apex', 'trace-ghost-rail', 'review-archive', 'file-finding'],
  'core-heartbeat': ['inspect-mid-ring', 'trace-core', 'review-systems', 'file-finding'],
  'observer-return': ['trace-observer', 'review-memory', 'review-diary', 'file-finding'],
};

const state = (completedInvestigationActions = {}, departureDecision = null, diary = []) => ({
  schemaVersion: 5,
  discoveredSignalIds: Object.keys(completedInvestigationActions),
  latestSignalId: Object.keys(completedInvestigationActions)[0] ?? null,
  completedInvestigationActions,
  departureDecision,
  diary,
});

const memoryStorage = (initial = {}, failOnWrite = false) => {
  const contents = new Map(Object.entries(initial));
  return {
    getItem: (key) => contents.get(key) ?? null,
    setItem(key, value) {
      if (failOnWrite) throw new DOMException('Quota reached', 'QuotaExceededError');
      contents.set(key, value);
    },
  };
};

const parseBackup = (text) => {
  const result = parseObserverBackup(text);
  assert.equal('error' in result, false, result.error);
  return result.backup;
};

describe('observer backups', () => {
  it('round-trips the ending, focus, field records and diary with the originating slot', () => {
    const original = state(allFindings, { choice: 'hold', recordedAt: 456 }, [{
      id: 'entry-q17',
      timestamp: new Date('2026-11-25T10:00:00Z'),
      location: 'foundation',
      message: 'A receipt arrived.',
      type: 'secret',
    }]);
    for (const [key, sourceSlot] of [[OBSERVER_STORAGE_KEY, 'original'], [REPLAY_STORAGE_KEY, 'replay']]) {
      const backup = parseBackup(createObserverBackup(original, key));
      assert.equal(backup.source, sourceSlot);
      assert.deepEqual(backup.progress, original);
    }
  });

  it('includes an in-flight watch in backups and merges concurrent samples without changing the main cases', () => {
    const current = { ...state(), nightWatch: { number: 1, open: true, samples: 1, backlog: [0,0,0], works: [0,0,0], history: [], stamps: [0,0,0], pledge: 0 } };
    const incoming = { ...state(), nightWatch: { ...current.nightWatch, samples: 4 } };
    const storage = memoryStorage();
    const backup = parseBackup(createObserverBackup(incoming, REPLAY_STORAGE_KEY));
    const restored = restoreObserverStorage(storage, OBSERVER_STORAGE_KEY, current, backup);
    assert.equal(restored.progress.nightWatch.samples, 5);
    assert.deepEqual(restored.progress.discoveredSignalIds, []);
    assert.equal(storage.getItem(REPLAY_STORAGE_KEY), null);
    const damaged = { ...incoming, nightWatch: { ...incoming.nightWatch, samples: 8 } };
    assert.match(parseObserverBackup(createObserverBackup(damaged, OBSERVER_STORAGE_KEY)).error, /巡查簿/);
  });

  it('carries an accepted waybill and selected carrier through a backup restore into the other slot', () => {
    const parcel = { site: 1, trip: 1, start: 1, permit: 'hold' };
    const book = { number: 2, open: true, samples: 1, backlog: [0, 0, 0], works: [0, 0, 1],
      history: [{ number: 1, kind: 6, samples: 3, prior: [0, 0, 0], parcel, answer: 0, choice: 0, repaired: 2, level: 1 }],
      pledge: 0, stamps: [0, 0, 0], parcel: { ...parcel, via: 0 } };
    const original = { ...state(allFindings, { choice: 'hold', recordedAt: 321 }), nightWatch: book };
    const backup = parseBackup(createObserverBackup(original, OBSERVER_STORAGE_KEY));
    const storage = memoryStorage({ [OBSERVER_STORAGE_KEY]: serializeObserverStorage(original) });
    const restored = restoreObserverStorage(storage, REPLAY_STORAGE_KEY, state(), backup);
    assert.deepEqual(restored.progress.nightWatch, book);
    const clean = storage.getItem(REPLAY_STORAGE_KEY);
    storage.setItem(REPLAY_STORAGE_KEY, clean.replace('"via":0', '"via":8'));
    const slot = readObserverSlot(storage, REPLAY_STORAGE_KEY);
    assert(slot.damaged);
    assert.deepEqual(slot.progress.nightWatch, book);
    assert.equal(storage.getItem(OBSERVER_STORAGE_KEY), serializeObserverStorage(original));
  });

  it('migrates v2 signals and v3 records through the shared legacy normalization', () => {
    const v2 = parseBackup(JSON.stringify({ schemaVersion: 2, discoveredSignalIds: ['guixu', 'unknown'] }));
    assert.deepEqual(v2.progress.discoveredSignalIds, ['guixu']);
    const v3 = parseBackup(JSON.stringify({
      schemaVersion: 3,
      discoveredSignalIds: ['guixu'],
      completedInvestigationActions: { guixu: allFindings.guixu },
    }));
    assert.deepEqual(v3.progress.completedInvestigationActions.guixu, allFindings.guixu.slice(0, 3));
    const storage = memoryStorage();
    const restored = restoreObserverStorage(storage, OBSERVER_STORAGE_KEY, state(), v3);
    assert.equal('error' in restored, false, restored.error);
    const loaded = parseObserverStorage(storage.getItem(OBSERVER_STORAGE_KEY));
    assert.equal(loaded.schemaVersion, 5);
    assert.deepEqual(loaded.completedInvestigationActions, v3.progress.completedInvestigationActions);
  });

  it('rejects malformed files, invalid progress, newer schemas and oversized files', () => {
    const invalidFiles = [
      ['{', /JSON/],
      ['{"chat":"other format"}', /可识别/],
      ['{"format":"yunshenchu.observer-backup","version":2}', /备份格式/],
      ['{"schemaVersion":99,"discoveredSignalIds":[]}', /较新/],
      [JSON.stringify({ ...state(), completedInvestigationActions: { guixu: ['file-finding'] } }), /未知/],
      [JSON.stringify({ ...state(), departureDecision: { choice: 'clear', recordedAt: 100 } }), /结局资料不完整/],
      [JSON.stringify({ ...state(), diary: [{ id: 6 }] }), /格式有误/],
      [' '.repeat(MAX_OBSERVER_BACKUP_BYTES + 1), /上限/],
    ];
    for (const [raw, message] of invalidFiles) assert.match(parseObserverBackup(raw).error, message);
  });
});

describe('automatic save recovery', () => {
  const key = OBSERVER_STORAGE_KEY;
  const original = state({ guixu: ['inspect-foundation'] });
  const write = (storage, progress) => writeObserverSlot(storage, key, readObserverSlot(storage, key), progress);

  it('recovers the most recent healthy snapshot in its own slot and keeps the damaged bytes', () => {
    const storage = memoryStorage();
    write(storage, original);
    storage.setItem(key, '{truncated');
    const slot = readObserverSlot(storage, key);
    assert.equal(slot.damaged, true);
    assert.deepEqual(slot.progress, original);
    write(storage, slot.progress);
    assert.equal(storage.getItem(key + '.damaged'), '{truncated');
    assert.deepEqual(readObserverSlot(storage, key).progress, original);
    assert.equal(readObserverSlot(storage, REPLAY_STORAGE_KEY).progress, null);
    assert.equal(readObserverSlot(memoryStorage({ [key + '.recovery']: storage.getItem(key) }), key).progress, null);
  });

  it('protects an unreadable slot until an explicit restore, and respects future recovery versions', () => {
    const storage = memoryStorage({ [key]: '{"unrelated":true}' });
    assert.throws(() => write(storage, state()), /Unreadable/);
    assert.equal(storage.getItem(key), '{"unrelated":true}');
    const backup = parseBackup(createObserverBackup(original, key));
    assert.deepEqual(restoreObserverStorage(storage, key, state(), backup).progress, original);
    assert.equal(storage.getItem(key + '.damaged'), '{"unrelated":true}');
    storage.setItem(key, '{');
    storage.setItem(key + '.recovery', '{"schemaVersion":99}');
    assert.match(restoreObserverStorage(storage, key, state(), backup).error, /较新/);
    assert.throws(() => write(storage, state()), /Newer/);
    assert.equal(storage.getItem(key), '{');
  });

  it('gives available space to the primary save when only one copy fits', () => {
    const initial = serializeObserverStorage(state());
    const contents = new Map([[key, initial], [key + '.recovery', initial]]);
    const limit = Math.max(initial.length * 2, serializeObserverStorage(original).length);
    const storage = {
      getItem: k => contents.get(k) ?? null,
      removeItem: k => contents.delete(k),
      setItem(k, v) {
        const others = [...contents].reduce((bytes, [id, data]) => bytes + (id === k ? 0 : data.length), 0);
        if (others + v.length > limit) throw new DOMException('Full', 'QuotaExceededError');
        contents.set(k, v);
      },
    };
    write(storage, original);
    assert.deepEqual(readObserverSlot(storage, key).progress, original);
    assert.equal(storage.getItem(key + '.recovery'), null);
  });
});

describe('observer backup restoration', () => {
  it('combines live, persisted and imported progress in the selected slot', () => {
    const original = serializeObserverStorage(state({ 'observer-return': ['trace-observer'] }));
    const storage = memoryStorage({
      [OBSERVER_STORAGE_KEY]: original,
      [REPLAY_STORAGE_KEY]: serializeObserverStorage(state({ guixu: ['trace-guixu'] })),
    });
    const backup = parseBackup(createObserverBackup(state({ 'ghost-rail': ['inspect-apex'] }), OBSERVER_STORAGE_KEY));
    const local = state({ guixu: ['inspect-foundation'] });
    const result = restoreObserverStorage(storage, REPLAY_STORAGE_KEY, local, backup);
    assert.equal('error' in result, false, result.error);
    assert.deepEqual(result.progress.completedInvestigationActions, {
      guixu: ['inspect-foundation', 'trace-guixu'],
      'ghost-rail': ['inspect-apex'],
    });
    assert.equal(storage.getItem(OBSERVER_STORAGE_KEY), original);
    assert.deepEqual(parseObserverStorage(storage.getItem(REPLAY_STORAGE_KEY)), result.progress);
  });

  it('keeps the established ending when the backup carries a different one', () => {
    const original = state(allFindings, { choice: 'hold', recordedAt: 456 });
    const storage = memoryStorage({ [OBSERVER_STORAGE_KEY]: serializeObserverStorage(original) });
    const alternative = state(allFindings, { choice: 'clear', recordedAt: 123 });
    const backup = parseBackup(createObserverBackup(alternative, REPLAY_STORAGE_KEY));
    const result = restoreObserverStorage(storage, OBSERVER_STORAGE_KEY, state(), backup);
    assert.equal('error' in result, false, result.error);
    assert.equal(result.keptEnding, true);
    assert.deepEqual(result.progress.departureDecision, original.departureDecision);
    assert.deepEqual(parseObserverStorage(storage.getItem(OBSERVER_STORAGE_KEY)).departureDecision, original.departureDecision);
  });

  it('keeps stored bytes intact on quota errors and when a newer slot is present', () => {
    const original = serializeObserverStorage(state({ guixu: ['trace-guixu'] }));
    const future = '{"schemaVersion":99,"futureField":"preserved"}';
    const backup = parseBackup(createObserverBackup(state({ 'ghost-rail': ['inspect-apex'] }), REPLAY_STORAGE_KEY));
    const quota = memoryStorage({ [OBSERVER_STORAGE_KEY]: original }, true);
    assert.match(restoreObserverStorage(quota, OBSERVER_STORAGE_KEY, state(), backup).error, /无法写入/);
    assert.equal(quota.getItem(OBSERVER_STORAGE_KEY), original);
    const protectedStorage = memoryStorage({ [OBSERVER_STORAGE_KEY]: future });
    assert.match(restoreObserverStorage(protectedStorage, OBSERVER_STORAGE_KEY, state(), backup).error, /保留原有记录/);
    assert.equal(protectedStorage.getItem(OBSERVER_STORAGE_KEY), future);
  });

  it('uses the slot lock and only retries when the lock itself was unavailable', async () => {
    const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    const setLocks = (request) => Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { locks: { request } },
    });
    let ran = 0;
    try {
      setLocks(async (key) => {
        assert.equal(key, REPLAY_STORAGE_KEY);
        throw new DOMException('Lock unavailable', 'SecurityError');
      });
      assert.equal(await withObserverStorageLock(REPLAY_STORAGE_KEY, () => ++ran), 1);

      setLocks(async (key, perform) => {
        assert.equal(key, OBSERVER_STORAGE_KEY);
        return perform();
      });
      await assert.rejects(withObserverStorageLock(OBSERVER_STORAGE_KEY, () => {
        ran += 1;
        throw new Error('Save unavailable after lock acquired');
      }), /Save unavailable/);
      assert.equal(ran, 2);
    } finally {
      if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator);
      else delete globalThis.navigator;
    }
  });
});

import { getCaseFile } from './caseFiles';

export const MANIFEST_FIELDS = [
  {
    id: 'position', label: '登车坐标', caseName: '归墟', caseId: 'guixu',
    prompt: '导航网格重启以后，独立测距仪仍在哪个位置收到回波？',
    options: ['register-limit', 'range-second', 'range-wind'],
    answer: 'range-second', entry: 'x −112 / y +288 · 4,472 m',
    direction: '查看重启后的测距记录。航道下限标示的是通行许可范围。',
  },
  {
    id: 'authority', label: '发车许可', caseName: '幽灵轨道', caseId: 'ghost-rail',
    prompt: '列车通过道岔时，谁的许可在这一分钟内有效？',
    options: ['rail-maintenance', 'transit-public', 'rail-permit'],
    answer: 'rail-permit', entry: '零号月台 · A9-NULL · 议会档案室',
    direction: '联锁装置记录了钥匙 A9-NULL。去档案登记中找对应的许可。',
  },
  {
    id: 'cue', label: '发车信号', caseName: '云下合唱', caseId: 'abyss-whale',
    prompt: '格栅下方的值班员，该凭什么认出再次传来的整组波峰？',
    options: ['pressure-match', 'pressure-upper', 'fan-toggle'],
    answer: 'pressure-match', entry: '格栅下方五个波峰 · 间隔 8.20 秒',
    direction: '首个波峰帮助定位来源。认出整组信号，还需要波峰的重复间隔。',
  },
  {
    id: 'connection', label: '重力总线连接', caseName: '核心心跳', caseId: 'core-heartbeat',
    prompt: '观察者的哪项操作真正抵达总线，能够传递发车信号？',
    options: ['core-local', 'core-focus', 'core-demand'],
    answer: 'core-focus', entry: '观察台接入重力总线的实时订阅',
    direction: '刷新本地画面时，电流平稳。看看哪次试验实际发出了指令。',
  },
  {
    id: 'passenger', label: '乘客预约', caseName: '观察者回声', caseId: 'observer-return',
    prompt: '在值班员打开日记之前，接收器先记下了哪张票？',
    options: ['observer-input', 'observer-cache', 'observer-packet'],
    answer: 'observer-packet', entry: 'Q-17 · 当班观察者',
    direction: '比对接收器和日记里的同一票号，找出较早的那一条。',
  },
] as const;

export type ManifestFieldId = typeof MANIFEST_FIELDS[number]['id'];
export type ManifestDraft = Partial<Record<ManifestFieldId, string>>;

export const getManifestReadings = (field: typeof MANIFEST_FIELDS[number]) => {
  const records = getCaseFile(field.caseId)?.records ?? [];
  return field.options.flatMap((id) => {
    const record = records.find(({ readings }) => readings.some((reading) => reading.id === id));
    const reading = record?.readings.find((item) => item.id === id);
    return record && reading ? [{ ...reading, source: record.source, time: record.time }] : [];
  });
};

export const verifyManifest = (draft: ManifestDraft) => (
  MANIFEST_FIELDS.every(({ id, answer }) => draft[id] === answer)
);

const draftKey = (storageKey: string) => `${storageKey}.manifest.v1`;

export function readManifestDraft(storageKey: string): { entries: ManifestDraft; verified: boolean } {
  try {
    const raw = window.sessionStorage.getItem(draftKey(storageKey));
    const value: unknown = raw ? JSON.parse(raw) : null;
    if (!value || typeof value !== 'object' || Array.isArray(value)) return { entries: {}, verified: false };
    const data = value as { entries?: Record<string, unknown>; verified?: unknown };
    const entries: ManifestDraft = {};
    for (const field of MANIFEST_FIELDS) {
      const selected = data.entries?.[field.id];
      if (field.options.some((option) => option === selected) && typeof selected === 'string') entries[field.id] = selected;
    }
    return { entries, verified: data.verified === true && verifyManifest(entries) };
  } catch {
    return { entries: {}, verified: false };
  }
}

export function writeManifestDraft(storageKey: string, entries: ManifestDraft, verified: boolean) {
  try {
    window.sessionStorage.setItem(draftKey(storageKey), JSON.stringify({ entries, verified }));
  } catch {
    // The worksheet also works with in-memory state.
  }
}

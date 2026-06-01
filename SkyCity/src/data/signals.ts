export type SignalSeverity = 'info' | 'warning' | 'critical';

export type SignalMapFocus = 'guixu' | 'ghost-rail' | 'core' | 'observer' | 'abyss';

export interface SignalIntel {
  id: string;
  freq: number;
  title: string;
  origin: string;
  message: string;
  evidence: string;
  districtId?: string;
  severity: SignalSeverity;
  mapFocus: SignalMapFocus;
}

export const SIGNAL_CATALOG: SignalIntel[] = [
  {
    id: 'guixu',
    freq: 104.2,
    title: '归墟 / Missing Island 14',
    origin: 'Deep Scans',
    message: "CRITICAL: The 14th satellite island 'Guixu' is detected in stealth mode.",
    evidence: 'A dashed return appears below the mapped city lattice. The official topology has no island at this altitude.',
    districtId: 'foundation',
    severity: 'critical',
    mapFocus: 'guixu',
  },
  {
    id: 'abyss-whale',
    freq: 88.7,
    title: 'Cloudline Choir',
    origin: 'Under-Cloud Echo',
    message: 'Do not look beneath the clouds, for the wind whales are breathing.',
    evidence: 'Low-frequency pressure waves line up with citizen reports from the thermal vents.',
    districtId: 'foundation',
    severity: 'warning',
    mapFocus: 'abyss',
  },
  {
    id: 'ghost-rail',
    freq: 156.4,
    title: 'Ghost Rail',
    origin: 'Track Sensors',
    message: 'Ghost Rail unnumbered black train moving towards Lingxiao Apex.',
    evidence: 'A black route is visible only during high administrative load. Its stops do not exist in civic transit records.',
    districtId: 'apex',
    severity: 'warning',
    mapFocus: 'ghost-rail',
  },
  {
    id: 'core-heartbeat',
    freq: 132.8,
    title: 'Core Heartbeat',
    origin: 'Gravity Telemetry',
    message: 'The gravity cores pulse in a rhythm closer to biology than machinery.',
    evidence: 'Energy drift repeats at a living cadence. The pulse strengthens when the observer changes districts.',
    districtId: 'mid_ring',
    severity: 'warning',
    mapFocus: 'core',
  },
  {
    id: 'observer-return',
    freq: 210.9,
    title: 'Observer Return',
    origin: 'Unknown Observer',
    message: 'Warning: When you observe YunShenChu, it observes you.',
    evidence: 'The signal mirrors the current session clock with a two-second delay, then corrects itself.',
    severity: 'critical',
    mapFocus: 'observer',
  },
];

export const getSignalById = (id: string) => SIGNAL_CATALOG.find((signal) => signal.id === id) ?? null;

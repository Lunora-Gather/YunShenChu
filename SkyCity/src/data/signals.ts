export type SignalSeverity = 'info' | 'warning' | 'critical';

export type SignalMapFocus = 'guixu' | 'ghost-rail' | 'core' | 'observer' | 'abyss';

export interface SignalIntel {
  id: string;
  freq: number;
  title: string;
  origin: string;
  message: string;
  evidence: string;
  lead: string;
  impact: string;
  containment: string;
  citizenReport: string;
  pressure: number;
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
    lead: 'Compare foundation altitude records against the missing lower lattice returns.',
    impact: 'Foundation navigation maps lose confidence near the lower cloud boundary.',
    containment: 'Keep lower-route cameras in synthetic mode until the island return repeats twice.',
    citizenReport: 'My maintenance tablet briefly showed a fourteenth island below the route grid, then erased it.',
    pressure: 26,
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
    lead: 'Watch foundation vent pressure while the weather layer reads calm.',
    impact: 'Under-cloud pressure adds false wind shear to lower deck forecasts.',
    containment: 'Throttle public weather feeds and keep thermal vents under manual review.',
    citizenReport: 'The vents are humming in a pattern. Everyone on lower shift went quiet at once.',
    pressure: 18,
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
    lead: 'Stress the Apex transit layer and compare route ghosts against council access windows.',
    impact: 'Apex routing confidence drops whenever sealed archive traffic spikes.',
    containment: 'Hold administrative shuttle priority below 82% until the black line fades.',
    citizenReport: 'A platform sign blinked to route zero, but the station log says that line was never built.',
    pressure: 20,
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
    lead: 'Sample core drift immediately after district focus changes.',
    impact: 'Energy recovery becomes less predictable during rapid observer navigation.',
    containment: 'Reduce automatic district switching and pin gravity telemetry to manual cadence.',
    citizenReport: 'The lights dim every time the city map changes focus. It feels timed.',
    pressure: 17,
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
    lead: 'Run terminal trace while the session clock crosses a minute boundary.',
    impact: 'Observer tools begin reporting state before the interface visibly changes.',
    containment: 'Keep terminal trace logs local and avoid exporting session telemetry.',
    citizenReport: 'A public kiosk printed my route before I tapped it. Nobody else saw the prompt.',
    pressure: 24,
    severity: 'critical',
    mapFocus: 'observer',
  },
];

export const getSignalById = (id: string) => SIGNAL_CATALOG.find((signal) => signal.id === id) ?? null;

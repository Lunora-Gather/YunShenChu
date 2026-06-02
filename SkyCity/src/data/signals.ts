export type SignalSeverity = 'info' | 'warning' | 'critical';

export type SignalMapFocus = 'guixu' | 'ghost-rail' | 'core' | 'observer' | 'abyss';

export type InvestigationStage = 'sealed' | 'detected' | 'corroborated' | 'contained';

export type InvestigationActionType = 'camera' | 'terminal' | 'district' | 'citizens' | 'archive' | 'diary';

export interface InvestigationAction {
  id: string;
  type: InvestigationActionType;
  label: string;
  description: string;
  command?: string;
  districtId?: string;
}

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
  investigation: {
    detected: string;
    corroborated: string;
    contained: string;
    actions: InvestigationAction[];
  };
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
    investigation: {
      detected: 'A hidden island return has entered observer memory, but the source is not yet corroborated.',
      corroborated: 'Foundation routing and archive altitude records now agree that the island return is not an interface artifact.',
      contained: 'Guixu remains unresolved, but observer operations have enough evidence to keep lower routes under manual watch.',
      actions: [
        {
          id: 'inspect-foundation',
          type: 'district',
          label: 'Inspect Foundation layer',
          description: 'Switch observer focus to the lower foundation lattice where the return becomes physical.',
          command: 'go foundation',
          districtId: 'foundation',
        },
        {
          id: 'trace-guixu',
          type: 'terminal',
          label: 'Run terminal trace',
          description: 'Trace the Guixu thread from Deep Terminal to compare memory and map focus.',
          command: 'trace guixu',
        },
        {
          id: 'review-camera',
          type: 'camera',
          label: 'Review lower-route camera',
          description: 'Open the synthetic camera feed while Guixu is focused.',
        },
      ],
    },
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
    investigation: {
      detected: 'Pressure waves are audible below cloudline, but public weather still reports calm conditions.',
      corroborated: 'Vent reports and under-cloud telemetry now point to the same low-frequency source.',
      contained: 'Weather output is throttled and the thermal vent layer is flagged for manual review.',
      actions: [
        {
          id: 'inspect-foundation',
          type: 'district',
          label: 'Inspect vent district',
          description: 'Focus the foundation district before reviewing pressure telemetry.',
          command: 'go foundation',
          districtId: 'foundation',
        },
        {
          id: 'trace-abyss',
          type: 'terminal',
          label: 'Trace under-cloud echo',
          description: 'Run a terminal trace against the abyss-whale anomaly key.',
          command: 'trace abyss-whale',
        },
        {
          id: 'review-citizens',
          type: 'citizens',
          label: 'Review resident reports',
          description: 'Open Pulse and compare vent-shift reports against the signal pressure.',
        },
      ],
    },
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
    investigation: {
      detected: 'An unnumbered transit route appears during administrative load spikes.',
      corroborated: 'Apex transit stress and archive access windows both reproduce the same black-line path.',
      contained: 'Administrative shuttle priority is capped while the Ghost Rail route remains visible.',
      actions: [
        {
          id: 'inspect-apex',
          type: 'district',
          label: 'Inspect Apex routes',
          description: 'Focus Lingxiao Apex where sealed route traffic concentrates.',
          command: 'go apex',
          districtId: 'apex',
        },
        {
          id: 'trace-ghost-rail',
          type: 'terminal',
          label: 'Trace Ghost Rail',
          description: 'Run terminal trace for the black-route anomaly.',
          command: 'trace ghost-rail',
        },
        {
          id: 'review-archive',
          type: 'archive',
          label: 'Review archive thread',
          description: 'Open Archive and compare Ghost Rail evidence against locked transit records.',
        },
      ],
    },
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
    investigation: {
      detected: 'Gravity telemetry is repeating at a biological cadence.',
      corroborated: 'Energy drift and observer district changes now line up with the same pulse interval.',
      contained: 'Core monitoring is pinned to manual cadence until the city stops reacting to observer focus changes.',
      actions: [
        {
          id: 'inspect-mid-ring',
          type: 'district',
          label: 'Inspect mid-ring load',
          description: 'Focus the commercial ring before sampling the gravity pulse.',
          command: 'go mid_ring',
          districtId: 'mid_ring',
        },
        {
          id: 'trace-core',
          type: 'terminal',
          label: 'Trace core heartbeat',
          description: 'Run terminal trace against core-heartbeat.',
          command: 'trace core-heartbeat',
        },
        {
          id: 'review-systems',
          type: 'archive',
          label: 'Review system resonance',
          description: 'Open Systems and compare energy index against signal pressure.',
        },
      ],
    },
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
    investigation: {
      detected: 'The observer loop is reflecting session timing back into the interface.',
      corroborated: 'Terminal traces and local session telemetry now agree that the observer is part of the signal.',
      contained: 'Session telemetry remains local, and external export is blocked for the active investigation.',
      actions: [
        {
          id: 'trace-observer',
          type: 'terminal',
          label: 'Trace observer loop',
          description: 'Run terminal trace for observer-return while watching the session clock.',
          command: 'trace observer-return',
        },
        {
          id: 'review-memory',
          type: 'terminal',
          label: 'Audit observer memory',
          description: 'Run the MEMORY command and verify persistence state before export.',
          command: 'memory',
        },
        {
          id: 'review-diary',
          type: 'diary',
          label: 'Review local diary',
          description: 'Open Diary and verify observer-loop events stay in local memory.',
        },
      ],
    },
  },
];

export const getSignalById = (id: string) => SIGNAL_CATALOG.find((signal) => signal.id === id) ?? null;

export type InstrumentInput =
  | { kind: 'frames'; first: string; second: string }
  | { kind: 'pressure'; lower: string; upper: string }
  | { kind: 'permit'; code: string }
  | { kind: 'trial'; runs: readonly string[]; input: string }
  | { kind: 'clock'; correction: string; archiveReference?: boolean };

export interface Instrument {
  actionId: string;
  title: string;
  task: string;
  hint: string;
  mismatch: string;
  proof: InstrumentInput;
}

interface ScopeSample {
  id: string;
  time: string;
  height: number;
}

export type ScopeReadings = Record<'lower' | 'upper', readonly ScopeSample[]>;

const instruments = {
  guixu: {
    actionId: 'review-camera',
    title: '14-F · 底片对齐',
    task: '镜头换了位置。在两张底片上分别点出同一处固定轮廓。',
    hint: '找到远处的平台。它的边缘下有三根支架，两张底片上都能看到。',
    mismatch: '两个标记还没对上。再看看每张底片中连在同一座平台下的三根支架。',
    proof: { kind: 'frames', first: 'gantry', second: 'gantry' },
  },
  'abyss-whale': {
    actionId: 'trace-abyss',
    title: '压力示波器',
    task: '在两台探头的曲线上各点出第一个波峰。波形先陡升，再缓缓回落。',
    hint: '从左往右读，第一处明显的跃升出现在一连串小波峰之前。',
    mismatch: '有一个标记落在了小幅振荡上。请再找找最先明显升高的位置。',
    proof: { kind: 'pressure', lower: 'lower-front', upper: 'upper-front' },
  },
  'ghost-rail': {
    actionId: 'review-archive',
    title: '议会许可核验台',
    task: '从道岔日志读出放行时用的钥匙，输入对应的完整编号。',
    hint: '查看 06:40 的道岔放行记录，连字符后面的字符也属于编号。',
    mismatch: '编号和 06:40 的放行记录对不上。请核对日志里的完整钥匙编号。',
    proof: { kind: 'permit', code: 'A9-NULL' },
  },
  'core-heartbeat': {
    actionId: 'review-systems',
    title: '重力总线试验台',
    task: '保持负载不变，分别刷新本地地图、订阅实时数据。选出让总线电流发生变化的那条曲线。',
    hint: '做完两次试验，比较哪一次的电流偏离了基线。',
    mismatch: '请做完两次试验，再引用出现电流尖峰的那一次。',
    proof: { kind: 'trial', runs: ['redraw', 'subscribe'], input: 'subscribe' },
  },
  'observer-return': {
    actionId: 'review-diary',
    title: '日记时钟校准',
    task: '先抄录初代档案的两个基准脉冲，再回到当班日记，将时钟与接收器对齐。',
    hint: '任选一行，用接收器读数减去日记读数。再用另一行核对这个差值。',
    mismatch: '校正后，两行日记读数都应与对应的接收器读数相同。',
    proof: { kind: 'clock', correction: '-100', archiveReference: true },
  },
} as const satisfies Record<string, Instrument>;

export const pressureSamples = {
  lower: [
    { id: 'lower-noise', time: '14.020', height: 22 },
    { id: 'lower-front', time: '14.100', height: 94 },
    { id: 'lower-tail', time: '14.180', height: 56 },
    { id: 'lower-echo', time: '14.360', height: 31 },
  ],
  upper: [
    { id: 'upper-noise', time: '14.410', height: 18 },
    { id: 'upper-front', time: '14.520', height: 73 },
    { id: 'upper-tail', time: '14.640', height: 43 },
    { id: 'upper-echo', time: '14.800', height: 24 },
  ],
} as const;

export type InstrumentSignal = keyof typeof instruments;

export function getInstrument(signalId: string, actionId: string): Instrument | undefined {
  if (!Object.hasOwn(instruments, signalId)) return undefined;
  const instrument = instruments[signalId as InstrumentSignal];
  return instrument.actionId === actionId ? instrument : undefined;
}

export function checkInstrument(instrument: Instrument, sample: InstrumentInput): string | null {
  const proof = instrument.proof;
  if (sample.kind !== proof.kind) return instrument.mismatch;

  let matched = false;
  switch (sample.kind) {
    case 'frames':
      matched = proof.kind === 'frames' && sample.first === proof.first && sample.second === proof.second;
      break;
    case 'pressure':
      matched = proof.kind === 'pressure' && sample.lower === proof.lower && sample.upper === proof.upper;
      break;
    case 'permit':
      matched = proof.kind === 'permit' && sample.code.trim().toUpperCase() === proof.code;
      break;
    case 'trial':
      matched = proof.kind === 'trial' && proof.runs.every((run) => sample.runs.includes(run)) && sample.input === proof.input;
      break;
    case 'clock':
      matched = proof.kind === 'clock' && sample.correction === proof.correction
        && (!proof.archiveReference || sample.archiveReference === true);
      break;
  }
  return matched ? null : instrument.mismatch;
}

export function verifyInstrument(signalId: string, actionId: string, sample: InstrumentInput): string | null {
  const instrument = getInstrument(signalId, actionId);
  return instrument ? checkInstrument(instrument, sample) : '这份记录需要通过另一台仪器采集。';
}

export interface Rehearsal {
  instrument: Instrument;
  scope?: ScopeReadings;
  clockBias?: number;
}

export function makeRehearsal(original: Instrument, round: number): Rehearsal {
  const make = (proof: InstrumentInput, task = original.task) => ({ ...original, proof, task });
  switch (original.proof.kind) {
    case 'frames': {
      const near = round % 2 === 1;
      const feature = near ? 'sill' : 'gantry';
      return {
        instrument: {
          ...make({ kind: 'frames', first: feature, second: feature },
            near ? '以相机平台本身的结构为参照物，在两张底片上分别标出它。' : original.task),
          mismatch: near ? '找找镜头近处那段连着相机平台的钢架。' : original.mismatch,
          hint: near ? '留意画面边缘与相机平台相连的近处护栏。' : original.hint,
        },
      };
    }
    case 'pressure': {
      const lowerPeak = 1 + round % 3;
      const upperPeak = 1 + (round + 1) % 3;
      const readSensor = (name: string, time: number, peak: number) => Array.from({ length: 5 }, (_, index) => ({
        id: `practice-${name}-${index}`,
        time: (time + index * 0.08).toFixed(3),
        height: index === peak ? 82 : index === peak + 1 ? 47 : 18 + index * 3,
      }));
      const scope = { lower: readSensor('lower', 15.01, lowerPeak), upper: readSensor('upper', 15.40, upperPeak) };
      return {
        instrument: make({ kind: 'pressure', lower: scope.lower[lowerPeak].id, upper: scope.upper[upperPeak].id }),
        scope,
      };
    }
    case 'permit':
      return { instrument: make({ kind: 'permit', code: `R${21 + round % 73}-M${String(36 + round % 53)}` }) };
    case 'trial':
      return { instrument: make({ kind: 'trial', runs: ['redraw', 'subscribe'], input: round % 2 === 1 ? 'redraw' : 'subscribe' }) };
    case 'clock': {
      const clockBias = [200, -100, -200, 100][(round - 1) % 4] ?? 100;
      return { instrument: make({ kind: 'clock', correction: String(-clockBias) }, '基准脉冲已放在表中。选择一个修正量，让两行日记读数分别对齐接收器。'), clockBias };
    }
  }
}

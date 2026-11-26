import { useEffect, useRef, useState } from 'react';
import { CircleCheck, X } from 'lucide-react';
import { useCity } from '../../context/CityContext';
import { caseNames } from '../../data/fieldSites';
import { getFieldRecord } from '../../data/caseFiles';
import { checkInstrument, getInstrument, makeRehearsal, pressureSamples } from '../../data/instruments';
import type { InstrumentInput, ScopeReadings } from '../../data/instruments';
import guixuStill from '../../assets/guixu-camera-14f.jpg';
import ConsoleDialog from '../ConsoleDialog/ConsoleDialog';
import './InstrumentWorkbench.css';

type SampleProps<T extends InstrumentInput> = {
  sample: T;
  update: (sample: T) => void;
};

const frames = [
  {
    key: 'first',
    time: '03:18:04',
    markers: [
      { id: 'sill', x: 17, y: 26, name: 'A1', description: '连着相机平台的近处支架' },
      { id: 'gantry', x: 71, y: 53, name: 'A2', description: '远处平台下的三根立柱' },
      { id: 'veil', x: 83, y: 28, name: 'A3', description: '明亮模糊的云缘' },
    ],
  },
  {
    key: 'second',
    time: '03:18:07',
    markers: [
      { id: 'veil', x: 48, y: 37, name: 'B1', description: '明亮模糊的云缘' },
      { id: 'sill', x: 20, y: 25, name: 'B2', description: '连着相机平台的近处支架' },
      { id: 'gantry', x: 75, y: 51, name: 'B3', description: '远处平台下的三根立柱' },
    ],
  },
] as const;

function FrameRegistration({ sample, update }: SampleProps<Extract<InstrumentInput, { kind: 'frames' }>>) {
  return (
    <div className="capture-grid">
      {frames.map(({ key, time, markers }) => (
        <figure className={`capture-frame capture-${key}`} key={key} aria-label={`曝光时刻 ${time}`}>
          <figcaption>14-F · {time}</figcaption>
          <div className="capture-photo">
            <img src={guixuStill} alt="镜头前是云层和近处的建筑边缘，远处另有一座平台。" />
            {markers.map((marker) => (
              <button
                key={marker.id}
                className="capture-marker"
                style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
                type="button"
                aria-label={`${marker.name}, ${marker.description}`}
                aria-pressed={sample[key] === marker.id}
                data-feature={marker.id}
                onClick={() => update({ ...sample, [key]: marker.id })}
              >
                {marker.name}
              </button>
            ))}
          </div>
        </figure>
      ))}
    </div>
  );
}

function PressureScope({ sample, update, scope }: SampleProps<Extract<InstrumentInput, { kind: 'pressure' }>> & { scope: ScopeReadings }) {
  return (
    <div className="capture-grid">
      {(['lower', 'upper'] as const).map((position) => (
        <fieldset className="capture-card" key={position}>
          <legend>{position === 'lower' ? '格栅下方探头' : '上方风管探头'}</legend>
          <div className="pressure-samples">
            {scope[position].map(({ id, time, height }) => (
              <button
                key={id}
                type="button"
                data-sample={id}
                aria-label={`04:09:${time} · 振幅 ${height}`}
                aria-pressed={sample[position] === id}
                onClick={() => update({ ...sample, [position]: id })}
              >
                <span className="scope-column" aria-hidden="true"><span style={{ height: `${height}%` }} /></span>
                <span>{time}</span>
              </button>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}

function PermitReader({ sample, update, hasTrace, rehearsalCode }: SampleProps<Extract<InstrumentInput, { kind: 'permit' }>> & {
  hasTrace: boolean;
  rehearsalCode?: string;
}) {
  const keyReading = getFieldRecord('ghost-rail', 'trace-ghost-rail')?.readings.find(({ id }) => id === 'rail-key');
  return (
    <div className="capture-grid">
      <section className="capture-card" aria-label="道岔日志">
        <h3>六号道岔</h3>
        <p>{rehearsalCode ? `06:40:12 · 授权钥匙 ${rehearsalCode}`
          : hasTrace ? keyReading?.value : '先去终端追踪幽灵轨道，取回道岔日志。'}</p>
      </section>
      <label className="capture-card capture-code">
        <strong>许可编号</strong>
        <input
          name="permit-code"
          value={sample.code}
          onChange={(event) => update({ ...sample, code: event.target.value })}
          autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={20}
          placeholder="XX-XXXX" disabled={!hasTrace}
        />
      </label>
    </div>
  );
}

const trials = [
  { id: 'redraw', label: '刷新本地地图' },
  { id: 'subscribe', label: '订阅实时数据' },
] as const;

function TrialBench({ sample, update, trigger }: SampleProps<Extract<InstrumentInput, { kind: 'trial' }>> & { trigger: string }) {
  return (
    <fieldset className="capture-trials">
      <legend>恒定负载试验 · 41.0 MW</legend>
      <div className="capture-grid">
        {trials.map(({ id, label }) => {
          const ran = sample.runs.includes(id);
          const result = id === trigger ? '250 ms 后电流出现尖峰 · 负载 41.0 MW' : '电流平稳 · 负载 41.0 MW';
          return (
            <div className="capture-card" key={id}>
              <button className="capture-control" type="button" data-trial={id} onClick={() => update({
                ...sample, runs: ran ? sample.runs : [...sample.runs, id],
              })}>
                {label}
              </button>
              <p role="status">{ran ? result : '等待试验'}</p>
              <label>
                <input type="radio" name="bus-trial" value={id} checked={sample.input === id} disabled={sample.runs.length < 2}
                  onChange={() => update({ ...sample, input: id })} />
                {' '}引用这条曲线
              </label>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}

const referencePulses = [1010, 3420];

function ClockAlignment({ sample, update, bias, mode, onChangeEra }: SampleProps<Extract<InstrumentInput, { kind: 'clock' }>> & {
  bias: number;
  mode: 'archive' | 'live' | 'practice';
  onChangeEra: () => void;
}) {
  const correction = Number(sample.correction);
  if (mode === 'archive') {
    return (
      <section className="capture-card clock-reference">
        <h3>初代档案 · 接收器基准</h3>
        <p>{referencePulses.map((tick) => `${tick} ms`).join(' / ')}</p>
        <div className="capture-actions">
          <button className="capture-control" type="button" disabled={sample.archiveReference}
            onClick={() => update({ ...sample, archiveReference: true })}>抄录基准脉冲</button>
          <button className="capture-control" type="button" onClick={onChangeEra}>返回当班日记</button>
        </div>
        {sample.archiveReference && <p role="status">两个基准脉冲已抄录。</p>}
      </section>
    );
  }
  if (mode === 'live' && !sample.archiveReference) {
    return (
      <section className="capture-card clock-reference">
        <h3>当班日记 · 等待校时</h3>
        <p>去初代档案查找接收器的校时记录。</p>
        <button className="capture-control" type="button" onClick={onChangeEra}>查阅初代校时记录</button>
      </section>
    );
  }
  return (
    <div className="capture-clock">
      <table>
        <caption>基准脉冲到达时刻（毫秒）</caption>
        <thead><tr><th scope="col">脉冲</th><th scope="col">接收器</th><th scope="col">日记</th><th scope="col">校正后</th></tr></thead>
        <tbody>
          {referencePulses.map((arrival, index) => (
            <tr key={arrival}><th scope="row">{index + 1}</th><td>{arrival}</td><td>{arrival + bias}</td><td>{arrival + bias + correction}</td></tr>
          ))}
        </tbody>
      </table>
      <label>
        日记时钟修正量
        <select value={sample.correction} name="clock-correction" onChange={(event) => update({ ...sample, correction: event.target.value })}>
          <option value="">选择修正量</option>
          <option value="-200">−200 ms</option>
          <option value="-100">−100 ms</option>
          <option value="0">0 ms</option>
          <option value="100">+100 ms</option>
          <option value="200">+200 ms</option>
        </select>
      </label>
    </div>
  );
}

const initialSamples: Record<InstrumentInput['kind'], InstrumentInput> = {
  frames: { kind: 'frames', first: '', second: '' },
  pressure: { kind: 'pressure', lower: '', upper: '' },
  permit: { kind: 'permit', code: '' },
  trial: { kind: 'trial', runs: [], input: '' },
  clock: { kind: 'clock', correction: '' },
};

interface Props {
  signalId: string;
  actionId: string;
  opener: HTMLElement | null;
  onClose: () => void;
  practice?: boolean;
  returnToCase?: boolean;
}

export default function InstrumentWorkbench({ signalId, actionId, opener, onClose, practice = false, returnToCase = false }: Props) {
  const { captureInstrumentRecord, investigationState, isPastMode, toggleTemporalView } = useCity();
  const original = getInstrument(signalId, actionId);
  const thread = investigationState.threads[signalId];
  const [round, setRound] = useState(1);
  const [practiceDone, setPracticeDone] = useState(false);
  const [sample, setSample] = useState(() => initialSamples[original?.proof.kind ?? 'frames']);
  const [feedback, setFeedback] = useState('');
  const returnButton = useRef<HTMLButtonElement>(null);
  const captured = practice ? practiceDone : thread?.completedActionIds.includes(actionId);
  useEffect(() => {
    if (captured) returnButton.current?.focus();
  }, [captured]);
  if (!original || !thread || thread.stage === 'sealed') return null;

  const rehearsal = practice ? makeRehearsal(original, round) : null;
  const instrument = rehearsal?.instrument ?? original;
  const hasTrace = practice || thread.completedActionIds.includes('trace-ghost-rail');
  const update = (next: InstrumentInput) => {
    setSample(next);
    setFeedback('');
  };
  const ready = (
    (sample.kind === 'frames' && sample.first && sample.second)
    || (sample.kind === 'pressure' && sample.lower && sample.upper)
    || (sample.kind === 'permit' && hasTrace && sample.code.trim())
    || (sample.kind === 'trial' && sample.runs.length === 2 && sample.input)
    || (sample.kind === 'clock' && sample.correction && (practice || (sample.archiveReference && !isPastMode)))
  );

  return (
    <ConsoleDialog className="case-overlay capture-overlay" titleId="capture-title" opener={opener} onClose={onClose}>
      <article className={`case-desk capture-desk case-accent-${thread.signal.mapFocus}`}>
        <header className="case-header">
          <div><span>{caseNames[signalId]}{practice && ' · 练习'}</span><h2 id="capture-title">{instrument.title}</h2></div>
          <button type="button" className="case-close capture-close" data-dialog-focus aria-label="关闭仪器" onClick={onClose}><X size={20} /></button>
        </header>
        <form className="capture-body" onSubmit={(event) => {
          event.preventDefault();
          const message = practice ? checkInstrument(instrument, sample) : captureInstrumentRecord(signalId, actionId, sample);
          setFeedback(message ?? '');
          if (practice && !message) setPracticeDone(true);
        }}>
          {captured ? (
            <div className="capture-success" role="status">
              <CircleCheck size={23} aria-hidden="true" />
              <div><strong>{practice ? '练习通过' : '已采集记录'}</strong>
                <p>{practice ? '这份练习样本已留在仪器台。' : `「${getFieldRecord(signalId, actionId)?.source}」已收入案卷。`}</p>
              </div>
            </div>
          ) : (
            <>
              <p className="capture-task">{instrument.task}</p>
              {sample.kind === 'frames' && <FrameRegistration sample={sample} update={update} />}
              {sample.kind === 'pressure' && <PressureScope sample={sample} update={update} scope={rehearsal?.scope ?? pressureSamples} />}
              {sample.kind === 'permit' && <PermitReader sample={sample} update={update} hasTrace={hasTrace}
                rehearsalCode={practice && instrument.proof.kind === 'permit' ? instrument.proof.code : undefined} />}
              {sample.kind === 'trial' && instrument.proof.kind === 'trial' && <TrialBench sample={sample} update={update} trigger={instrument.proof.input} />}
              {sample.kind === 'clock' && <ClockAlignment sample={sample} update={update} bias={rehearsal?.clockBias ?? 100}
                mode={practice ? 'practice' : isPastMode ? 'archive' : 'live'} onChangeEra={toggleTemporalView} />}
              {feedback && <p className="case-feedback" role="status">{feedback}</p>}
            </>
          )}
          {captured ? (
            <div className="capture-actions">
              <button ref={returnButton} type="button" className="case-submit capture-return" onClick={onClose}>{returnToCase ? '返回案卷' : '返回调查'}</button>
              {practice && <button className="capture-control capture-new" type="button" onClick={() => {
                update(initialSamples[instrument.proof.kind]);
                setRound((current) => current + 1);
                setPracticeDone(false);
              }}>换一份样本</button>}
            </div>
          ) : <>
            <button type="submit" className="case-submit capture-confirm" disabled={!ready}>{practice ? '核验样本' : '采集记录'}</button>
            <details className="case-hint"><summary>查看仪器提示</summary><p>{instrument.hint}</p></details>
          </>}
        </form>
      </article>
    </ConsoleDialog>
  );
}

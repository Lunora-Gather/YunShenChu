import { useEffect, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, FileSearch, LockKeyhole, X } from 'lucide-react';
import { useCity } from '../../context/CityContext';
import { DEPARTURE_CHOICES, getCaseFile } from '../../data/caseFiles';
import type { DepartureChoice } from '../../data/caseFiles';
import { MANIFEST_FIELDS, readManifestDraft, writeManifestDraft } from '../../data/departureManifest';
import { caseNames } from '../../data/fieldSites';
import { SIGNAL_CATALOG } from '../../data/signals';
import { getInstrument } from '../../data/instruments';
import guixuStill from '../../assets/guixu-camera-14f.jpg';
import platformZero from '../../assets/platform-zero.jpg';
import ConsoleDialog from '../ConsoleDialog/ConsoleDialog';
import ManifestWorkbench from './ManifestWorkbench';
import './CaseDesk.css';

interface CaseDeskProps {
  opener: HTMLElement | null;
  onClose: () => void;
}

function readDraft(key: string, file: ReturnType<typeof getCaseFile>, actions: readonly string[]) {
  const empty = { theoryId: '', citations: [] as string[] };
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw || !file) return empty;
    const draft = JSON.parse(raw);
    const theoryId = file.theories.some(theory => theory.id === draft?.theoryId) ? String(draft.theoryId) : '';
    const citations = file.records.filter(record => actions.includes(record.actionId)).flatMap(record => {
      const selected = record.readings.find(r => Array.isArray(draft?.citations) && draft.citations.includes(r.id));
      return selected ? [selected.id] : [];
    }).slice(0, 2);
    return { theoryId, citations };
  } catch {
    return empty;
  }
}

function CloseCaseDesk({ onClose }: Pick<CaseDeskProps, 'onClose'>) {
  return (
    <button className="case-close" data-dialog-focus type="button" onClick={onClose} aria-label="关闭案卷">
      <X size={20} aria-hidden="true" />
    </button>
  );
}

export function DepartureFile({ opener, onClose }: CaseDeskProps) {
  const { departureDecision, fileDepartureDecision, observerMemory } = useCity();
  const [choice, setChoice] = useState<DepartureChoice | null>(null);
  const [manifest, setManifest] = useState(() => readManifestDraft(observerMemory.storageKey));
  const receipt = departureDecision ? DEPARTURE_CHOICES[departureDecision.choice] : null;
  const endingTitle = useRef<HTMLHeadingElement>(null);
  const choiceTitle = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (receipt) endingTitle.current?.focus();
    else if (manifest.verified) choiceTitle.current?.focus();
  }, [manifest.verified, receipt]);

  return (
    <ConsoleDialog className="case-overlay" titleId="departure-title" opener={opener} fallbackFocusId="field-dispatch" onClose={onClose}>
      <article className={`case-desk departure-file ${departureDecision
        ? `outcome-${departureDecision.choice}` : manifest.verified ? '' : 'is-reconstructing'}`}>
        <header className="case-header">
          <div>
            <span>{receipt ? '调查结案' : '联合调度 · 初代档案'}</span>
            <h2 id="departure-title">Q-17 发车单</h2>
          </div>
          <CloseCaseDesk onClose={onClose} />
        </header>
        <div className="departure-scene">
          <img src={platformZero} alt="一节车厢停在云海上方的有顶月台。" width="1536" height="1024" />
          <div>
            {receipt
              ? <h3 ref={endingTitle} tabIndex={-1}>{receipt.endingTitle}</h3>
              : <h3>零号月台</h3>}
          </div>
        </div>
        <div className="departure-brief">
          {receipt ? (
            <>
              <p className="departure-epilogue">{receipt.epilogue}</p>
              <section className="departure-receipt" aria-label="调度回执">
                <strong>{receipt.directive}</strong>
                <p>{receipt.receipt}</p>
              </section>
              <button className="case-submit departure-return" type="button" onClick={onClose}>
                返回云城 <ArrowRight size={16} aria-hidden="true" />
              </button>
            </>
          ) : manifest.verified ? (
            <>
              <div className="manifest-intro">
                <div>
                  <h3 ref={choiceTitle} tabIndex={-1}>发车清单已复原</h3>
                  <p>乘车票上是你的名字。档案台把这一程登记为返程。</p>
                </div>
                <CheckCircle2 size={20} aria-label="读数已核实" />
              </div>
              <details className="departure-manifest-review">
                <summary>查看复原的清单</summary>
                <dl className="departure-manifest">
                  {MANIFEST_FIELDS.map(({ id, label, entry }) => <div key={id}><dt>{label}</dt><dd>{entry}</dd></div>)}
                </dl>
              </details>
              <form className="departure-response" onSubmit={(event) => {
                event.preventDefault();
                if (choice) fileDepartureDecision(choice);
              }}>
                <fieldset className="case-theories">
                  <legend>零号月台等你决定。这趟车可以发车吗？</legend>
                  {(['hold', 'clear'] as const).map((option) => (
                    <label className="case-theory" key={option}>
                      <input type="radio" name="departure-choice" value={option} checked={choice === option} onChange={() => setChoice(option)} />
                      <span><strong>{DEPARTURE_CHOICES[option].label}</strong><span>{DEPARTURE_CHOICES[option].preview}</span></span>
                    </label>
                  ))}
                </fieldset>
                <button className="case-submit" type="submit" disabled={!choice}>发出调度指令</button>
              </form>
            </>
          ) : (
            <ManifestWorkbench entries={manifest.entries}
              onChange={(entries) => {
                writeManifestDraft(observerMemory.storageKey, entries, false);
                setManifest({ entries, verified: false });
              }}
              onVerify={() => {
                writeManifestDraft(observerMemory.storageKey, manifest.entries, true);
                setManifest({ ...manifest, verified: true });
              }} />
          )}
        </div>
      </article>
    </ConsoleDialog>
  );
}

export default function CaseDesk({ signalId, opener, onClose, onOpenInstrument, onContinue }: CaseDeskProps & {
  signalId: string;
  onOpenInstrument: (actionId: string, practice?: boolean) => void;
  onContinue: (actionId: string) => void;
}) {
  const { investigationState, submitCaseFinding, observerMemory } = useCity();
  const [feedback, setFeedback] = useState('');
  const [showDeparture, setShowDeparture] = useState(false);
  const findingTitle = useRef<HTMLHeadingElement>(null);
  const justFiled = useRef(false);
  const file = getCaseFile(signalId);
  const thread = investigationState.threads[signalId];
  const filed = thread?.stage === 'contained';
  const draftKey = observerMemory.storageKey + '.case.' + signalId;
  const [{ theoryId, citations }, setDraft] = useState(() => readDraft(draftKey, file, thread?.completedActionIds ?? []));
  useEffect(() => {
    try {
      if (filed || (!theoryId && !citations.length)) sessionStorage.removeItem(draftKey);
      else sessionStorage.setItem(draftKey, JSON.stringify({ theoryId, citations }));
    } catch { /* The open worksheet still works when browser storage is unavailable. */ }
  }, [draftKey, filed, theoryId, citations]);

  useEffect(() => {
    if (!justFiled.current) return;
    justFiled.current = false;
    if (filed) findingTitle.current?.focus();
  }, [filed]);

  if (!file || !thread || thread.stage === 'sealed') return null;

  const captured = file.records.filter(({ actionId }) => thread.completedActionIds.includes(actionId));
  const citedReadings = captured.flatMap(({ readings }) => readings.filter(({ id }) => citations.includes(id)));
  const canFile = captured.length === file.records.length;
  const acceptedTheory = file.theories.find(({ id }) => id === file.finding);
  const finished = SIGNAL_CATALOG.every(({ id }) => investigationState.threads[id]?.stage === 'contained');
  const instrumentRecord = file.records.find(({ actionId }) => getInstrument(signalId, actionId));
  const nextAction = thread.nextAction;
  const nextRecord = file.records.find(record => record.actionId === nextAction?.id);
  const Reading = filed ? 'div' : 'label';
  if (showDeparture && finished) return <DepartureFile opener={opener} onClose={onClose} />;

  const chooseReading = (id: string, sourceIds: string[]) => {
    setDraft((draft) => {
      if (draft.citations.includes(id)) return { ...draft, citations: draft.citations.filter(item => item !== id) };
      const otherSources = draft.citations.filter(item => !sourceIds.includes(item));
      return otherSources.length < 2 ? { ...draft, citations: [...otherSources, id] } : draft;
    });
    setFeedback('');
  };

  const jumpTo = (section: 'records' | 'findings') => {
    const title = document.getElementById(`case-${section}-title`);
    title?.scrollIntoView({ block: 'start' });
    title?.focus({ preventScroll: true });
  };

  return (
    <ConsoleDialog className="case-overlay" titleId="case-desk-title" opener={opener} fallbackFocusId="field-next-action" onClose={onClose}>
      <article className={`case-desk case-accent-${thread.signal.mapFocus}`}>
        <header className="case-header">
          <div>
            <span>现场案卷 · {thread.signal.freq.toFixed(1)} MHz</span>
            <h2 id="case-desk-title">{caseNames[signalId]}</h2>
          </div>
          <CloseCaseDesk onClose={onClose} />
          <nav className="case-jumps" aria-label="案卷目录">
            <button type="button" onClick={() => jumpTo('records')}>现场记录</button>
            <button type="button" onClick={() => jumpTo('findings')}>{filed ? '结案结论' : '调查结论'}</button>
          </nav>
        </header>
        {nextAction && nextRecord && <div className="case-next-record">
          <div><small>下一份记录</small><strong>{nextRecord.source}</strong></div>
          <button className="case-secondary" type="button" onClick={() => {
            if (instrumentRecord?.actionId === nextAction.id) onOpenInstrument(nextAction.id);
            else onContinue(nextAction.id);
          }}>{nextAction.label} <ArrowRight size={16} aria-hidden="true" /></button>
        </div>}
        <form className="case-body" onSubmit={(event) => {
          event.preventDefault();
          const message = submitCaseFinding(signalId, { theoryId, citationIds: citations });
          justFiled.current = message === null;
          setFeedback(message ?? '');
        }}>
          <section className="case-records" aria-labelledby="case-records-title">
            <div className="case-section-heading">
              <h3 id="case-records-title" tabIndex={-1}>现场记录</h3>
              <span>已取证 {captured.length}/{file.records.length}</span>
            </div>
            <div className="case-record-stack">
              {file.records.map((record) => {
                const collected = thread.completedActionIds.includes(record.actionId);
                const sourceIds = record.readings.map(({ id }) => id);
                const selectedInSource = sourceIds.some((id) => citations.includes(id));
                const captureAction = thread.signal.investigation.actions.find(({ id }) => id === record.actionId);
                return (
                  <fieldset className={`case-ticket${collected ? '' : ' case-ticket-pending'}`} key={record.actionId}>
                    <legend>{record.source}</legend>
                    {collected ? (
                      <>
                        <time className="case-record-time">{record.time}</time>
                        {signalId === 'guixu' && record.actionId === 'review-camera' && (
                          <figure className="case-still">
                            <img src={guixuStill} alt="云中独立平台的底部，可以辨认出三根支架。" width={1672} height={941} loading="lazy" />
                            <figcaption>14-F · 03:18 · 导航叠层已关闭</figcaption>
                          </figure>
                        )}
                        {record.readings.map((reading) => {
                          const cited = filed ? file.proof.includes(reading.id) : citations.includes(reading.id);
                          return (
                            <Reading key={reading.id} className={`case-reading${cited ? ' is-cited' : ''}`}>
                              {filed ? (
                                cited && <CheckCircle2 size={16} aria-label="结论已引用" />
                              ) : (
                                <input
                                  type="checkbox"
                                  name="citation"
                                  value={reading.id}
                                  checked={cited}
                                  disabled={!cited && !selectedInSource && citations.length === 2}
                                  onChange={() => chooseReading(reading.id, sourceIds)}
                                />
                              )}
                              <span><strong>{reading.label}</strong><span>{reading.value}</span></span>
                            </Reading>
                          );
                        })}
                      </>
                    ) : (
                      <>
                        <p><LockKeyhole size={14} aria-hidden="true" /> {captureAction?.label ?? '采集现场记录'}</p>
                      </>
                    )}
                  </fieldset>
                );
              })}
            </div>
          </section>
          <section className="case-findings" aria-labelledby="case-findings-title">
            <div className="case-section-heading">
              <h3 ref={findingTitle} id="case-findings-title" tabIndex={-1}>{filed ? '已归档的结论' : '调查结论'}</h3>
              {filed ? <CheckCircle2 size={19} aria-label="已结案" /> : <FileSearch size={19} aria-hidden="true" />}
            </div>
            {filed ? (
              <div className="case-resolution">
                <strong>{acceptedTheory?.title}</strong>
                <p>{file.dispatch}</p>
                {instrumentRecord && <button className="case-secondary" type="button" onClick={() => onOpenInstrument(instrumentRecord.actionId, true)}>用新样本练习</button>}
                {finished && <button className="case-submit" type="button" onClick={() => setShowDeparture(true)}>查看联合调度单</button>}
                {!finished && <button className="case-submit case-continue" type="button" onClick={onClose}>继续调查 <ArrowRight size={16} aria-hidden="true" /></button>}
              </div>
            ) : (
              <>
                <fieldset className="case-theories">
                  <legend>{file.question}</legend>
                  {file.theories.map((theory) => (
                    <label className="case-theory" key={theory.id}>
                      <input type="radio" name="theory" value={theory.id} checked={theoryId === theory.id} onChange={() => {
                        setDraft(draft => ({ ...draft, theoryId: theory.id }));
                        setFeedback('');
                      }} />
                      <span><strong>{theory.title}</strong><span>{theory.description}</span></span>
                    </label>
                  ))}
                </fieldset>
                {feedback && <p className="case-feedback" role="status">{feedback}</p>}
                {citedReadings.length > 0 && (
                  <ul className="case-citation-list" aria-label="已选证据">
                    {citedReadings.map(({ id, label, value }) => (
                      <li key={id}><strong>{label}</strong><span>{value}</span>
                        <button type="button" onClick={() => chooseReading(id, [])} aria-label={`撤下证据「${label}」`}><X size={15} aria-hidden="true" /></button>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="case-requirements">
                  {canFile ? `从两份不同来源的记录中各选一条读数 · 已选 ${citations.length}/2` : '集齐三份现场记录，就能引用证据结案。'}
                </p>
                <button className="case-submit" type="submit" disabled={!canFile || !theoryId || citations.length !== 2}>提交结论</button>
                {canFile && <details className="case-hint"><summary>查看破案提示</summary><p>{file.hint}</p></details>}
              </>
            )}
          </section>
        </form>
      </article>
    </ConsoleDialog>
  );
}

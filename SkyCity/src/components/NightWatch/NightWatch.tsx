import { revealPinnedTabs } from '../revealPinnedTabs';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Check, ChevronRight, ClipboardList, Moon, Radio, Wrench } from 'lucide-react';
import { useCity } from '../../context/CityContext';
import { affectedDistrict, initialWatch, nextResident, offeredReturn, pledgeProgress, watches, sampleCount, sampled, watchIncident, watchSites } from '../../data/nightWatch';
import type { WatchBook, WatchReceipt } from '../../data/nightWatch';
import { delivered, freightRoute, linkIndex, parcelKey, parcelLetter, returnLetter, shipmentLetter } from '../../data/nightFreight';
import { hasFiledAllFindings } from '../../data/caseFiles';
import { fieldSites } from '../../data/fieldSites';
import ScenePhoto from '../ScenePhoto/ScenePhoto';
import ListenClip from './ListenClip';
import './NightWatch.css';

const responder = (kind: number) => kind >= 6 ? '货运值班员' : kind === 5 ? '电台值班员' : kind === 4 ? '夜班邮差' : '机修组';
const numberLabel = (n: number) => String(n).padStart(2, '0');
const tabs = ['调度单', '街区修缮', '交班簿'] as const;
type DeskTab = typeof tabs[number];
const unanswered = (mask: number, from: number) => [1, 2, 3].map(offset => (from + offset) % 3).find(i => !sampled(mask, i)) ?? from;
const returnFocus = (area: HTMLElement | null) => requestAnimationFrame(() => {
  area?.focus({ preventScroll: true });
  const page = area?.closest('.night-watch');
  if (page && area?.closest('.watch-brief')) page.scrollTop = 0;
  else area?.scrollIntoView({ block: window.matchMedia('(min-width: 960px)').matches ? 'nearest' : 'start', behavior: 'instant' });
});

function atHandover(r: WatchReceipt) {
  return { ...initialWatch, number: r.number, backlog: r.prior, parcel: r.parcel };
}
function receiptTitle(r: WatchReceipt) {
  return watchIncident(atHandover(r), r.kind).title;
}

function Readings({ book, mask, kind }: { book: WatchBook; mask: number; kind?: number }) {
  const incident = watchIncident(book, kind);
  return <dl className="watch-readings">{watchSites.map((site, i) => {
    const reading = incident.readings[i];
    return <div key={site.id} data-recorded={sampled(mask, i) || book.radioSite === i}>
      <dt>{site.ring}<span>{site.place}</span></dt>
      <dd>{sampled(mask, i) || book.radioSite === i ? <><strong>{reading.value}</strong><small>{book.radioSite === i && !sampled(mask, i) ? '来电代抄 · ' : ''}{reading.detail}</small></> : '尚未取样'}</dd>
    </div>;
  })}</dl>;
}

function Handover({ receipt }: { receipt: WatchReceipt }) {
  const filedBook = atHandover(receipt);
  const incident = watchIncident(filedBook, receipt.kind);
  const correct = receipt.choice === receipt.answer;
  const missed = watchSites.findIndex((_, i) => !sampled(receipt.samples, i));
  const affected = receipt.parcel?.site ?? affectedDistrict(receipt.kind, receipt.answer);
  let effect = '三站记录都已交回，本班人手用在了复核上。';
  if (!correct) effect = watchSites[affected].ring + '留下了复检工单。下一班调度正确时，可清掉一张。';
  else if (receipt.repaired !== null) effect = watchSites[receipt.repaired].ring + '的机修组完成了「' + watchSites[receipt.repaired].works[receipt.level - 1] + '」。';
  else if (missed >= 0) effect = receipt.prior[missed] ? watchSites[missed].ring + '的机修组用这段时间清了一张旧工单。' : watchSites[missed].ring + '的夜间设施已全部开放，本班按时交接。';
  return <div className="watch-handover">
    <strong>{correct ? '调度生效' : responder(receipt.kind) + '带回了更正'}</strong>
    {receipt.parcel && <p>{!correct ? '托付仍在簿上。下一班可照回执再试。' : receipt.kind === 6
      ? watchSites[receipt.choice].ring + '接货，下一班' + (freightRoute(receipt.parcel, receipt.choice) === '直送' ? '要替它接上末班车。' : '凭收据找到带原封的包裹。')
      : watchSites[receipt.parcel.site].keeper + '已签收。' + (receipt.parcel.trip === 1 && receipt.parcel.from === undefined ? '往后跑委托，可请这位街坊代抄一处现场读数。' : '')}</p>}
    <p>{effect}</p>
    {receipt.award !== undefined && <p className="watch-award">本轮获得「{watches[receipt.award].stamp}」</p>}
    <details><summary>复盘这班的三处读数</summary>
      <p>你的调度为「{incident.choices[receipt.choice]}」。{responder(receipt.kind)}核实的处置为「{incident.choices[receipt.answer]}」。</p>
      <Readings book={filedBook} kind={receipt.kind} mask={7} />
      <p>{incident.diagnosis}</p>
      {incident.tracks.map(t => <p key={t.name}>{t.name} · {t.sounds.join(' / ')}</p>)}
    </details>
  </div>;
}

export default function NightWatch({ onExit }: { onExit: () => void }) {
  const { nightWatch, recordWatch, observerMemory, investigationState } = useCity();
  const book = nightWatch ?? initialWatch;
  const canAccept = !book.parcel && book.open && !book.samples && hasFiledAllFindings(investigationState.completedActionIds);
  const incident = watchIncident(book);
  const [station, setStation] = useState(() => sampleCount(book.samples) >= 2 ? watchSites.findIndex((_, i) => sampled(book.samples, i)) : unanswered(book.samples, 2));
  const [tab, setTab] = useState<DeskTab>('调度单');
  const [selectedLetter, setSelectedLetter] = useState<number | null>(null);
  const [ordinaryNumber, setOrdinaryNumber] = useState<number | null>(null);
  const choosingLetter = canAccept && ordinaryNumber !== book.number;
  const correspondent = selectedLetter ?? nextResident(book);
  const offer = parcelLetter(correspondent, delivered(book.deliveries, correspondent) + 1);
  const ticket = parcelKey(book.parcel);
  const [order, setOrder] = useState<{ number: number; choice: number; ticket?: string } | null>(null);
  const choice = order?.number === book.number && order.ticket === ticket ? order.choice : null;
  const heading = useRef<HTMLHeadingElement>(null);
  const desk = useRef<HTMLHeadingElement>(null);
  const scene = useRef<HTMLHeadingElement>(null);
  const paperBody = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (paperBody.current) paperBody.current.scrollTop = 0;
  }, [tab, book.number, book.open]);
  const [nextPledge, setNextPledge] = useState<number | null>(null);
  const resumeAtDesk = useRef(book.open && sampleCount(book.samples) >= 2);
  useEffect(() => {
    if (resumeAtDesk.current) {
      const frame = returnFocus(desk.current);
      return () => cancelAnimationFrame(frame);
    }
    heading.current?.focus({ preventScroll: true });
  }, []);
  const receipt = book.open ? undefined : book.history[0];
  const settledBook = receipt ? atHandover(receipt) : null;
  const settledIncident = receipt && settledBook ? watchIncident(settledBook, receipt.kind) : undefined;
  const nextReturn = offeredReturn(book);
  const signed = receipt?.parcel && receipt.kind > 6 && receipt.choice === receipt.answer ? receipt.parcel : undefined;
  const remaining = watchSites.findIndex((_, i) => !sampled(receipt?.samples ?? book.samples, i));
  // File the handover at the place that received the crew or the follow-up order.
  const shownStation = choosingLetter ? correspondent : signed ? signed.site : receipt ? receipt.choice === receipt.answer && remaining >= 0
    ? remaining : receipt.parcel?.site ?? affectedDistrict(receipt.kind, receipt.answer) : station;
  const site = watchSites[shownStation];
  const postcard = !signed && receipt?.repaired != null;
  const photo = fieldSites[site.id];
  const collected = sampled(book.samples, station);
  const count = sampleCount(book.samples);
  const reading = incident.readings[station];
  const nextWork = site.works[book.works[station]];
  const historyCount = book.number - 1;
  const choosePledge = Boolean(receipt && book.number > 4 && book.number % 4 === 1);
  const pledge = watches[book.pledge];
  const gotoDesk = () => { setTab('调度单'); returnFocus(desk.current); };
  const move = (id: number) => { setStation(id); };
  const inspect = () => {
    if (!collected) { recordWatch({ type: 'sample', number: book.number, site: station, ticket }); return; }
    if (count >= 2) gotoDesk();
    else move(unanswered(book.samples, station));
  };
  const startShift = (backhaul: boolean, ordinary = false) => {
    setOrdinaryNumber(ordinary ? book.number : null);
    recordWatch({ type: 'start', number: book.number, pledge: nextPledge ?? book.pledge, backhaul });
    setOrder(null); setNextPledge(null); setTab('调度单'); setStation(0);
    returnFocus(scene.current);
  };
  const reserve = remaining >= 0 ? watchSites[remaining] : undefined;
  const repairPlan = !reserve ? '三站已齐，本班人手全部用于复核。'
    : book.backlog[remaining] ? '现在调度正确，' + reserve.ring + '会先清理旧工单。'
    : reserve.works[book.works[remaining]] ? '现在调度正确，' + reserve.ring + '能' + reserve.works[book.works[remaining]] + '。'
    : reserve.ring + '的设施已全部开放，可以直接交班。';

  return <main className="night-watch" lang="zh-CN">
    <div className="watch-shell">
      <header className="watch-mast">
        <button type="button" className="watch-back" onClick={onExit}><ArrowLeft size={16} />调查台</button>
        <h1 ref={heading} tabIndex={-1}><Moon size={19} />值夜巡查</h1>
        <span>{observerMemory.canPersist ? '随班存档' : '仅本页保存'}</span>
      </header>
      <header className="watch-brief">
        <small>第 {numberLabel(receipt?.number ?? book.number)} 班 <i /> {receipt ? '交班回执' : choosingLetter ? '居民来信 · 选择一封' : book.parcel ? book.parcel.from !== undefined ? '街区联运 · 回程捎货' : book.parcel.via === undefined ? '居民托付 · 第一程装货' : '居民托付 · 第二程签收' : '夜班来电'}</small>
        <h2 ref={scene} tabIndex={-1}>{choosingLetter ? offer.title : settledIncident?.title ?? incident.title}</h2>
        <p>{choosingLetter ? site.keeper + '：“' + offer.request + '”' : receipt ? receipt.choice === receipt.answer ? responder(receipt.kind) + '已回电。这一班的记录留在交班簿里。' : '现场已转交复检。你可以翻开回执，对照三环的原始读数。' : incident.call}</p>
        {canAccept && <button type="button" className="watch-text" onClick={() => {
          setOrdinaryNumber(choosingLetter ? book.number : null); setTab('调度单'); returnFocus(scene.current);
        }}>{choosingLetter ? '接常规巡查 · ' + incident.title : '拆开居民来信'}<ChevronRight size={14} /></button>}
      </header>
      <div className="watch-layout">
        <section className="watch-field" aria-label={receipt ? '本班交接' : '现场巡查'}>
          {!receipt && <nav className="watch-route" aria-label={choosingLetter ? '选择居民来信' : '选择巡查站'}>
            {watchSites.map((s, i) => <button type="button" key={s.id} data-stop={i} aria-pressed={i === shownStation} onClick={() => choosingLetter ? setSelectedLetter(i) : move(i)}>
              <span>{s.ring}</span><small>{choosingLetter ? s.keeper : sampled(book.samples, i) ? <><Check size={12} />已取样</> : s.place}</small>
            </button>)}
          </nav>}
          <div className="watch-photo" data-place={photo.englishName}>
            <ScenePhoto src={receipt && !postcard ? photo.image : photo.nearby.image} alt={receipt && !postcard ? photo.alt : photo.nearby.alt} />
            <div className="watch-caption">
              <small>{signed ? '收货回信' : postcard ? '居民来信' : receipt ? '交班现场' : site.keeper}</small>
              <h3>{signed ? site.keeper + '签收' : postcard ? site.works[receipt!.level - 1] : site.place}</h3>
              {!choosingLetter && <p>{signed ? shipmentLetter(signed).reply : postcard ? site.letters[receipt!.level - 1] : receipt ? '天亮以前，还有下一班人接手。' : '“' + incident.witnesses[station] + '”'}</p>}
            </div>
          </div>
          {receipt ? <div className="watch-action watch-result">
            <div><Handover receipt={receipt} />
              {nextReturn ? <p>{shipmentLetter(nextReturn).request} 下一班可以捎上，或另接巡查。</p> :
                signed && signed.from === undefined && signed.trip < 3 &&
                  <p>{site.keeper}在下一封信里提到了「{parcelLetter(signed.site, signed.trip + 1).title}」。</p>}
              {nextReturn && <button type="button" className="watch-text" onClick={() => startShift(false, true)}>另接普通巡查</button>}
            </div>
            {choosePledge && <fieldset className="watch-contracts"><legend>下一轮的四班约定</legend>
              {watches.map((w, i) => <label key={w.name}><input type="radio" name="next-pledge" checked={(nextPledge ?? book.pledge) === i}
                onChange={() => setNextPledge(i)} /><span><b>{w.name}</b><small>{w.note}</small></span></label>)}
            </fieldset>}
            <button className="watch-primary" type="button" onClick={() => startShift(Boolean(nextReturn))}>
              {nextReturn ? '接回程 · ' + shipmentLetter(nextReturn).title : book.parcel ? '接班 · ' + (book.parcel.from !== undefined ? '再运回程货' : book.parcel.via === undefined ? '重新托运' : '替居民签收') : '接第 ' + numberLabel(book.number) + ' 班'} <ArrowRight size={16} /></button>
          </div> : choosingLetter ? <div className="watch-action">
            <div><small>{site.ring} · 居民托付</small><strong>托运与签收</strong><p>本班选承运人，下一班接手交货。</p></div>
            <button className="watch-primary" type="button" onClick={() => {
              recordWatch({ type: 'accept', number: book.number, site: correspondent });
              setStation(correspondent); setSelectedLetter(null); setOrder(null); setTab('调度单'); returnFocus(scene.current);
            }}>接下这封信<ArrowRight size={16} /></button>
          </div> : <div className="watch-action">
            <div aria-live="polite" aria-atomic="true">
              <small>{incident.instrument} · {collected ? reading.label : '等候取样'}</small>
              <strong className={collected ? 'watch-value' : ''}>{collected ? reading.value : count === 2 ? '再走一站复核' : incident.sample}</strong>
              <p>{collected ? reading.detail : count === 2 ? '取第三份样本将用完本班机修人手。' : '任选两环取样，就能开出调度单。'}</p>
              {collected && incident.kind === 5 && <ListenClip key={site.id + book.number} sound={reading.value} />}
            </div>
            <button type="button" className="watch-primary" onClick={inspect}>
              {collected ? count >= 2 ? '去调度' : '去' + watchSites[unanswered(book.samples, station)].ring : '现场取样'}<ArrowRight size={16} />
            </button>
          </div>}
        </section>

        <aside className="watch-desk" data-page={tab} aria-label="值班记录">
          <nav className="watch-tabs" aria-label="巡查簿页面">{tabs.map(t => <button key={t} aria-pressed={tab === t} type="button" onClick={event => { revealPinnedTabs(event.currentTarget); setTab(t); }}>{t}</button>)}</nav>
          <div className="watch-paper">
            <div className="watch-page-body" ref={paperBody}>
              <div className="watch-page-heading">
                <h2 ref={desk} tabIndex={-1}>{tab === '调度单' ? receipt ? '本班回执' : choosingLetter ? '待办托付' : '站点联查' : tab}</h2>
                {tab === '调度单' && !receipt && !choosingLetter &&
                  <span>{count} / 3 份记录 · {count < 2 ? '两份可调度' : '可调度'}</span>}
              </div>
              {tab === '调度单' && (receipt ? <>
                <p className="watch-desk-intro">第 {numberLabel(receipt.number)} 班 · {settledIncident?.title}</p>
                <p className="watch-decision">{responder(receipt.kind)}核实 · {settledIncident?.choices[receipt.answer]}</p>
                {settledBook && <><p className="watch-reason">{settledIncident?.diagnosis}</p><Readings book={settledBook} kind={receipt.kind} mask={7} /></>}
                {receipt.choice !== receipt.answer && <p className="watch-reason">这一班你发出的是「{settledIncident?.choices[receipt.choice]}」。</p>}
                <button className="watch-text" type="button" onClick={() => { setTab('街区修缮'); returnFocus(desk.current); }}><Wrench size={15} />查看{site.ring}修缮<ChevronRight size={14} /></button>
              </> : choosingLetter ? <>
                <p className="watch-desk-intro">{site.keeper} · {delivered(book.deliveries, correspondent) < 3
                  ? '第 ' + (delivered(book.deliveries, correspondent) + 1) + ' 封来信' : '常班货单'}</p>
                <div className="watch-guide"><BookOpen size={16} /><p>随车直送，要核对末班时刻。托邮差接力，要按封缄找回原件。收到回信后可以在这里歇班。</p></div>
                <p>{delivered(book.deliveries, correspondent) === 0 ? '送成第一趟后，' + site.keeper + '会接你的值班电话，代抄本环的读数。'
                  : delivered(book.deliveries, correspondent) >= 2 ? '这趟可以带回程货。装货时选的承运人，会决定回程能去哪个街区。' : '上封信的回音，已经留在街区修缮簿里。'}</p>
              </> : <>
                {book.number > 4 && <div className="watch-pledge"><b>{pledge.name} · {pledgeProgress(book.pledge, book.history, book.number)} / {pledge.target}</b><p>{pledge.note}</p></div>}
                <Readings book={book} mask={book.samples} />
                {book.parcel && book.radioSite === undefined && watchSites.some((_, i) => delivered(book.deliveries, i) && !sampled(book.samples, i)) &&
                  <details><summary className="watch-text">请街坊代抄 · 本班一次</summary>
                    <p>先问一处读数，再选两站亲访。电话可省下第三站的机修人手。</p>
                    {watchSites.map((s, i) => delivered(book.deliveries, i) > 0 && !sampled(book.samples, i) &&
                      <button key={s.id} type="button" className="watch-text" onClick={() =>
                        recordWatch({ type: 'radio', number: book.number, ticket: ticket!, site: i })}>致电{s.keeper}</button>)}
                  </details>}
                <div className="watch-guide"><BookOpen size={16} /><div><p>{incident.guide}</p>
                  {incident.tracks.map(t => <p className="watch-track" key={t.name}><b>{t.name}</b>{t.sounds.join(' · ')}</p>)}
                </div></div>
                {count < 2 ? <div className="watch-await"><p>正确调度后，没去的那一环可以趁空修缮。三站全走则用满本班人手。</p>
                  <button className="watch-text" type="button" onClick={() => { if (collected) move(unanswered(book.samples, station)); returnFocus(scene.current); }}>回现场取样<ChevronRight size={14} /></button></div> : <>
                  <fieldset className="watch-orders"><legend>{incident.kind === 9 ? '哪辆回程车装得下？' : incident.kind === 6 ? '把货交给哪家？' : incident.kind === 7 ? '哪班车赶得上？' : incident.kind === 8 ? '谁拿着原封的包裹？' : incident.kind === 5 ? '接回哪一盘母带？' : incident.kind === 4 ? '请邮差交换哪两袋信？' : '给机修组哪条指令？'}</legend>
                    {incident.choices.map((label, i) => <label key={label}><input type="radio" name="watch-order" disabled={incident.kind === 6 && !sampled(book.samples, i) && book.radioSite !== i} value={i} checked={choice === i}
                      onChange={() => setOrder({ number: book.number, choice: i, ticket })} />{label}{incident.kind === 6 && !sampled(book.samples, i) && book.radioSite !== i ? '（待问询）' : ''}</label>)}
                  </fieldset>
                </>}
              </>)}
              {tab === '街区修缮' && <>
                <p className="watch-desk-intro">已完成 {book.works.reduce((a, b) => a + b, 0)} / 9 项 · 两站联查能留出机修时间</p>
                {watchSites.map((s, i) => <details className="watch-project" key={s.id} open={i === shownStation || undefined}>
                  <summary><Wrench size={14} /><span>{s.ring} · {s.place}</span><b>{book.works[i]} / 3</b></summary>
                  {delivered(book.deliveries, i) > 0 && <div className="watch-letter"><p>{s.keeper}已接入值班电话 · 累计签收 {delivered(book.deliveries, i)} 趟</p>
                    {Array.from({ length: Math.min(3, delivered(book.deliveries, i)) }, (_, j) => {
                      const letter = parcelLetter(i, j + 1);
                      return <details key={j}><summary>{letter.title} · 收货回信</summary><blockquote>{letter.reply}</blockquote></details>;
                    })}</div>}
                  {watchSites.map((source, from) => {
                    if (from === i) return null;
                    const runs = book.returnTrips?.[linkIndex(from, i)];
                    if (!runs) return null;
                    const letter = returnLetter(from, i);
                    return <details className="watch-letter" key={source.id}><summary>{source.ring}来货 · {letter.title}（{runs} 趟）</summary>
                      <blockquote>{letter.reply}</blockquote></details>;
                  })}
                  {book.backlog[i] > 0 && <p>{book.backlog[i]} 张复检单待清，本环机修组优先复检。</p>}
                  <ul>{s.works.map((work, level) => <li key={work}>
                    {level < book.works[i] ? <details className="watch-letter" open={level + 1 === book.works[i]}>
                      <summary><Check size={15} aria-label="已完工" /><b>{work}</b><small>来信</small><ChevronRight size={14} aria-hidden="true" /></summary>
                      <blockquote><p>{s.letters[level]}</p><cite>—— {s.keeper}</cite></blockquote>
                    </details> : <span className="watch-unfinished"><span aria-hidden="true">○</span>{work}</span>}
                  </li>)}</ul>
                </details>)}
              </>}
              {tab === '交班簿' && <>
                <p className="watch-desk-intro">累计交班 {historyCount} 次 · 保留最近十二班回执</p>
                {book.number > 4 && <p className="watch-stamps">{watches.map((w, i) => <span key={w.name}>{w.stamp} × {book.stamps[i]}</span>)}</p>}
                {book.history.length ? book.history.map(r => <details className="watch-log" key={r.number}>
                  <summary><small>{numberLabel(r.number)}</small><span>{receiptTitle(r)}</span><b>{r.answer === r.choice ? '生效' : '复检'}</b></summary>
                  <Handover receipt={r} />
                </details>) : <div className="watch-empty"><ClipboardList size={23} /><p>第一班结束后，可以在这里复盘三环读数和调度结果。</p></div>}
              </>}
            </div>
            {tab === '调度单' && !receipt && !choosingLetter && count >= 2 && <div className="watch-dispatch-actions">
              <p className="watch-plan">{repairPlan}</p>
              {reserve && <button className="watch-text watch-recheck" type="button" onClick={() => {
                move(remaining); returnFocus(scene.current);
              }}>去{reserve.ring}加查一站<ChevronRight size={14} /></button>}
              <button className="watch-submit" type="button" disabled={choice === null} onClick={() => {
                if (choice === null) return;
                recordWatch({ type: 'dispatch', number: book.number, choice, ticket }); returnFocus(scene.current);
              }}><Radio size={16} />发出调度单<ArrowRight size={15} /></button>
            </div>}
          </div>
        </aside>
      </div>
      {!receipt && !choosingLetter && <footer className="watch-foot"><span>{site.ring} · {book.backlog[station] ? book.backlog[station] + ' 张待复检工单' : '值班员在岗'}</span><span>{nextWork ? '街区盼望 · ' + nextWork : '夜间设施已开放'}</span></footer>}
    </div>
  </main>;
}

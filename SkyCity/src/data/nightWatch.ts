import { delivered, freightIncident, freightRoute, linkIndex, parcelKey, parcelLetter, returnLetter, returnDestination, shipmentLetter, validParcel } from './nightFreight';
import type { Parcel } from './nightFreight';
import type { DepartureChoice } from './caseFiles';

export const watchSites = [
  { id: 'apex', ring: '上环', place: '候车长廊', keeper: '末班车站务员', works: ['点亮候车灯', '修好报站钟', '重开夜班候车室'],
    letters: ['我把末班牌挂回灯下了。老人终于看得清时间。', '钟响的时候，打盹的乘客也抬起了头。', '今夜候车室重新开门。第一位进来的，是拎着茶壶的夜班司机。'] },
  { id: 'mid_ring', ring: '中环', place: '檐下的茶摊', keeper: '守摊的阿禾', works: ['接回摊灯', '修好保温炉', '重开通宵茶摊'],
    letters: ['我把最后一盏灯留给收摊的人。', '炉子能温一整夜。巡道回来，记得喝一口。', '头班车还没到，三张桌子都坐满了。今后经过，给你留位。'] },
  { id: 'foundation', ring: '下环', place: '塔底检修口', keeper: '栈桥检修员', works: ['接通引路灯', '换好栈桥扶手', '重开云下步道'],
    letters: ['交班的人顺着灯走，全程都看得见下一阶。', '新扶手还带着木头味。我们卸下最后一段警戒绳。', '今早有人从步道送花上来。云底也有春天，你信吗？'] },
] as const;

const incidents = [
  { title: '长廊里的三声钟', call: '末班车进站前，三环的报时钟接连响起。站务员把三张走纸留给了你。', instrument: '走纸钟', sample: '抄下起响时刻', unit: '秒',
    guide: '看同一分钟内谁先响。上环先响、往下逐站推迟，查站钟。下环先响、往上推迟，查井底中继。各站同秒响，校准总钟。',
    choices: ['校正站台母钟', '检修井底中继', '校准全城总钟'], witnesses: ['我听见钟，才看见车头。', '我把茶杯贴在了钟座上。', '值班表上的三只钟对过时。'] },
  { title: '雨棚下的灯', call: '夜市收摊时，檐灯忽明忽暗。每处分表都留着亮灯前后的一对数字。', instrument: '支路电表', sample: '抄下前后电流', unit: '安',
    guide: '用亮灯后的电流减去之前的电流。只有一环增幅超过 6 安，其余两环都在 3 安以内。把备用电源接到增幅最大的那一环。',
    choices: ['给站台支路分流', '给市集支路分流', '给栈桥支路分流'], witnesses: ['站台空下来，灯还亮着。', '炉子熄了，檐灯却闪了一下。', '我把分表的两根指针都记下了。'] },
  { title: '晚到的货箱', call: '一只蓝色货箱赶不上交接。三环卸货员都在联单上盖了计划与实际两枚时间戳。', instrument: '货运联单', sample: '拓下交接戳', unit: '分',
    guide: '比较每一站比计划晚了几分钟。延误往下逐站增加，调整下行班距。往下逐站减少，调整上行班距。三环延误相同，补发始发车。',
    choices: ['调整下行班距', '调整上行班距', '补发始发班车'], witnesses: ['货签是蓝色的，雨水没洇开。', '我没拆箱，两枚交接戳都在。', '车门一开，老丁就按了记时器。'] },
  { title: '雾里的呼应灯', call: '引航员说，云里有一条灯带吞掉了回闪。各环都替你数过灯了。', instrument: '引航灯簿', sample: '核对发灯与回闪', unit: '次',
    guide: '每发一盏灯应收到一次回闪。只有一环缺回闪，另两环收发相等。请把引航员派到缺灯的那一段。',
    choices: ['复查上环灯带', '复查中环灯带', '复查下环灯带'], witnesses: ['玻璃上的倒影没有算进账。', '数完最后一盏，茶正好凉了。', '我在灯带下面整整数了一轮。'] },
  { title: '末班夜邮', call: '三封夜信到了转运架，两环的邮袋被对调。寄件人还在等回信。', instrument: '袋口邮签', sample: '核验封签', unit: '枚',
    guide: '封签刻着这袋信应送到的街区。找到被对调的两环，让邮差把两袋换回去。',
    choices: ['交换上环与中环邮袋', '交换中环与下环邮袋', '交换下环与上环邮袋'], witnesses: ['这封信上，邮戳还是湿的。', '阿禾把邮袋搁在了干燥的炉台。', '邮差没有拆封，只让你看袋口。'] },
  { title: '谁在点晚安曲', call: '电台收到一段分送三环的点播，每环只录到一个声音。把它们拼回去，好让夜班听众等到最后一段。', instrument: '收听记录', sample: '试听本环留声', unit: '段',
    guide: '按上环、中环、下环的顺序，对照电台的三盘母带。',
    choices: ['接回《归航》', '接回《桥上人家》', '接回《听潮》'], witnesses: ['候车室里的人把收音机开小了一点。', '茶摊今晚有个客人，专程来等一首歌。', '交班铃响过，井道里还有余音。'] },
] as const;

const swappedStops = [[1,0,2], [0,2,1], [2,1,0]];
const tapeOrders = [[0,1,2], [2,0,1], [0,2,1]];
const soundBanks = [['檐铃', '汽笛', '水声'], ['雨点', '车铃', '木鱼'], ['潮音', '钟声', '竹笛']];
const nightDeck = [4, 1, 3, 0, 5, 2];

export function affectedDistrict(kind: number, answer: number) {
  return kind === 0 || kind === 2 ? [0, 2, 1][answer] : answer;
}

export const watches = [
  { name: '三环互助', note: '四班内，给三个不同街区各留一次人手。', target: 3, stamp: '三环联络章' },
  { name: '全线复核', note: '四班内，至少三班查全三站并正确调度。', target: 3, stamp: '全线复核章' },
  { name: '准点交班', note: '连续四班，两站取样后正确调度。', target: 4, stamp: '准点交接章' },
] as const;

export interface WatchReceipt {
  parcel?: Parcel;
  number: number;
  kind: number;
  answer: number;
  choice: number;
  samples: number;
  prior: number[];
  award?: number;
  repaired: number | null;
  level: number;
}
export interface WatchBook {
  parcel?: Parcel;
  deliveries?: number[];
  returnTrips?: number[];
  radioSite?: number;
  number: number;
  open: boolean;
  samples: number;
  backlog: number[];
  works: number[];
  history: WatchReceipt[];
  pledge: number;
  stamps: number[];
}
export const initialWatch: WatchBook = { number: 1, open: true, samples: 0, backlog: [0, 0, 0], works: [0, 0, 0], history: [], pledge: 0, stamps: [0, 0, 0] };
export const watchKinds = incidents;
export const sampled = (mask: number, site: number) => Boolean(mask & (1 << site));
export const sampleCount = (mask: number) => watchSites.filter((_, i) => sampled(mask, i)).length;
export function offeredReturn(book: WatchBook): Parcel | undefined {
  const last = book.history[0];
  const j = last?.parcel;
  if (book.open || !j || last.choice !== last.answer || j.via === undefined) return;
  const site = returnDestination(j);
  if (site === undefined) return;
  return { from: j.site, site, start: book.number, permit: j.permit,
    trip: (book.returnTrips?.[linkIndex(j.site, site)] ?? 0) + 1 };
}

export function streetReply(book: WatchBook | undefined, site: number) {
  if (!book || site < 0) return;
  const recent = book.history.find(r => r.parcel?.site === site && r.kind >= 7 && r.choice === r.answer)?.parcel;
  if (recent) return shipmentLetter(recent);
  const count = delivered(book.deliveries, site);
  if (count) return parcelLetter(site, count);
  const source = watchSites.findIndex((_, i) => i !== site && book.returnTrips?.[linkIndex(i, site)]);
  if (source >= 0) return returnLetter(source, site);
}

export function nextResident(book?: WatchBook) {
  const last = book?.history[0];
  if (last?.parcel && last.parcel.from === undefined && last.kind > 6 && last.answer === last.choice && last.parcel.trip < 3) return last.parcel.site;
  const counts = book?.deliveries ?? [0, 0, 0];
  return counts.indexOf(Math.min(...counts));
}

export function watchResume(book?: WatchBook, filed = false) {
  if (book?.parcel) {
    const parcel = book.parcel;
    const title = shipmentLetter(parcel).title;
    return { label: '续办「' + title + '」', detail: watchSites[parcel.site].keeper + '在等 · ' +
      (parcel.from !== undefined ? '捎回程货' : parcel.via === undefined ? '替居民寻找承运人' : freightRoute(parcel) === '直送' ? '接最后一程车' : '替收货人核验封缄') };
  }
  const nextReturn = book && offeredReturn(book);
  if (nextReturn) return { label: '顺路捎一件回程货', detail: shipmentLetter(nextReturn).title + ' · ' + watchSites[nextReturn.site].keeper + '等你接班' };
  if (filed && !book?.samples) {
    const counts = book?.deliveries ?? [0, 0, 0];
    const site = nextResident(book);
    return { label: '值夜巡查 · 居民来信', detail: watchSites[site].keeper + '托你捎一趟「' + parcelLetter(site, counts[site] + 1).title + '」' };
  }
  if (!book) return { label: '值夜巡查', detail: '接一班巡查，帮三环修好夜间设施' };
  if (!book.open) return { label: '读第 ' + (book.number - 1) + ' 班回执', detail: '查看处置结果，准备接下一班' };
  const count = sampleCount(book.samples);
  const step = count >= 2 ? '可开调度单' : count ? '再访一站可调度' : '任选一站开始';
  return { label: '继续第 ' + book.number + ' 班', detail: '已取样 ' + count + ' / 3 · ' + step };
}
const limits = (v: unknown, lo: number, hi: number): v is number => Number.isSafeInteger(v) && Number(v) >= lo && Number(v) <= hi;
function noise(seed: number) {
  let v = Math.imul(seed ^ (seed >>> 16), 0x45d9f3b);
  v = Math.imul(v ^ (v >>> 16), 0x45d9f3b);
  return (v ^ (v >>> 16)) >>> 0;
}

export function watchIncident(book: WatchBook, filedKind?: number) {
  if (book.parcel) return freightIncident(book.parcel, book.number);
  const { number, backlog } = book;
  const block = Math.floor((number - 1) / 4);
  const kind = filedKind ?? (number < 9 ? ((number - 1) * (block % 2 ? 3 : 1) + block * 2) % 4
    : nightDeck[(number - 9) % nightDeck.length]);
  const seed = noise(number * 131 + backlog[0] * 23 + backlog[1] * 11 + backlog[2] * 7);
  const answer = seed % 3;
  const base = 3 + (seed >>> 12) % 23;
  const stride = 2 + (seed >>> 20) % 4;
  const data = incidents[kind];
  const offsetSite = number > 4 && kind < 4 ? (seed >>> 17) % 3 : -1;
  const offset = 2 + (seed >>> 8) % 4;
  const sounds = soundBanks[(seed >>> 11) % soundBanks.length];
  const tracks = kind === 5 ? tapeOrders.map((order, i) => ({ name: ['归航', '桥上人家', '听潮'][i], sounds: order.map(v => sounds[v]) })) : [];
  const readings = watchSites.map((_, index) => {
    if (kind === 4) return { label: '邮签目的地', value: watchSites[swappedStops[answer][index]].place, detail: '留验人 · ' + watchSites[index].keeper, corrected: 0 };
    if (kind === 5) return { label: '本环录到', value: tracks[answer].sounds[index], detail: '夜间点播 · 第 ' + (index + 1) + ' 段', corrected: 0 };
    const local = noise(seed + index) % 5;
    const bias = index === offsetSite ? offset : 0;
    const correction = (plain: string, field: string) => bias ? field + '偏高 ' + bias + ' ' + data.unit + '，先扣除偏差' : plain;
    const delay = base + (answer === 2 ? 0 : answer === 0 ? index : 2 - index) * stride;
    if (kind === 0) return { label: '起响时刻', corrected: delay, value: '02:17:' + String(delay + bias).padStart(2, '0'), detail: correction('已对齐当地时钟', '走纸读数') };
    if (kind === 1) {
      const before = 18 + local * 3 + backlog[index];
      const rise = index === answer ? 8 + local : local % 4;
      return { label: '亮灯前 → 后', corrected: rise, value: before + ' → ' + (before + rise + bias) + ' A', detail: correction('同一支路 · 间隔一分钟', '后一次读数') };
    }
    if (kind === 2) {
      const planned = 6 + index * 7;
      const clock = (m: number) => '0' + (2 + Math.floor(m / 60)) + ':' + String(m % 60).padStart(2, '0');
      return { label: '计划 → 实到', corrected: delay, value: clock(planned) + ' → ' + clock(planned + delay + bias), detail: correction('同一货箱 · 蓝色联单', '实到戳') };
    }
    const sent = 8 + local + backlog[index];
    const missing = index === answer ? 2 + local : 0;
    return { label: '发灯 → 回闪', corrected: missing, value: sent + ' → ' + (sent - missing + bias) + ' 次', detail: correction('同一轮灯序 · 已扣除倒影', '回闪读数') };
  });
  const values = readings.map(r => r.corrected).join('、');
  const trend = answer === 2 ? '三环一致' : answer === 0 ? '自上而下逐站增加' : '自下而上逐站增加';
  const reasons = [
    '三环分别在第 ' + values + ' 秒起响，起响时刻' + trend + '。',
    '三环电流分别增加 ' + values + ' 安，只有' + watchSites[answer].ring + '超过 6 安。',
    '三环分别晚到 ' + values + ' 分钟，延误' + trend + '。',
    '三环分别缺 ' + values + ' 次回闪，缺灯点在' + watchSites[answer].ring + '。',
    '三处邮签依次写着' + readings.map(r => r.value).join('、') + '。对调的两袋按封签换回。',
    '三环连起来是' + readings.map(r => r.value).join('、') + '，恰好是这盘母带的顺序。',
  ];
  return { ...data, kind, answer, readings, tracks, diagnosis: (offsetSite < 0 ? '' : '校正仪表后，') + reasons[kind] };
}

export type WatchAction =
  | { type: 'accept'; number: number; site: number }
  | { type: 'sample'; number: number; site: number; ticket?: string }
  | { type: 'radio'; number: number; site: number; ticket: string }
  | { type: 'dispatch'; number: number; choice: number; ticket?: string }
  | { type: 'start'; number: number; pledge?: number; backhaul?: boolean };

export function pledgeProgress(pledge: number, history: WatchReceipt[], number: number) {
  const first = number - (number - 1) % 4;
  const matches = history.filter(r => r.number >= first && r.number <= number && r.answer === r.choice);
  if (pledge === 1) return matches.filter(r => r.samples === 7).length;
  const timely = matches.filter(r => r.samples !== 7);
  if (pledge === 2) return timely.length;
  return new Set(timely.map(r => r.samples)).size;
}

export function advanceWatch(book: WatchBook, action: WatchAction, permit?: DepartureChoice | 'local'): WatchBook {
  if (action.number !== book.number) return book;
  if (action.type === 'start') {
    if (book.open) return book;
    const pledge = book.number > 4 && book.number % 4 === 1 && limits(action.pledge, 0, 2) ? action.pledge : book.pledge;
    const parcel = action.backhaul ? offeredReturn(book) : book.parcel;
    if (action.backhaul && !parcel) return book;
    return { ...book, open: true, pledge, ...(parcel && { parcel }) };
  }
  if (!book.open) return book;
  if (action.type === 'accept') {
    if (!permit || book.parcel || book.samples || !limits(action.site, 0, 2)) return book;
    return { ...book, parcel: { site: action.site, trip: delivered(book.deliveries, action.site) + 1, start: book.number, permit } };
  }
  if (action.ticket !== parcelKey(book.parcel)) return book;
  if (action.type === 'radio') {
    if (!book.parcel || book.radioSite !== undefined || !limits(action.site, 0, 2)
      || sampled(book.samples, action.site) || !delivered(book.deliveries, action.site)) return book;
    return { ...book, radioSite: action.site };
  }
  if (action.type === 'sample') {
    if (!limits(action.site, 0, 2) || sampled(book.samples, action.site)) return book;
    return { ...book, samples: book.samples | (1 << action.site) };
  }
  if (!limits(action.choice, 0, 2) || sampleCount(book.samples) < 2) return book;
  const incident = watchIncident(book);
  const kind = incident.kind;
  const parcel = book.parcel;
  if (kind === 6 && !sampled(book.samples, action.choice) && book.radioSite !== action.choice) return book;
  const answer = kind === 6 && parcel && freightRoute(parcel, action.choice) ? action.choice : incident.answer;
  const correct = action.choice === answer;
  const backlog = [...book.backlog];
  const works = [...book.works];
  const remaining = watchSites.findIndex((_, i) => !sampled(book.samples, i));
  let repaired = null;
  if (correct) {
    // A correct dispatch clears an outstanding call. A two-stop route also leaves a crew for local work.
    for (let i = 0; i < backlog.length; i++) {
      backlog[i] = Math.max(0, backlog[i] - 1);
    }
    if (remaining >= 0 && book.backlog[remaining] === 0 && works[remaining] < 3) {
      repaired = remaining;
      works[remaining]++;
    }
  } else {
    const affected = parcel?.site ?? affectedDistrict(kind, answer);
    backlog[affected] = Math.min(3, backlog[affected] + 1);
  }
  const receipt: WatchReceipt = { ...(parcel && { parcel }), number: book.number, kind, answer, choice: action.choice, samples: book.samples,
    prior: [...book.backlog], repaired, level: repaired === null ? 0 : works[repaired] };
  const history = [receipt, ...book.history].slice(0, 12);
  const stamps = [...book.stamps];
  if (book.number > 4 && book.number % 4 === 0 && pledgeProgress(book.pledge, history, book.number) >= watches[book.pledge].target) {
    receipt.award = book.pledge;
    stamps[book.pledge]++;
  }
  let pending = parcel;
  let deliveries = book.deliveries;
  let returnTrips = book.returnTrips;
  if (parcel && correct) {
    if (parcel.from !== undefined) {
      returnTrips = [...(returnTrips ?? [0, 0, 0, 0, 0, 0])];
      returnTrips[linkIndex(parcel.from, parcel.site)]++;
      pending = undefined;
    } else if (parcel.via === undefined) pending = { ...parcel, via: action.choice };
    else {
      deliveries = [...(deliveries ?? [0, 0, 0])];
      deliveries[parcel.site]++;
      pending = undefined;
    }
  }
  return { ...(pending && { parcel: pending }), ...(deliveries && { deliveries }), ...(returnTrips && { returnTrips }), number: book.number + 1, open: false, samples: 0, backlog, works, history, stamps, pledge: book.pledge };
}

export function validWatch(value: unknown): value is WatchBook {
  if (!value || typeof value !== 'object') return false;
  const b = value as WatchBook;
  const trio = (a: unknown) => Array.isArray(a) && a.length === 3 && a.every(v => limits(v, 0, 3));
  if (!limits(b.number, 1, 1000000000) || typeof b.open !== 'boolean' || !limits(b.samples, 0, 7)
    || (!b.open && (b.samples !== 0 || b.number < 2)) || !trio(b.works) || !trio(b.backlog)
    || !limits(b.pledge, 0, 2) || !Array.isArray(b.stamps) || b.stamps.length !== 3 || !b.stamps.every(v => limits(v, 0, Math.floor(b.number / 4)))
    || !Array.isArray(b.history) || b.history.length !== Math.min(12, b.number - 1)) return false;
  if (b.deliveries !== undefined && (!Array.isArray(b.deliveries) || b.deliveries.length !== 3
    || !b.deliveries.every(n => limits(n, 0, b.number - 1)) || 2 * b.deliveries.reduce((sum, n) => sum + n, 0) > b.number - 1)) return false;
  if (b.returnTrips !== undefined && (!Array.isArray(b.returnTrips) || b.returnTrips.length !== 6
    || !b.returnTrips.every(n => limits(n, 0, b.number - 1))
    || b.returnTrips.reduce((sum, n) => sum + n, 0) > (b.deliveries ?? []).reduce((sum, n) => sum + Math.max(0, n - 2), 0))) return false;
  if (b.parcel !== undefined && (!validParcel(b.parcel, b.number)
    || b.parcel.trip !== 1 + (b.parcel.from === undefined ? delivered(b.deliveries, b.parcel.site) : b.returnTrips?.[linkIndex(b.parcel.from, b.parcel.site)] ?? 0))) return false;
  if (b.radioSite !== undefined && (!b.open || !b.parcel || !limits(b.radioSite, 0, 2) || !delivered(b.deliveries, b.radioSite))) return false;
  return b.history.every((r, i) => r && r.number === b.number - i - 1 && limits(r.kind, 0, 9)
    && (r.kind < 6 ? r.parcel === undefined : validParcel(r.parcel, r.number)
      && freightIncident(r.parcel, r.number).kind === r.kind)
    && (r.award === undefined || (limits(r.award, 0, 2) && r.number > 4 && r.number % 4 === 0 && b.stamps[r.award] > 0))
    && trio(r.prior) && limits(r.choice, 0, 2) && limits(r.answer, 0, 2) && limits(r.samples, 0, 7) && sampleCount(r.samples) >= 2
    && (r.repaired === null ? r.level === 0 : limits(r.repaired, 0, 2) && !sampled(r.samples, r.repaired)
      && r.answer === r.choice && limits(r.level, 1, 3) && r.level <= b.works[r.repaired]));
}

// A longer run wins. For concurrent dispatches on one shift, choose one complete timeline;
// samples from two tabs can be combined only when both tabs saw the same handover.
export function mergeWatch(a?: WatchBook, b?: WatchBook): WatchBook | undefined {
  if (!a || !b) return a ?? b;
  if (a.number !== b.number) return a.number > b.number ? a : b;
  const checkpoint = (book: WatchBook) => JSON.stringify([book.history, book.backlog, book.works, book.stamps, book.deliveries, book.returnTrips]);
  const left = checkpoint(a), right = checkpoint(b);
  if (left !== right) return left < right ? a : b;
  if (a.open !== b.open) return a.open ? a : b;
  if (a.pledge !== b.pledge) return a.pledge < b.pledge ? a : b;
  if (Boolean(a.parcel) !== Boolean(b.parcel)) return a.parcel ? a : b;
  if (a.parcel && b.parcel) {
    const l = parcelKey(a.parcel)!, r = parcelKey(b.parcel)!;
    if (l !== r) return l < r ? a : b;
  }
  const radioSite = a.radioSite === undefined ? b.radioSite : b.radioSite === undefined ? a.radioSite : Math.min(a.radioSite, b.radioSite);
  const samples = a.samples | b.samples;
  const open = a.open || b.open;
  return samples === a.samples && open === a.open && a.radioSite === radioSite ? a : { ...a, samples, open, radioSite };
}

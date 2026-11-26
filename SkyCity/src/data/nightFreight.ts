import type { DepartureChoice } from './caseFiles';

export interface Parcel {
  site: number;
  trip: number;
  start: number;
  permit: DepartureChoice | 'local';
  via?: number;
  from?: number;
}

const lines = [
  { ring: '上环', sender: '末班车站务员', requests: [
    ['长椅上的旧坐垫', '候车室的长椅凉得坐不住。我托裁缝缝了三块厚坐垫，头班车来前能捎上来吗？', '坐垫铺好了。第一个坐下的是连上三夜班的售票员，她睡过了报站钟。'],
    ['一盏矮一点的灯', '有个孩子总在长椅底下看书。旧书店找出一盏矮灯，麻烦你接回来。', '孩子把书摊在新灯下面，给每个等车的人读了一段。'],
    ['给失物留个抽屉', '那孩子捡到一串钥匙。木匠做了个新抽屉，说我们也该有个失物招领处。', '第一串钥匙有人认领了。抽屉里多了一张手写的谢条。'],
  ], errands: [
    ['换洗的椅套', '洗衣铺打烊了，把干净椅套留在门房。老座位有人等着，劳你带回来。', '椅套还有晒过的味道。有个熟客一进门就认出了自己的座位。'],
    ['夜读会的新书', '上回的书读完了，孩子们在还书袋里放了张借书单。书店已经配齐。', '新书里夹了店员画的地图。今晚读到哪里，孩子们就把站名指到哪里。'],
    ['失物登记纸', '招领本写到了封底。印刷铺裁了一叠新纸，托你送到候车室。', '我把新页装订好了。第一条失物是把红伞，第二条就写着已领回。'],
  ] },
  { ring: '中环', sender: '守摊的阿禾', requests: [
    ['缺了盖的茶壶', '还有一壶茶要留给收摊的人。烧窑师傅配好了壶盖，劳你跑一趟。', '盖子严丝合缝。我给最晚来的搬运工斟茶时，壶嘴还冒着汽。'],
    ['十二只粗瓷杯', '那几个搬运工开始带人来喝茶，摊子上已经轮不到杯子了。', '十二只杯子倒扣在炉边。最后一只，大家说给值夜的人留着。'],
    ['写给夜班的菜单', '客人想点碗热汤。字写得最好的老周，替我写了第一张夜班菜单。', '菜单挂起来了。第一碗汤没有卖，送给了替我们送杯子的人。'],
  ], errands: [
    ['今夜的焙茶', '旧茶罐见底了，焙茶师把新茶装进铁盒。我想让末班的客人先尝第一泡。', '客人抿了一口，说今天这杯有点栗子味。我把这句话记在了罐底。'],
    ['炉边的一篓青菜', '卖菜婆婆留了一篓嫩叶。趁炉火还旺，想给夜班的汤添点绿。', '汤叶一浮起来，摊前就有人敲着碗要续。今夜连菜梗都没剩。'],
    ['常客预订的茶点', '今夜收工的人多。糕铺刚蒸好一笼小点，留着笼纸，别让它吹干。', '掀盖时热气扑了我一脸。最迟来的客人，也拿到了一块完整的。'],
  ] },
  { ring: '下环', sender: '栈桥检修员', requests: [
    ['云底的种子', '上环花房分给我一袋种子。桥脚背风，我想试试能不能种活。', '种子埋下了。我把护栏刷剩的一点白漆，点在花盆旁边。'],
    ['第一片新叶', '第一片叶子长出来了。下班风大，得在它旁边支块挡风玻璃。', '玻璃立住了。交班的人排着看那一片新叶，谁都没有伸手碰。'],
    ['送给头班车的花', '第一朵花开了。借一个细口瓶，我想把它搁在头班车经过的窗边。', '花映在第一班车的窗上。有位乘客举起了手，我也向他挥了挥。'],
  ], errands: [
    ['花房的育苗土', '新苗的根从盆底钻出来了。花房答应给我们一袋松土，正好赶今晚换盆。', '新土铺下去，栈桥头一回有了雨后泥地的气味。'],
    ['檐沟的接水罐', '最近露水大。陶工做了只矮罐，放在檐沟下，够浇两排花。', '天亮时罐子已经半满。有只鸟先喝了一口，我们就让它喝了。'],
    ['换季的花签', '上批花签的字褪了。帮我带一捆新签来，工友已经想好了每一盆的名字。', '最小的那盆叫“别踩”。我念出来的时候，连巡桥员都笑了。'],
  ] },
] as const;

export function parcelLetter(site: number, trip: number) {
  const line = lines[site];
  const [title, request, reply] = line.requests[trip - 1] ?? line.errands[(trip - 4) % line.errands.length];
  return { title, request, reply };
}

const returns = [
  ['一笼夜读会的茶点', '站务员把夜读会剩下的点心装了笼，托你带给忙了一晚的阿禾。', '我把这笼点心分给了头班来喝茶的人。他们说，上环的芝麻真香。'],
  ['给栈桥的旧站牌', '候车室换了路牌，检修员想把旧的那块立在桥头，给散步的人指路。', '旧站牌立好了。从桥上抬头，正能看见原来挂它的那扇窗。'],
  ['给桥下的热汤', '阿禾熄炉前留了半桶汤。栈桥刚交班，正赶得上。', '汤到桥下还有热气。最后一个收工的人把桶底刮得干干净净。'],
  ['候车室的早茶', '夜读的人还在等头班车。阿禾把茶壶塞进保温筐，让你捎回长廊。', '候车室开始有茶香了。司机说，下次停站也要来讨一杯。'],
  ['窗边的压花书签', '检修员夹干了桥下的花，听说候车室有人读书，想给他们做书签。', '这晚借出去的每一本书，里面都夹着一片来自云底的花瓣。'],
  ['茶摊的新薄荷', '桥脚的薄荷分了株。检修员想让阿禾尝尝，茶盏里能不能养住。', '薄荷在杯里立起来了。如今路过摊子，闻得到桥下的味道。'],
] as const;

export const linkIndex = (from: number, to: number) => from * 2 + Number(to !== (from + 1) % 3);
export function shipmentLetter(j: Parcel) {
  if (j.from === undefined) return parcelLetter(j.site, j.trip);
  return returnLetter(j.from, j.site);
}

export function returnLetter(from: number, site: number) {
  const [title, request, reply] = returns[linkIndex(from, site)];
  return { title, request, reply };
}

export function returnDestination(parcel: Parcel, via = parcel.via) {
  const service = freightRoute(parcel, via);
  if (parcel.from !== undefined || parcel.trip < 3 || !service) return;
  return (parcel.site + (service === '直送' ? 1 : 2)) % 3;
}

export function delivered(totals: number[] | undefined, site: number) {
  return totals?.[site] ?? 0;
}

export const parcelKey = (j?: Parcel) => j && [j.start, j.site, j.trip, j.permit, j.via ?? '-', j.from ?? '-'].join('/');

export function freightRoute(parcel: Parcel, via = parcel.via) {
  const direct = (parcel.start + parcel.site + parcel.trip) % 3;
  const relay = (direct + 1 + (parcel.trip + parcel.start) % 2) % 3;
  return via === direct ? '直送' : via === relay ? '接力' : null;
}

export function validParcel(input: unknown, number: number): input is Parcel {
  if (!input || typeof input !== 'object') return false;
  const j = input as Parcel;
  const station = (n: number) => Number.isInteger(n) && n >= 0 && n < 3;
  return station(j.site) && Number.isSafeInteger(j.trip) && j.trip >= 1 && j.trip <= j.start
    && Number.isSafeInteger(j.start) && j.start >= 1 && j.start <= number
    && ['local','hold','clear'].includes(j.permit)
    && (j.from === undefined || (station(j.from) && j.from !== j.site && j.via === undefined))
    && (j.via === undefined || (station(j.via) && j.start < number && freightRoute(j) !== null));
}

const rings = lines.map(s => s.ring);
const knots = ['双环结', '燕尾结', '十字结', '平结'];
const seals = ['青瓷印', '桥灯印', '云纹印', '铜铃印'];
const clock = (minutes: number) => String(Math.floor(minutes / 60)).padStart(2, '0') + ':' + String(minutes % 60).padStart(2, '0');

export function freightIncident(parcel: Parcel, number: number) {
  const letter = shipmentLetter(parcel);
  const route = freightRoute(parcel);
  const kind = parcel.from !== undefined ? 9 : route === '直送' ? 7 : route === '接力' ? 8 : 6;
  const seed = ((Math.imul(number, 2654435761) ^ Math.imul(parcel.start + parcel.trip, 1597334677)) >>> 0);
  const firstTrain = seed % 3;
  const service = parcel.permit === 'hold' ? 2 : parcel.permit === 'local' ? 1 : 0;
  const correct = kind === 7 ? (firstTrain + service) % 3 : firstTrain;
  const weight = 5 + (seed >>> 9) % 11;
  const first = 152 + (seed >>> 6) % 65;
  const delay = parcel.permit === 'clear' ? 0 : parcel.permit === 'hold' ? 3 : 1;
  const release = first + delay;
  const due = first + 9 + service * 3 + (seed >>> 15) % 2;
  const code = (seed >>> 20) % 4;
  const tie = (seed >>> 12) % 4;
  const direct = rings.findIndex((_, i) => freightRoute(parcel, i) === '直送');
  const relay = rings.findIndex((_, i) => freightRoute(parcel, i) === '接力');
  const line = lines[parcel.site];
  const permit = parcel.permit === 'clear' ? 'Q-17 已放行，货到即可换乘' : parcel.permit === 'hold' ? 'Q-17 仍停靠，人工签放需 3 分钟' : '按常规货单验签 1 分钟';
  const readings = rings.map((_, i) => {
    if (kind === 9) {
      const empty = i === (correct + 1) % 3 ? weight - 2 : weight + (seed >>> i) % 4;
      const loaded = 3 + (seed >>> (i + 4)) % 8;
      const wrap = i === (correct + 2) % 3 ? '敞舱' : '有盖';
      return { label: '核载 / 已装', value: (empty + loaded) + ' / ' + loaded + ' 公斤', detail: '回程货舱 · ' + wrap, corrected: empty };
    }
    if (kind === 6) {
      const service = freightRoute(parcel, i);
      const capacity = service ? weight + ((seed >>> (i + 2)) % 4) : weight - 1 - (seed % 3);
      const partner = returnDestination(parcel, i);
      const detail = service === '接力' ? '邮差接力 · 次班凭印结领货' : '随车直送 · 次班核对时刻';
      return { label: '承重与走法', value: capacity + ' 公斤', detail: detail + (partner !== undefined ? ' · 回程可去' + rings[partner] : ''), corrected: capacity };
    }
    if (kind === 7) {
      const rank = (i - firstTrain + 3) % 3;
      const dep = first + [0, 1, 3][rank];
      const arrival = first + 8 + rank * 3 + (seed >>> (i + 7)) % 2;
      return { label: '开车 → 到站', value: clock(dep) + ' → ' + clock(arrival), detail: '本环可接的末班车', corrected: arrival };
    }
    const mark = seals[(code + Number(i === (correct + 1) % 3)) % 4];
    const knot = knots[(tie + Number(i === (correct + 2) % 3)) % 4];
    return { label: '签印与封结', value: mark + ' · ' + knot, detail: '收货人当面核过的封缄', corrected: 0 };
  });
  const guide = kind === 9 ? '回程这箱重 ' + weight + ' 公斤，怕沾云露。用核载减去已装重量，只有一辆既装得下，又有舱盖。' : kind === 6 ? '货单重 ' + weight + ' 公斤。两家能装下，选一家已经问过的承运人。直送要接车，接力要认封签。'
    : kind === 7 ? '货在 ' + clock(first) + ' 到站。' + permit + '。只有一班能装上货、并在 ' + clock(due) + '（含）前到达。'
    : '收据画的是「' + seals[code] + '」和「' + knots[tie] + '」。两处都相符才能签收，三位交接人中只有一人的封缄吻合。';
  const diagnosis = kind === 9 ? '三车各余 ' + readings.map(r => r.corrected).join('、') + ' 公斤。' + rings[correct] + '的车余量足够，也有舱盖。' : kind === 6 ? '这箱重 ' + weight + ' 公斤。' + rings[direct] + '可随车直送，' + rings[relay] + '可托邮差接力。'
    : kind === 7 ? '最早能在 ' + clock(release) + ' 装货，收货人等到 ' + clock(due) + '。' + rings[correct] + '的 ' + readings[correct].value + ' 同时赶得上两头。'
    : rings[correct] + '交接人出示了' + readings[correct].value + '，与收据上的两处记号相符。';
  return {
    kind, title: letter.title, call: kind === 9 ? letter.request : kind === 6 ? line.sender + '来信：“' + letter.request + '”'
      : rings[parcel.via!] + '上一班接走了货。' + (kind === 7 ? line.sender + '托你替它接上最后一程车。' : '邮差留下三份封缄，请替' + line.sender + '认出那只包裹。'),
    instrument: kind === 9 ? '回程装车单' : kind === 6 ? '托运单' : kind === 7 ? '接车时刻表' : '签收联',
    sample: kind === 9 ? '查货舱与余量' : kind === 6 ? '问清承重与走法' : kind === 7 ? '记下开车和到站时间' : '查验封缄',
    choices: rings.map(r => kind === 9 ? '装上' + r + '的回程车' : kind === 6 ? '托' + r + '承运' : kind === 7 ? '接' + r + '的车' : '向' + r + '交接人领货'),
    witnesses: kind === 9 ? ['车上已有货，要算还能装多少。','开出雨棚，敞舱是会沾露的。','这一班顺路带货，别把核载当成余量。'] : kind === 6 ? ['先看看车厢能留多少地方。','袋子绑好了，得问一声能不能装下。','直送跟接力，下一班要做的事不同。']
      : kind === 7 ? ['车要按表开，提前一分也赶不上。','把签放的时间也算进去。','到站时要有人接，过点就关门了。']
      : ['收据上画了两个记号。','好几个袋子的签印是一样的。','我把绳结原样留给你看。'],
    guide, readings, tracks: [] as { name: string; sounds: string[] }[], diagnosis, answer: kind === 6 ? direct : correct,
  };
}

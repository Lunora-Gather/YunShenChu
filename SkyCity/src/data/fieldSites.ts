import apexExterior from '../assets/district-apex.jpg';
import marketExterior from '../assets/district-midring.jpg';
import foundationExterior from '../assets/district-foundation.jpg';

import apexInterior from '../assets/camera-apex.jpg';
import marketInterior from '../assets/camera-midring.jpg';
import foundationInterior from '../assets/camera-foundation.jpg';

interface FieldSite {
  site: string;
  englishName: string;
  image: string;
  alt: string;
  nearby: { name: string; invite: string; image: string; alt: string };
}

export const fieldSites: Record<string, FieldSite> = {
  apex: {
    nearby: { name: '候车长廊', invite: '去站台看看', image: apexInterior, alt: '玻璃长廊里只有几名候车人，升降井的灯从脚下经过。' },
    site: '凌霄枢纽', englishName: 'APEX',
    image: apexExterior, alt: '银白色露台沿云海伸展，远端的玻璃穹顶被日光照亮。',
  },
  mid_ring: {
    nearby: { name: '檐下的茶摊', invite: '走进夜市', image: marketInterior, alt: '雨水映着摊棚下的灯，茶锅的热气飘到桥面上。' },
    site: '浮光市集', englishName: 'MID-RING',
    image: marketExterior, alt: '轻轨桥横穿层层暖灯，街边摊位一直延伸到悬空住宅。',
  },
  foundation: {
    nearby: { name: '塔底检修口', invite: '沿栈桥往下', image: foundationInterior, alt: '一盏绿灯照着维修门，脚下的云从圆形井口涌上来。' },
    site: '下层维护栈桥', englishName: 'FOUNDATION',
    image: foundationExterior, alt: '冷凝塔下的钢铁栈桥没入青灰色云层，管道通向更深处。',
  },
};

interface FieldLead {
  sign: string;
  observation: string;
  source: string;
  fragment: string;
  record: string;
  reading: string;
  sourceLabel: string;
  transmission: string;
  scan: string;
  filed: string;
  actions: Record<string, string>;
}

export const caseNames: Record<string, string> = {
  'ghost-rail': '幽灵轨道',
  'core-heartbeat': '核心心跳',
  guixu: '归墟',
  'abyss-whale': '云下合唱',
  'observer-return': '观察者回声',
};

export const fieldLeads: Record<string, FieldLead> = {
  'ghost-rail': {
    sign: '站台灯亮起',
    observation: '站台亮起了零号线的灯。公开时刻表上，这条轨道始终空着。',
    source: '站务员夹在时刻表里的便笺', fragment: '“六点四十，那盏灯又亮了。我把发车簿翻了两遍，还是空的。”', record: '抄下发车栏',
    sourceLabel: '公开发车簿', reading: '零号站台那一栏空着。当天没有安排任何车次。',
    transmission: '道岔传感器收到一列向凌霄行驶的列车。车身漆黑，没有编号。',
    scan: '监听道岔信号', filed: '六号道岔已标记，调度员正在人工核对通行许可。',
    actions: {
      'inspect-apex': '车轨感应器已经应答。先查六号道岔当天的公开发车记录。',
      'trace-ghost-rail': '公开记录里缺了这趟车。去终端查道岔实际使用的钥匙。',
      'review-archive': '日志保留了钥匙编号。对照许可登记，确认谁能打开道岔。',
    },
  },
  'core-heartbeat': {
    sign: '檐灯闪烁',
    observation: '市集的灯同时暗了一拍。商户说，上一次也是在观察台切换城区的时候。',
    source: '茶摊老板', fragment: '“灯暗的时候我正倒茶。炉火没跳，倒是杯里的茶纹，一圈一圈到了杯沿。”', record: '记下电表读数',
    sourceLabel: '市集供电表', reading: '整个观测时段，指针一直停在 41.0 MW。',
    transmission: '重力核心又跳了一下。两次脉冲之间的间隔像心跳。',
    scan: '监听供电波形', filed: '重力总线已转为手动监测，市集的负载记录可供复查。',
    actions: {
      'inspect-mid-ring': '供电频道已经锁定。先查灯光变化时市集的负载。',
      'trace-core': '负载记录已收下。调取观察台的指令，核对电流变化的时刻。',
      'review-systems': '在相同负载下重做两次操作，看哪次让总线电流上升。',
    },
  },
  guixu: {
    sign: '云下有回声',
    observation: '栈桥下传回了第二声测距回波。导航图上，那一格只有云。',
    source: '护栏上的测距仪', fragment: '探头朝着云里。绿灯闪过一次，停了一拍，接收端又亮了。旁边的航道图到这里就断了。', record: '抄录航道登记',
    sourceLabel: '下层航道登记册', reading: '自动放行只到海拔 4,490 米。再往下，航道没有登记。',
    transmission: '下环以下，同一处回波再次出现。登记册里查不到对应物体。',
    scan: '追踪云下回波', filed: '下层航道已撤销放行，测距位置被标记为实体障碍。',
    actions: {
      'inspect-foundation': '回波已经锁定。先查下层航道登记，看这格坐标是否有建筑。',
      'trace-guixu': '登记册上没有这座岛。调取独立测距仪的读数。',
      'review-camera': '测距记录已收下。对齐两次曝光，寻找随云移动后仍然固定的轮廓。',
    },
  },
  'abyss-whale': {
    sign: '风井低鸣',
    observation: '通风井里传来规律的振动。值夜的人说，格栅比头顶的风管先响。',
    source: '井口的交班条', fragment: '“今晚听见响动，先把手放在格栅上。昨晚我就是这么发现的。”末尾沾着一枚油指印。', record: '抄录风井工单',
    sourceLabel: '风井维护工单', reading: '04:07 至 04:12，回流风机与风道处于机械隔离状态。',
    transmission: '云下面传来一阵低音。一个声音说：“别往下看，风鲸在呼吸。”',
    scan: '监听通风井', filed: '通风井已转为人工复核，值班证词随压力曲线归档。',
    actions: {
      'inspect-foundation': '压力频道已经锁定。先查维护工单，确认采样时风机是否运转。',
      'trace-abyss': '工单已收下。标记两枚探头各自最早测到的波峰。',
      'review-citizens': '带上压力曲线，听值班工人描述上下风管振动的先后。',
    },
  },
};

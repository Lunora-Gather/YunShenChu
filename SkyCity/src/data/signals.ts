import { REPORT_ACTION_ID } from './caseFiles';

export type SignalSeverity = 'info' | 'warning' | 'critical';

export type SignalMapFocus = 'guixu' | 'ghost-rail' | 'core' | 'observer' | 'abyss';

export type InvestigationStage = 'sealed' | 'detected' | 'corroborated' | 'contained';

export type InvestigationActionType = 'camera' | 'terminal' | 'district' | 'citizens' | 'archive' | 'diary' | 'report';

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

const FIELD_SIGNALS: SignalIntel[] = [
  {
    id: 'guixu',
    freq: 104.2,
    title: '归墟 / Missing Island 14',
    origin: '深层测距阵列 / Deep Scans',
    message: '下环以下再次收到回波。登记册里查不到对应物体。',
    evidence: '航道图的最下层之外出现了一道断续的回波，这个高度没有登记过浮岛。',
    lead: '比对下层航道登记与独立测距仪的读数。',
    impact: '靠近云层下沿时，导航图开始丢失定位。',
    containment: '保持下层航道的合成监控，等待同一回波再次出现。',
    citizenReport: '「我的检修平板刚才在航道下面画出了第十四座岛，闪了一下就没了。」',
    pressure: 26,
    districtId: 'foundation',
    severity: 'critical',
    mapFocus: 'guixu',
    investigation: {
      detected: '回波已经锁定，还需要独立测量来确认来源。',
      corroborated: '登记册、测距记录和监控底片都能在案卷里比对。',
      contained: '两台独立仪器在下层航道外确认了一处未登记的建筑。',
      actions: [
        {
          id: 'inspect-foundation',
          type: 'district',
          label: '翻阅导航登记',
          description: '到下层栈桥查阅航道登记。',
          command: 'go foundation',
          districtId: 'foundation',
        },
        {
          id: 'trace-guixu',
          type: 'terminal',
          label: '比对测距记录',
          description: '在终端调出独立测距仪的记录，核对回波坐标。',
          command: 'trace guixu',
        },
        {
          id: 'review-camera',
          type: 'camera',
          label: '对齐监控底片',
          description: '对照两次曝光，在两帧中标出同一座远处结构。',
        },
      ],
    },
  },
  {
    id: 'abyss-whale',
    freq: 88.7,
    title: 'Cloudline Choir',
    origin: '云下回声 / Under-Cloud Echo',
    message: '「别往下看，风鲸在呼吸。」',
    evidence: '低频压力波出现时，风井值班员也感觉到了振动。',
    lead: '趁气象台仍报平静，查看下环的风井压力。',
    impact: '云下压力波让下层预报误报了风切变。',
    containment: '气象播报已降频，风井交由值班员人工复核。',
    citizenReport: '「井里一阵一阵地响。那一刻，我们整班人都安静了。」',
    pressure: 18,
    districtId: 'foundation',
    severity: 'warning',
    mapFocus: 'abyss',
    investigation: {
      detected: '云下传来压力波，地表气象台仍报平静。',
      corroborated: '把压力曲线和值班证词放在一起，找出哪里的风管先动。',
      contained: '风井已交由人工复核，公开气象播报也降低了频率。',
      actions: [
        {
          id: 'inspect-foundation',
          type: 'district',
          label: '查看风井工单',
          description: '去下环查风井的维护工单。',
          command: 'go foundation',
          districtId: 'foundation',
        },
        {
          id: 'trace-abyss',
          type: 'terminal',
          label: '标记压力波峰',
          description: '用上下两个探头的原始采样，标出各自最先收到的波峰。',
          command: 'trace abyss-whale',
        },
        {
          id: 'review-citizens',
          type: 'citizens',
          label: '听取值班证词',
          description: '听风井值班员描述经过，与压力记录核对。',
        },
      ],
    },
  },
  {
    id: 'ghost-rail',
    freq: 156.4,
    title: 'Ghost Rail',
    origin: '道岔传感器 / Track Sensors',
    message: '一列没有编号的黑色列车正驶往凌霄枢纽。',
    evidence: '行政线路最繁忙的时候，一条黑线才会出现。公共交通记录里查不到沿途站点。',
    lead: '核对上环道岔的通行时刻和议会许可生效的时间。',
    impact: '封存线路的通行量上升时，上环开始报出互相冲突的进路。',
    containment: '把行政接驳车的优先级压在 82% 以下，直到黑线消退。',
    citizenReport: '「站牌刚才跳成了零号线。站务日志上说，那条线从没建过。」',
    pressure: 20,
    districtId: 'apex',
    severity: 'warning',
    mapFocus: 'ghost-rail',
    investigation: {
      detected: '行政线路繁忙时，出现了一趟没有编号的列车。',
      corroborated: '道岔日志记下了实际放行，档案登记记下了当时有效的许可。',
      contained: '幽灵轨道仍在显示。行政接驳车已限流。',
      actions: [
        {
          id: 'inspect-apex',
          type: 'district',
          label: '查阅发车记录',
          description: '到凌霄枢纽查阅零号月台的发车簿。',
          command: 'go apex',
          districtId: 'apex',
        },
        {
          id: 'trace-ghost-rail',
          type: 'terminal',
          label: '追踪道岔日志',
          description: '用终端查这列黑色列车通过道岔时留下的记录。',
          command: 'trace ghost-rail',
        },
        {
          id: 'review-archive',
          type: 'archive',
          label: '核对封存许可',
          description: '用道岔放行时的钥匙编号，到档案室核对许可。',
        },
      ],
    },
  },
  {
    id: 'core-heartbeat',
    freq: 132.8,
    title: 'Core Heartbeat',
    origin: '重力总线遥测 / Gravity Telemetry',
    message: '重力核心以近似心跳的节奏发出脉冲。',
    evidence: '能量读数在有规律地波动。观察台切换城区时，波动会变强。',
    lead: '在观察台接入另一个城区后，立即查看核心电流。',
    impact: '观察台快速切换城区时，能量恢复速度开始波动。',
    containment: '暂停自动切换城区，让值班员手动采样。',
    citizenReport: '「地图一换地方，头顶的灯就暗一下。我都快能数准了。」',
    pressure: 17,
    districtId: 'mid_ring',
    severity: 'warning',
    mapFocus: 'core',
    investigation: {
      detected: '重力总线测到一串近似心跳的脉冲。',
      corroborated: '用终端日志和独立的总线读数来区分画面变化和电流变化。',
      contained: '核心改为人工采样，直到切换城区不再影响读数。',
      actions: [
        {
          id: 'inspect-mid-ring',
          type: 'district',
          label: '核对市集负载',
          description: '查市集的供电表，记下脉冲出现时的负载。',
          command: 'go mid_ring',
          districtId: 'mid_ring',
        },
        {
          id: 'trace-core',
          type: 'terminal',
          label: '调取终端读数',
          description: '调取观察台发往重力总线的指令记录。',
          command: 'trace core-heartbeat',
        },
        {
          id: 'review-systems',
          type: 'archive',
          label: '对照两次试验',
          description: '保持负载不变，重做两种操作，找出电流出现尖峰的一次。',
        },
      ],
    },
  },
  {
    id: 'observer-return',
    freq: 210.9,
    title: 'Observer Return',
    origin: '不明观察者 / Unknown Observer',
    message: '「你在观察云深处的时候，它也在观察你。」',
    evidence: '终端把这段回传标成延迟回声。接收器和日记里都出现了同一个票号。',
    lead: '先比对本地操作与接收器的时间，再判断哪个在前。',
    impact: '观察工具开始提前报告还未出现在界面上的变化。',
    containment: '终端日志留在本地，暂缓导出本次遥测。',
    citizenReport: '「我还没碰屏幕，站里的机器已经打出了我的路线。周围的人都没看见。」',
    pressure: 24,
    severity: 'critical',
    mapFocus: 'observer',
    investigation: {
      detected: '观察者频道收到了一条熟悉的操作代码。',
      corroborated: '先校正两处时钟，再比对同一票号在两台仪器中的记录。',
      contained: '本案的观察记录已留存本地，外部遥测导出已关闭。',
      actions: [
        {
          id: 'trace-observer',
          type: 'terminal',
          label: '追查回传日志',
          description: '查看隔离接收器记录的操作票号。',
          command: 'trace observer-return',
        },
        {
          id: 'review-memory',
          type: 'terminal',
          label: '核对记忆记录',
          description: '用终端调出本地记忆，查找以前是否出现过同一个票号。',
          command: 'memory',
        },
        {
          id: 'review-diary',
          type: 'diary',
          label: '校准日记时钟',
          description: '用两个基准脉冲校准日记时钟，再比较操作发生的先后。',
        },
      ],
    },
  },
];

const reportAction: InvestigationAction = {
  id: REPORT_ACTION_ID,
  type: 'report',
  label: '提交调查结论',
  description: '比对现场记录，选出判断，再引用两份独立证据。',
};

export const SIGNAL_CATALOG: SignalIntel[] = FIELD_SIGNALS.map((signal) => ({
  ...signal,
  investigation: { ...signal.investigation, actions: [...signal.investigation.actions, reportAction] },
}));

export const getSignalById = (id: string) => SIGNAL_CATALOG.find((signal) => signal.id === id) ?? null;

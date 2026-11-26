export interface EvidenceReading {
  id: string;
  label: string;
  value: string;
}

export interface FieldRecord {
  actionId: string;
  source: string;
  time: string;
  readings: readonly EvidenceReading[];
}

interface Theory {
  id: string;
  title: string;
  description: string;
  conflict?: string;
}

interface CaseFile {
  question: string;
  records: readonly FieldRecord[];
  theories: readonly Theory[];
  finding: string;
  proof: readonly [string, string];
  hint: string;
  dispatch: string;
}

export interface CaseSubmission {
  theoryId: string;
  citationIds: readonly string[];
}

export const REPORT_ACTION_ID = 'file-finding';

export const DEPARTURE_CHOICES = {
  hold: {
    label: '暂停发车',
    preview: '通知下环检修组，零号月台暂缓送电。',
    directive: '零号月台继续由人工压车',
    receipt: '零号月台已断电，下环确认收到指令。旧清单上仍有一名乘客，发车时间空着。',
    endingTitle: '月台的灯没有亮',
    epilogue: '天亮时，检修员合上下层闸门。航道登记册里，坐标 x −112 / y +288 旁还空着一格。这一次，谁也没去擦它。',
  },
  clear: {
    label: '准许发车',
    preview: '通过档案总线发出许可，前往下环目送列车。',
    directive: '在下环目送 Q-17 发车',
    receipt: '档案台确认放行。零号月台显示有一个座位已被占用。实时画面里，车厢依然空着。',
    endingTitle: '末班车驶入云中',
    epilogue: '三座栈桥先后看见了同一束灯光。轮到下环时，车厢已经驶出了镜头。你伸手按键，值班簿上的「已返回」却比你早了一秒。',
  },
} as const;

export type DepartureChoice = keyof typeof DEPARTURE_CHOICES;

export interface DepartureDecision {
  choice: DepartureChoice;
  recordedAt: number;
}

// Each finding compares one reading from two independent records.
const CASE_FILES: Record<string, CaseFile> = {
  guixu: {
    question: '下环栈桥下方的回波是从哪里来的？',
    records: [
      {
        actionId: 'inspect-foundation', source: '下层航道登记册', time: '03:16',
        readings: [
          { id: 'register-limit', label: '航道下限', value: '4,490 米 · 自动放行至此为止' },
          { id: 'register-island', label: '浮岛名录', value: '坐标 x −112 / y +288 没有登记过建筑' },
          { id: 'register-service', label: '测绘检修', value: '02:40 已重新校准导航网格' },
        ],
      },
      {
        actionId: 'trace-guixu', source: '独立测距仪', time: '03:17',
        readings: [
          { id: 'range-first', label: '首次回波', value: '4,472 米 · x −112 / y +288' },
          { id: 'range-second', label: '导航网格重启后', value: '4,472 米 · x −112 / y +288' },
          { id: 'range-wind', label: '云层漂移', value: '以 14 米/秒向西移动' },
        ],
      },
      {
        actionId: 'review-camera', source: '14-F 监控曝光记录', time: '03:18',
        readings: [
          { id: 'camera-wind', label: '云层', value: '两帧之间向西移动' },
          { id: 'camera-shadow', label: '固定轮廓', value: '两帧中都有三根支架位于 x −112 / y +288' },
          { id: 'camera-mode', label: '画面叠层', value: '导航叠层已关闭' },
        ],
      },
    ],
    theories: [
      { id: 'grid-ghost', title: '导航图残留旧轮廓', description: '已拆除的结构仍留在地图缓存里。', conflict: '导航网格重启后，独立测距仪仍收到回波。另一路监控也拍到了轮廓。' },
      { id: 'physical-island', title: '未登记的建筑', description: '未标注的网格里有一处固定结构。' },
      { id: 'cloud-reflection', title: '移动云层的反光', description: '冷凝水映出了栈桥原有的支架。', conflict: '云层向西移动了，轮廓始终留在同一格。' },
    ],
    finding: 'physical-island',
    proof: ['range-second', 'camera-shadow'],
    hint: '地图重启、云层移动之后，哪两份独立记录仍指向同一个位置？',
    dispatch: '下层航道已撤销放行。下一趟升降机出发前，检修员会在那处障碍物旁挂上标志灯。',
  },
  'abyss-whale': {
    question: '压力波从哪个方向传来？',
    records: [
      {
        actionId: 'inspect-foundation', source: '风井维护工单', time: '04:07',
        readings: [
          { id: 'fan-toggle', label: '回流风机', value: '04:07 至 04:12，风机处于机械隔离状态' },
          { id: 'vent-sensor', label: '屋顶风向标', value: '04:09 风速为 3 米/秒' },
        ],
      },
      {
        actionId: 'trace-abyss', source: '已校准的压力曲线', time: '04:09',
        readings: [
          { id: 'pressure-lower', label: '格栅下方', value: '首个波峰到达于 04:09:14.100' },
          { id: 'pressure-upper', label: '上方风管', value: '同一波峰到达于 04:09:14.520' },
          { id: 'pressure-match', label: '重复间隔', value: '连续五个波峰，间隔均为 8.20 秒' },
        ],
      },
      {
        actionId: 'review-citizens', source: '风井值班证词', time: '04:11',
        readings: [
          { id: 'shift-direction', label: '振动顺序', value: '「先是脚下的格栅往上一顶，头顶的风管才响。」' },
          { id: 'shift-noise', label: '听到的声音', value: '「锁住风机后，我还是数到了五声低鸣。」' },
        ],
      },
    ],
    theories: [
      { id: 'undercloud', title: '压力波从云下向上传来', description: '外部压力波沿着风井结构向上传播。' },
      { id: 'fan-resonance', title: '风机引起管内共振', description: '风机电机激起了管内驻波。', conflict: '所有波峰都出现在风机机械隔离期间。' },
      { id: 'forecast', title: '阵风从上方灌入', description: '一阵地表风躲过了气象监测。', conflict: '下层格栅先动，上方风管随后才响应。' },
    ],
    finding: 'undercloud',
    proof: ['pressure-lower', 'shift-direction'],
    hint: '找出最先收到波峰的探头，再找一位亲眼见到振动先后的人。',
    dispatch: '风井已退出自动气象调度。下一个波峰到来时，下环值班员会在格栅下面测量。',
  },
  'ghost-rail': {
    question: '谁准许了这趟没有列入时刻表的列车通行？',
    records: [
      {
        actionId: 'inspect-apex', source: '凌霄公开发车簿', time: '06:39',
        readings: [
          { id: 'transit-public', label: '零号月台', value: '未分配车次，当天没有发车计划' },
          { id: 'transit-load', label: '上环线路负载', value: '06:40 时段为 86%' },
        ],
      },
      {
        actionId: 'trace-ghost-rail', source: '六号道岔联锁日志', time: '06:40',
        readings: [
          { id: 'rail-key', label: '道岔实际放行', value: '06:40:12 · 授权钥匙 A9-NULL' },
          { id: 'rail-load', label: '道岔电路', value: '已闭合锁定，未记录故障' },
          { id: 'rail-direction', label: '列车去向', value: '向上驶往议会层' },
        ],
      },
      {
        actionId: 'review-archive', source: '议会档案室通行登记', time: '06:40',
        readings: [
          { id: 'rail-permit', label: '封存许可', value: 'A9-NULL · 议会档案室 · 06:40–06:41' },
          { id: 'rail-maintenance', label: '检修通行时段', value: '仅在 07:00 后放行' },
        ],
      },
    ],
    theories: [
      { id: 'overload', title: '上环负载过高，产生了虚假进路', description: '车次过密，系统多报了一列车。', conflict: '道岔硬件记下了实际放行和所用钥匙的编号。' },
      { id: 'service-train', title: '下环检修组打开了捷径', description: '检修人员使用了一段未公开的支线。', conflict: '检修窗口在 07:00 才开放，06:40 启用的钥匙属于另一张许可。' },
      { id: 'sealed-permit', title: '议会档案室开启了封存线路', description: '这趟列车持有单独的许可，公开时刻表没有收录。' },
    ],
    finding: 'sealed-permit',
    proof: ['rail-key', 'rail-permit'],
    hint: '把道岔实际使用的钥匙编号，与许可登记中的持有人对上。',
    dispatch: '封存线路的开放时段已加设人工提醒。六号道岔会拦停同一时间的其他车次。',
  },
  'core-heartbeat': {
    question: '什么操作触发了重力核心的脉冲？',
    records: [
      {
        actionId: 'inspect-mid-ring', source: '市集供电表', time: '08:20',
        readings: [
          { id: 'core-demand', label: '负载读数', value: '两次试验期间均为 41.0 MW' },
          { id: 'core-demand-baseline', label: '计划供电切换', value: '08:30:00 切换，试验已于 08:23 结束' },
        ],
      },
      {
        actionId: 'trace-core', source: '观察台试验终端', time: '08:22',
        readings: [
          { id: 'core-local', label: '仅刷新本地地图', value: '08:22:08 · 未发出指令' },
          { id: 'core-focus', label: '订阅城区实时数据', value: '08:22:14 · 指令已送达重力总线' },
        ],
      },
      {
        actionId: 'review-systems', source: '重力总线记录仪', time: '08:23',
        readings: [
          { id: 'core-no-pulse', label: '08:22:08–08:22:09', value: '干线电流平稳，未检出脉冲' },
          { id: 'core-pulse', label: '08:22:14.250', value: '电流出现尖峰，输入源标记为实时订阅' },
        ],
      },
    ],
    theories: [
      { id: 'graphics-artifact', title: '地图显示异常', description: '重绘界面让普通读数看起来像周期性脉冲。', conflict: '只刷新显示时，总线电流平稳。后一次变化由独立的电流记录仪测得。' },
      { id: 'on-subscribe', title: '核心对观察台的实时订阅作出响应', description: '观察台接入城区的动作，改变了仪器正在测量的对象。' },
      { id: 'demand-step', title: '市集用电需求发生变化', description: '日常负载变化触发了重力核心。', conflict: '两次试验的负载都没有变化。' },
    ],
    finding: 'on-subscribe',
    proof: ['core-focus', 'core-pulse'],
    hint: '找出真正送达总线的那条指令，再引用另一台仪器记录的响应。',
    dispatch: '核心诊断已停用自动订阅。今后打开城区时，将先显示只读投影。',
  },
  'observer-return': {
    question: '档案台重播了旧操作，还是提前收到了尚未发生的操作？',
    records: [
      {
        actionId: 'trace-observer', source: '隔离接收器', time: '09:00',
        readings: [
          { id: 'observer-packet', label: '收到操作预约', value: '09:00:13 · JOURNAL_OPEN · 票号 Q-17' },
          { id: 'observer-source', label: '数据传输方向', value: '来自初代档案总线的入站记录' },
        ],
      },
      {
        actionId: 'review-memory', source: '本地记忆审计', time: '09:00',
        readings: [
          { id: 'observer-cache', label: '此前是否有相同票号', value: '本地缓存中没有更早的 Q-17' },
          { id: 'observer-calibration', label: '校时状态', value: '日记偏移量待核实，初代档案保留了两个基准脉冲' },
        ],
      },
      {
        actionId: 'review-diary', source: '观察者日记输入记录', time: '09:00',
        readings: [
          { id: 'observer-input', label: '值班员打开日记', value: '09:00:15 · JOURNAL_OPEN · 票号 Q-17' },
          { id: 'observer-gesture', label: '输入来源', value: '实体观察台，本班首次触发' },
          { id: 'observer-clock', label: '基准脉冲对齐', value: '校正后，日记和档案接收器的两个脉冲分别吻合' },
        ],
      },
    ],
    theories: [
      { id: 'clock-drift', title: '两处记录的时钟不同步', description: '时钟漂移打乱了日志顺序。', conflict: '校准后两个基准脉冲已经对齐，相同票号的两次操作仍相差两秒。' },
      { id: 'replay', title: '旧会话的操作被重播', description: '先前的操作从本地缓存中重新出现。', conflict: '缓存中没有更早的 Q-17。第一份预约来自档案总线。' },
      { id: 'preceded-input', title: '档案台提前预约了这次操作', description: '回传记录早于它所指的那次实体操作。' },
    ],
    finding: 'preceded-input',
    proof: ['observer-packet', 'observer-input'],
    hint: '在两处独立记录里找到同一张票。哪一处先记下了它？',
    dispatch: '观察者频道已切至本地监测。档案总线上，还留着一张属于下一班的发车许可。',
  },
};

export function getCaseFile(signalId: string): CaseFile | undefined {
  return Object.hasOwn(CASE_FILES, signalId) ? CASE_FILES[signalId] : undefined;
}

export function getFieldRecord(signalId: string, actionId: string): FieldRecord | undefined {
  return getCaseFile(signalId)?.records.find((record) => record.actionId === actionId);
}

export function hasFiledAllFindings(completedActions: Record<string, string[]>): boolean {
  return Object.keys(CASE_FILES).every((id) => completedActions[id]?.includes(REPORT_ACTION_ID));
}

export function checkFinding(file: CaseFile, actionIds: readonly string[], submission: CaseSubmission): string | null {
  if (file.records.some(({ actionId }) => !actionIds.includes(actionId))) return '先集齐本案的现场记录。';

  const theory = file.theories.find(({ id }) => id === submission.theoryId);
  if (!theory) return '选出能解释现场现象的判断。';
  if (new Set(submission.citationIds).size !== 2 || submission.citationIds.length !== 2) return '从两份不同来源的记录中各选一条读数。';
  if (theory.id !== file.finding) return theory.conflict ?? '这项判断与所选证据矛盾。';
  if (!file.proof.every((id) => submission.citationIds.includes(id))) return file.hint;

  return null;
}

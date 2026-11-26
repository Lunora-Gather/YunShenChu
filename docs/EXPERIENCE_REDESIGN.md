# 云深处体验重构审查记录

这里按迭代顺序保留了设计决定、验证记录和场景美术来源。当前玩法与发布流程见[项目首页](../README.md)和[开发说明](../SkyCity/README.md)。

## 判断

上一版能够运行，但体验重心偏向“控制台组件陈列”，城市本身没有成为第一视觉对象。世界观文档里最有辨识度的元素——高空、浮岛、重力核心、云下禁忌、第 14 号岛——没有充分进入首屏。

## 本轮目标

1. 让用户首先感到自己在观察一座云端城市，而不是在阅读面板。
2. 将区域、系统、历史、居民流改为检查器层级，降低常驻信息噪声。
3. 让“归墟”“幽灵轨道”“核心搏动”成为可发现的异常线索。
4. 保持 TypeScript、lint、build 全部通过，避免只做视觉表面。

## 结构变更

- 主画面改为沉浸式城市舷窗，地图占据主要视觉重量。
- 左侧区域导航压缩为轻量 rail，只表达城市拓扑。
- 右侧检查器提供四个层级：District、Systems、Archive、Pulse。
- 底部 Signal Strip 只保留当前指令、隐藏频率入口和天气态势。
- 3D 地图新增重力脊柱、轨道环、归墟幽灵岛、岛屿下腹结构、区域化建筑语言和穿梭机流线。

## 迭代复查

- 首轮截图后发现中央读数卡过重、底部终端/音频/信号条互相挤压，已将读数压缩为 HUD，并给底部固定控件重新分层。
- 移动宽度下顶部状态和区域选择曾把地图压到首屏下方，已压缩 topbar 与 district rail，让城市舷窗在首屏露出约 450px。
- 工具栏、告警徽标、区域读数、终端、日志抽屉做了重叠审查；最终首屏关键浮层无几何重叠。
- 交互烟测覆盖区域切换、时间线切换、相机打开/退出、信号器打开/关闭，均通过。
- 清理了全局 `.close-btn` 类名泄漏，避免弹窗和系统告警关闭按钮互相串样式。
- 进一步命名空间化全局 CSS 类名与 keyframes，避免 `.b1`、`.warning`、`.pulse`、`.blink` 等普通名称在组件间串台。
- 补充 dialog、tab、aria-pressed、aria-live、焦点态和 `prefers-reduced-motion` 支持。
- 复验 1280x720 与 390x844 两个断点：桌面底部抽屉已避让，移动端工具栏/区域读数/告警无重叠；信号器和相机弹层在 390px 宽度下无溢出。

## 仍可继续深化

- 继续扩展每个异常的区域事件短剧，让摄像头、居民流和档案出现更细的分支。
- 给已发现信号加入长期状态，例如多次观察后解锁二级证词或改变城市经济/天气曲线。
- 将终端命令与地图焦点进一步互通，例如支持直接切区、过滤档案和调出指定摄像头。

## 第二轮深度优化

- 新增统一信号目录 `signals.ts`，把频率、证据、危险等级、地图焦点和区域归属抽成结构化数据。
- 信号锁定后会同步更新档案、地图、底部 Signal Memory、观察者日志、系统告警和音效，不再是孤立弹窗反馈。
- 地图新增幽灵轨道、核心搏动、云下回声、观察者回环等异常层；对应信号被发现后才会显影。
- Signal Interceptor 增加锁定强度、最近信号提示、预设频段、键盘微调、焦点与 Escape 关闭。
- Deep Terminal 接入真实城市状态，支持 `WORLD_STATUS`、`SIGNALS`、`LATEST_SIGNAL`、`TRACE <signal>` 等命令，并补强 Enter 提交与快捷命令。
- Security Camera 从纯文字 NO SIGNAL 改为区域化合成监控画面，按上环、中环、下环切换镜头语言，并在相关异常被聚焦时显示跨链证据。
- 音频系统在非静音状态下会为锁定信号播放短促谐波反馈。
- 系统告警改为避让右侧检查器，避免阻挡 Archive/Pulse 标签；Critical 闪烁强度也下调，保留紧张感但不压迫操作。

## 第二轮验证

- `npm run lint` 通过。
- `npm run build` 通过。
- 浏览器桌面断点验证：信号锁定、Archive 解锁、地图归墟显影、告警不再覆盖检查器。
- 浏览器移动断点验证：主视图无横向溢出，信号弹层、摄像头弹层、底部终端均可用。
- 终端 Enter 提交、快捷命令、摄像头 Escape/EXIT 关闭均已烟测。

## 第三轮深度优化

- 信号目录继续扩展为异常档案，新增后续线索、城市影响、控制建议、居民反馈和压力值。
- 全局上下文新增 `signalTelemetry`，统一计算信号压力、压力等级、下一条线索、活跃影响和各区异常数量。
- 顶部状态栏新增 Signal 指标，Systems 面板新增 Resonance Matrix，让异常压力成为常驻城市状态。
- 地图新增压力 veil，压力升高后城市舷窗会进入 watch/unstable/breach 氛围。
- Glitch 覆盖层接入信号压力，breach 状态下会显示 signal breach 警示。
- Pulse 居民流会根据已发现信号插入相关目击反馈，不再只是随机社交消息。
- 摄像头和信号拦截器补充控制建议/下一步线索，和 Archive 中的信息保持一致。
- 终端新增 `SIGNAL_PRESSURE`、`NEXT_LEAD` 命令，`WORLD_STATUS` 也会返回信号压力。

## 第三轮验证

- `npm run lint` 通过。
- `npm run build` 通过。
- 浏览器桌面断点验证：顶部五指标无横向溢出，连续锁定信号后 Systems/Pulse/地图/Glitch 联动。
- 浏览器移动断点验证：breach 警示不再遮挡顶部指标或底部终端，摄像头字幕/遥测无重叠。

## 第四轮深度优化

- 全局观察者状态接入本地持久化，已发现信号、最新聚焦信号和观察日志会跨刷新保留。
- 观察日志增加会话上限与持久化上限，避免长时间运行后抽屉变成无边列表。
- 系统告警增加短窗口去重，同一类状态波动不会在几秒内重复刷屏。
- Signal Interceptor 的 Auto-Scan 改为优先追踪未解封频段，全部发现后再循环已知目录。
- 频段预设增加 sealed/discovered 状态差异，操作者能更快分辨哪些线索已经进入长期记忆。
- 日记空态和状态栏文案从“当前 session”改为“local memory”，和新连续性机制保持一致。

## 第五轮深度优化

- 全局上下文新增 `observerMemory` 摘要，让终端、日记和后续界面共享同一份记忆状态。
- Deep Terminal 新增 `MEMORY` 与 `FOCUS <signal>` 命令，操作者可以直接验证持久化状态并聚焦已解封异常。
- Signal Interceptor 将锁定结果前置到预设列表之前，避免结果被长列表压到弹层下方。
- 扫描过程中禁用频段预设按钮，防止定时扫描和手动调频互相打断。
- Signal Interceptor 顶部新增 memory locks 计数，截获器自身也能表达发现进度。
- Observer Diary 增加记忆摘要，打开时保持最新记录可见，不再自动滚到旧记录底部。

## 第六轮深度优化

- Systems 面板新增 Observer Memory 控制台，直接显示持久化、恢复、日记容量和信号解封进度。
- Archive 面板新增 All/Unlocked/Sealed 过滤器，避免后续异常目录扩展后只能线性扫列表。
- Observer Diary 新增 All/Secret/System/Visit/Discovery 过滤器，长期运行后的日志检索成本下降。
- Deep Terminal 增加 `GO <district>` 与 `DISTRICT <district>` 命令，终端可以直接切换观察区域。
- Deep Terminal 增加命令历史回放，方向键可以复用最近命令，减少重复输入。
- 日记打开态层级高于底部终端，避免状态栏被终端闭合条覆盖。

## 第七轮深度优化

- 信号目录新增调查动作结构，每条异常拥有区域、终端、摄像头、居民流或档案相关动作。
- 全局观察者记忆升级到 schema v3，并保留 v2 读取迁移，避免旧 localStorage 记忆丢失。
- Context 新增 `investigationState`，统一计算 sealed/detected/corroborated/contained 阶段、动作进度和下一步。
- Systems 面板新增 Next Action 控制台，可以直接执行下一步调查动作。
- Archive 卡片新增阶段、动作进度条和动作清单，动作完成后会进入持久化记忆。
- Deep Terminal 新增 `INVESTIGATION`、`NEXT_ACTION`、`COMPLETE <action>` 命令，`TRACE <signal>` 会推进匹配的 terminal 调查动作。
- Diary 摘要新增当前调查阶段，和 Archive/Systems 的阶段显示保持一致。
- 实际操作会自动推进调查动作：切到相关区域、打开摄像头、进入 Pulse/Archive/Systems 都会记录对应调查进度。
- 终端类调查动作不再被按钮直接跳过：Next Action 会打开 Terminal 并预填命令，执行后才推进状态。
- Diary 调查动作独立于 Archive，打开观察日志会完成对应本地记忆核查。

## 第七轮验证

- `npm run lint` 通过。
- `npm run build` 通过。
- 浏览器验证 v2 localStorage 迁移到 schema v3，且已发现信号会保留显式空调查动作数组。
- 浏览器验证 Guixu 闭环：Systems 下一步、区域检查、Terminal trace、Camera、Archive contained、Diary stage 一致。
- 浏览器验证 observer-return 闭环：Terminal 动作按钮只预填命令，不提前完成；`trace observer-return`、`memory` 和 Diary 打开分别推进对应动作。
- 移动端 390x844 验证 Archive 与 Diary 无横向溢出。
- 浏览器验证未捕获应用 console error。

## 最终轮体验收束

- 底部 Signal Strip 新增全局 Next Action 入口，已解锁调查不再必须先切到 Systems 面板才能继续。
- Terminal 类 Next Action 改为打开终端并自动执行对应命令，状态仍由真实命令路径推进，不再需要用户额外按 Enter。
- 终端收到外部动作请求时会中断上一条逐字输出并恢复输入状态，避免连续调查动作被 typing lock 卡住。
- 全局 Next Action 同时覆盖区域、终端、摄像头和 Diary 动作，Guixu 与 Observer Return 均可从底部入口完成闭环。
- Archive 新增搜索输入，覆盖异常 id、标题、来源、线索、证据、影响和调查动作文案。
- Archive 增加空结果态，搜索或过滤没有命中时不再留下空白列表。
- 首次进入且没有本地信号记忆时，城市舷窗显示 First Sweep 启动简报，并同步高亮顶部与底部扫描入口。
- GitHub Pages 部署工作流已接入，Vite 构建改为相对资源路径，仓库根 README 和子项目 README 均指向在线试玩与本地运行方式。

## 最终轮验证

- `npm run lint` 通过。
- `npm run build` 通过。
- 浏览器验证底部 Next Action 入口：Guixu 的区域检查、终端追踪、摄像头复核可连续完成并进入 contained。
- 浏览器验证 Terminal 自动执行：点击 Next Action 后自动运行 `trace guixu`、`trace observer-return` 与 `memory`。
- 浏览器验证 Observer Return 从全局 Next Action 完成 trace、memory、Diary 三步后进入 contained。
- 浏览器验证 Archive 搜索可命中已解锁和未解锁异常，搜索空结果态正常显示，清空按钮可恢复列表。
- 移动端 390x844 验证主界面与 Signal Strip 无横向溢出。
- 浏览器验证未捕获应用 console error。

## 发布收束验证

- `npm run lint` 通过。
- `npm run build` 通过。
- 检查 `dist/index.html`：脚本、样式和 favicon 均为相对路径。
- 浏览器验证无本地记忆的首次进入：First Sweep 简报可见，点击 `Start signal sweep` 能打开 Signal Interceptor。
- 浏览器验证已有本地信号记忆：First Sweep 简报消失，Signal Strip 显示 Next Action 与 Signal Memory。
- 移动端 390x844 验证首次进入无横向溢出，启动简报不遮挡顶部区域读数和底部状态条。

## 控制台操作、状态与渲染

- 首轮简报并入城市读数，移动端将扫描和 Next Action 固定在视口底部。终端和日记共享抽屉状态，弹窗使用浏览器原生焦点约束。
- 指定扫频只锁定目标。调查在明确操作后推进，收容后会更新地图读数、摄像头证据、居民报道和共振压力。
- Foundation Archive 使用固定的历史数据。返回 Live City 时恢复此前的城区和继续运转的实时状态。
- 存档保留 v2 迁移，支持两个会话合并信号、动作和日志。存储不可用时继续使用会话记忆。
- 城市地图按舷窗宽度缩放。交通画布移出视口时暂停绘制，静音会挂起音频引擎。
- 应用与 Vite 配置启用 TypeScript 严格检查。锁文件更新保留现有依赖版本范围。
- 回归脚本覆盖 5 条调查、15 个动作、6 种视口、双会话存档、旧版迁移、未来版本保护和 GitHub Pages 子路径加载。运行入口为 `npm run test:safari` 和 `npm run test:browser`。

## 案卷推理与终局指令

- 五个案卷分别使用定位复测、压力传播时序、调度密钥、对照记录和输入时间戳。每案需要选定一个解释并提交两条来自不同来源的证据。与记录冲突的判断会收到相应反馈，结案状态保留到下一次游玩。
- 归墟使用一张可在摄像头和案卷中查看的原创监控底片。后续四案通过仪器记录继续调查，五案结论汇入车次 Q-17 的跨案调度单。
- 终局有两种指令，各自更新地图轨道、实时指令和调度回执。v4 存档保存调查结论和终局选择，v2/v3 已采集的动作可直接用于对应案卷。

### 监控底片生成记录

使用内置 imagegen 生成，发布资源为 `SkyCity/src/assets/guixu-camera-14f.jpg`。

> A wide 16:9 surveillance-camera still for the original science-fiction game The Deep Cloud. The camera is bolted under a floating industrial city, looking down into a dense, blue-green cloud ocean at pre-dawn. In the middle-right, a small unregistered floating platform is almost swallowed by fog, but three distinct industrial support struts remain readable against a lighter opening in the clouds. The upper-left edge contains part of the known city's dark underside for scale. Coarse optical grain, subtle degraded night-camera contrast, deep shadows and restrained turquoise highlights, convincing weathered metal. The image should feel like an undisclosed field record. Use no text, labels, interface graphics, logos, people, or dramatically bright lights.

## 主动取证与重演

- 拦截器通过强度和方向提示支持手动扫频，首轮仍可使用自动扫频。已锁定频率可以直接调回。
- 五案分别加入监控帧配准、压力峰采样、许可核对、恒定负荷下的对照试验和时钟校准。每件仪器只在操作验证后收录现场记录。
- 校准最后一案的时钟需要先赴 Year 01 读取参考脉冲，再回到实时日记比对。档案时代的切换参与了取证。
- 已结案的案卷开放重演。练习轮换画面标记目标、压力采样、许可码、触发脉冲的操作或时钟偏差，调查结论和终局指令继续由原档保管。
- 档案按时间整理现场记录，可从任意记录返回来源案卷。移动案卷提供记录和结论之间的跳转。

### 三个城区监控画面生成记录

三个场景均使用内置 imagegen 生成，目的是让三个城区在观测时有独立可辨的建筑与光线。

#### Apex · `SkyCity/src/assets/camera-apex.jpg`

> Original in-world surveillance camera image for the science-fiction game The Deep Cloud, Apex district. Wide 16:9 fixed camera from the high corner of a restrained civic atrium on a city floating above a cloud sea. A luminous tall cylindrical transit shaft through a transparent glass floor, thin pale metal bridges, cool silver structural ribs, huge outside blue dawn, small anonymous human silhouettes for scale. Clear geometric composition with a strongly recognizable vertical shaft at center, understated wear and realistic engineering. Slight low-light camera texture, sophisticated architectural cinematography, icy whites and muted cyan. No readable signs, interface graphics, words, logos, characters facing camera, or watermarks.

#### Mid-Ring · `SkyCity/src/assets/camera-midring.jpg`

> Original in-world surveillance camera image for the science-fiction game The Deep Cloud, Mid-Ring district. Wide 16:9 fixed elevated camera looking along a compact floating night market suspended on residential bridges above deep blue cloud void. Amber food-stall light, stacked narrow vendor balconies, small anonymous pedestrian silhouettes, wet grated walkways, cables, a distinct curving amber transit loop. Camera composition observes an ordinary lived-in neighborhood, clear foreground-to-background separation, realistic materials, gentle film grain. Muted green and warm mineral amber, restrained teal shadows, not a stock cyberpunk skyline. No readable words, logos, interface graphics, captions, or watermarks.

#### Foundation · `SkyCity/src/assets/camera-foundation.jpg`

> Original in-world surveillance camera image for the science-fiction game The Deep Cloud, Foundation district. Wide 16:9 stationary camera inside the underside of a floating industrial city, facing stacked weathered pressure ducts, a deep circular cloud intake and narrow maintenance catwalks. Condensation, suspended heavy anchors, one restrained jade work light carving the pipes, silhouettes of infrastructure fade downward into blue-black fog. Grounded industrial engineering, crisp geometric profile where the intake meets the catwalk, realistic low-light surveillance texture. No isolated second platform, readable words, logos, UI graphics, or watermarks.

### 标题、舷窗与终局画面

两张画面使用内置图像生成。城市全景用于标题。零号月台用于终局前的发车清单与后日谈。

#### 城市外景 · `SkyCity/src/assets/city-panorama.jpg`

> Create an original cinematic key art environment for the existing science fiction mystery game The Deep Cloud. Wide 3:2 horizontal frame with an immense cloud sea and one majestic believable floating city at the center-right. It consists of one high central ivory art deco observation spire, a broad broken elliptical inhabited ring crossed by fine lit bridges, two separated industrial platforms under the ring, piers suspended into low clouds. View the skyline and underside at once from a far aerial vantage. The city silhouette occupies the central 55 percent of the width and can survive center cropping. Left side has deep quiet pale gray clouds and lower left has soft dark gray-marine fog for website headline. Pale sunrise through layered cloud at upper right; hints of amber lights in navy and oxidized green metal. Atmospheric photographic production design, retained fine grain, beautiful real cloud shapes, readable volume and deliberate composition. Moody pale green slate, dark obsidian sea, ivory highlight. Avoid magenta, oversaturated cyan, galaxies, planets, text, logos, watermarks, HUD, humans and decorative borders.

#### 零号月台 · `SkyCity/src/assets/platform-zero.jpg`

> Original final scene for the science fiction mystery game The Deep Cloud, cinematic horizontal 3:2. At suspended Platform Zero, a worn covered platform beside a narrow monorail track vanishes into dark maritime cloud below a grand floating city's underside. A small old ivory dark steel passenger railcar at center-right caught in a patch of warm platform light, a single unlit door and a column of weak dawn in the fog ahead. Tactile staggered industrial steel ribs and slate green mist, subtle condensation and rust, tones of oxford green and warm amber. At once beautiful, lonely, lived-in, believable. Wide environmental film still, center subject that remains legible at narrow crop, soft dark lower left for external overlay. No people, no text, no numbers, no signs, no UI, no logo, no watermark.

## 跨案复原与发行维护

- 零号月台发车前必须从五案各关联一条现场记录。核验会标出需要复查的条目。当前标签页会记住清单中的选择与核验结果，已有结局可以直接重读。
- 开启居民动态只展示由来源署名的证词。玩家在处理压力波后亲自确认归档。时钟案分别记录校准前的待确认状态与校准后的对齐结果。
- 手动调谐跟随未锁定或指定载波，提供 0.1 MHz 细调和键盘频带边界。标题画面与后台标签暂停城市模拟，避免写入玩家尚未观察到的日志。
- 标题画面和系统面板提供存档下载与预览合并。原始调查槽与重玩槽可以各自恢复，合并保留目标槽已有结局。
- `npm run release:build` 生成可解压运行的发行包。启动器使用稳定的本机地址以沿用已有存档，运行资源全部随包提供。

## 三环舷窗外景

三张外景以标题全景为建筑参考，使用内置图像生成。实时舷窗按所选城区切换，Year 01 使用历史示意图。

### 上环 · `SkyCity/src/assets/district-apex.jpg`

> Use case: stylized-concept. New cinematic environment for the Apex district of The Deep Cloud. The supplied panoramic artwork is an architectural and color reference only. Create a new viewpoint from an exterior observation deck high on the recognizable ivory Art Deco spire, looking across its silver glass upper terraces over a brilliant cream-white cloud sea at cool morning. Center the silhouette of a pale crown-shaped civic pavilion linked by a fine silver bridge, with a few sparse amber windows in the distance. Pale blue and ivory light, delicate green patina and restrained slate shadows. Wide landscape 3:2, near and middle architectural scale, key silhouette within central 55% for phone cropping, calm textured negative space at bottom left for a legible overlay. Grounded lived-in architectural film still. No text, no UI, no markings, no logos, no watermarks.

### 中环 · `SkyCity/src/assets/district-midring.jpg`

> Use case: stylized-concept. New cinematic environment for the Mid-Ring district of The Deep Cloud. The supplied floating city artwork is an architectural and color reference only. Create a distinct new exterior viewpoint from a balcony level with the busy, inhabited middle ring of the city: dense stepped terraces of weathered deep-green metal, shop windows and warm amber lamps, rooftop trees and planters, a distinct arched enclosed light rail bridge crossing the open mist at center. A few distant anonymous people for scale, side-of-the-ring geometry and real depth. Warm copper and amber windows against teal-gray cloud, soft overcast golden hour. Wide landscape 3:2, key bridge within central 55% for phone cropping, quiet shadow at lower left for an interface overlay. Grounded architectural film still; no readable lettering, logos, watermarks, UI or frame.

### 下环 · `SkyCity/src/assets/district-foundation.jpg`

> Use case: stylized-concept. New cinematic environment for the Foundation district of The Deep Cloud. The supplied floating city panorama is an architectural and color reference only. Create a completely different exterior viewpoint under its ring, looking outward from the flank of a low industrial platform at a huge cylindrical copper-green condensation tower, riveted trusses, long ducts and working catwalks suspended in heavy lower cloud. View the recognizable underside from the same altitude, with dark blue-green foreground, a few small golden service lamps, bleached glow through fog on the right. A single industrial tower and supporting girders should stand clearly in the central 55% for a phone crop; clear layered silhouettes through fog, not all dark. Wide landscape 3:2 atmospheric architectural film still, dark soft bottom-left space for an interface overlay. No distant solitary island or ghost train, no text, logos, UI, watermark or frame.

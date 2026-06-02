# 云深处下一阶段 UX/UI 全面提升方案

## 当前判断

当前版本已经从“组件陈列”推进到了“可操作的观察者控制台”：城市舷窗、信号发现、记忆持久化、终端命令、档案过滤、日记过滤都已经形成基础闭环。

但仍有明显提升空间。主要问题不是缺少功能，而是体验层级还不够统一：用户发现信号后，下一步该做什么、哪些证据已经形成链路、哪些区域被异常影响、哪些操作会改变城市状态，这些信息仍分散在 Systems、Archive、Diary、Terminal、Camera、Pulse 里。界面已经丰富，但还没有完全形成一条清晰的“调查工作流”。

下一阶段应避免继续随意加面板。重点应转向：把现有能力整理成更稳定、更精致、更可解释的操作体验。

## 核心目标

1. 让用户始终知道当前最重要的异常线索、下一步操作和影响范围。
2. 让 Systems、Archive、Camera、Pulse、Diary、Terminal 围绕同一个调查状态联动。
3. 提升 UI 精致度：统一卡片密度、标题层级、状态色、按钮形态、滚动区和移动端布局。
4. 强化长期体验：持久化状态可迁移、可恢复、可验证，不因刷新或长时间运行产生混乱。
5. 保持当前沉浸式控制台定位，不改成营销页或说明页。

## 设计原则

- 城市优先：主视觉仍然是云端城市，面板只服务观察和决策。
- 证据闭环：每个信号都应经过“发现 -> 解释 -> 关联 -> 行动 -> 记录”的路径。
- 密度可控：信息可以丰富，但同屏必须有清晰主次，避免所有卡片同时抢焦点。
- 操作可验证：每个按钮、命令、过滤器都要产生可见状态变化。
- 移动端不降级：390px 宽度下仍要能完成核心流程，而不是只保持不溢出。

## 下一阶段建议主线

### Phase 1：UI 精致度与布局稳定性

目标：先把现有界面打磨成更统一的产品级控制台。

计划改动：

- 抽取更明确的视觉层级规范：panel heading、metric card、status chip、segmented filter、evidence card。
- 统一 Systems、Archive、Diary 中重复出现的卡片样式和间距，减少“每个区域像独立写的”感觉。
- 优化右侧 Inspector 的滚动体验：关键状态固定在上方，长内容进入内部滚动。
- 优化移动端：顶部状态、区域 rail、Inspector tabs、Diary drawer、Terminal drawer 之间的垂直节奏。
- 检查所有按钮文字和图标：能用图标表达的控制尽量使用图标，保留必要标签。
- 为 Archive、Diary、Terminal 的 active/focus/disabled 状态补齐统一视觉反馈。

涉及文件：

- `SkyCity/src/App.css`
- `SkyCity/src/App.tsx`
- `SkyCity/src/components/ObserverDiary/ObserverDiary.css`
- `SkyCity/src/components/DeepTerminal/DeepTerminal.css`
- `SkyCity/src/components/SignalInterceptor/SignalInterceptor.css`

验收标准：

- 桌面 1366x768、1280x720 无关键控件重叠。
- 移动 390x844、430x932 无横向溢出。
- Systems 首屏能同时看到系统概览、Observer Memory 和 Resonance 的起始状态。
- Archive 和 Diary 的过滤控件在桌面/移动都不换行失控。

### Phase 2：调查工作流状态模型

目标：让“发现信号”不只是解锁文本，而是推进一个调查流程。

新增概念：

- `investigationStage`：`sealed | detected | corroborated | contained`
- `requiredActions`：每个信号对应 2-3 个可完成动作，例如查看摄像头、追踪终端、切到相关区域、查看居民反馈。
- `completedActions`：持久化记录用户完成过的调查动作。
- `nextAction`：全局计算当前最合理的下一步。

计划改动：

- 扩展 `signals.ts`，为每个信号补充调查阶段、动作、解锁条件和阶段文案。
- 在 Context 中新增 `investigationState`，和当前 `observerMemory` 一起持久化。
- Systems 面板显示 “Next Action” 和异常调查进度。
- Archive 卡片显示每个信号的阶段，而不只是 locked/unlocked。
- Terminal 增加 `NEXT_ACTION`、`COMPLETE <action>`、`INVESTIGATION` 命令。
- Diary 自动记录阶段推进，而不是只记录打开工具和锁定信号。

涉及文件：

- `SkyCity/src/data/signals.ts`
- `SkyCity/src/context/CityContext.tsx`
- `SkyCity/src/App.tsx`
- `SkyCity/src/components/DeepTerminal/DeepTerminal.tsx`
- `SkyCity/src/components/ObserverDiary/ObserverDiary.tsx`

验收标准：

- 锁定任意信号后，Systems 能给出明确下一步。
- 完成相关动作后，Archive 中该信号阶段变化。
- 刷新后调查阶段和已完成动作不丢失。
- Terminal、Archive、Diary 对同一信号阶段显示一致。

### Phase 3：地图、摄像头、居民流联动深化

目标：让用户感觉异常真正影响城市，而不是只影响文本面板。

计划改动：

- Map3D 增加更明确的 focus transition：终端 `FOCUS`、Archive 点击、Signal lock 都能触发地图焦点反馈。
- Security Camera 根据 `latestSignal` 和 `investigationStage` 显示不同层级证据。
- CitizenFeed 支持按当前信号过滤，并根据调查阶段解锁更具体的目击报告。
- Systems 中的 active impacts 点击后能聚焦对应信号或区域。
- Signal Echo 在主地图中增加阶段视觉：detected/corroborated/contained 有不同边框和微动画。

涉及文件：

- `SkyCity/src/components/Map3D/Map3D.tsx`
- `SkyCity/src/components/SecurityCamera/SecurityCamera.tsx`
- `SkyCity/src/components/CitizenFeed/CitizenFeed.tsx`
- `SkyCity/src/App.tsx`
- `SkyCity/src/data/signals.ts`

验收标准：

- 用户从 Terminal、Archive、Camera 任一入口聚焦信号，地图和底部 Signal Memory 都同步。
- CitizenFeed 不再只是随机信息流，而是能反映当前调查上下文。
- Camera 的画面文案随调查阶段变化。

### Phase 4：高级操作体验

目标：提高重复使用效率，但不增加视觉负担。

计划改动：

- Terminal 增加命令建议和 Tab 补全。
- 增加轻量 command palette，用于快速打开 Signals、Camera、Archive、Diary、Terminal。
- Archive 支持搜索信号 id、标题、来源、区域。
- Diary 支持按 location 过滤。
- Signal Interceptor 增加 “scan queue” 状态，显示下一条待扫描信号和剩余数量。

验收标准：

- 不依赖鼠标也能完成：切区、打开截获器、锁定信号、查看下一步、聚焦档案。
- 命令建议不遮挡 Terminal 输入，也不造成移动端溢出。

### Phase 5：工程质量与回归验证

目标：把当前手动验证流程沉淀成可重复检查。

计划改动：

- 增加轻量 Playwright 验证脚本，不作为重型测试框架，只覆盖关键 UX 流程。
- 固化验证断点：1366x768、1280x720、390x844、430x932。
- 增加 localStorage schema version 和迁移逻辑，避免后续状态结构变化破坏旧记忆。
- 为 `signals.ts` 的结构增加类型约束，避免遗漏字段。
- 文档中维护每轮验证清单。

验收标准：

- `npm run lint` 和 `npm run build` 必须通过。
- Playwright 脚本覆盖：启动、锁定信号、刷新恢复、Archive 过滤、Diary 过滤、Terminal 命令、移动端无横向溢出。
- 新增持久化字段有版本迁移，不直接假设旧数据结构存在。

## 推荐执行顺序

我建议下一轮先做 Phase 1 + Phase 2 的前半段。

原因：

- Phase 1 先解决视觉一致性，否则后续功能越多，界面越难统一。
- Phase 2 的调查状态模型是后续联动的核心。如果先继续扩展 Camera/Pulse/Map，会继续增加分散状态。
- 这两部分完成后，用户体验会从“工具很多”推进到“流程明确”。

建议下一轮实施范围：

1. UI 规范化：统一卡片、过滤器、状态 chip、Inspector 内部滚动。
2. `signals.ts` 增加调查动作字段。
3. Context 新增 `investigationState` 持久化。
4. Systems 增加 Next Action。
5. Archive 卡片显示阶段和动作进度。
6. Terminal 支持 `NEXT_ACTION` 和 `INVESTIGATION`。

这会是一个比上一轮更大的工程量，但边界仍然清晰。

## 风险与控制

- 风险：功能继续增加导致界面更拥挤。
  - 控制：先统一 UI 密度和滚动区域，再加新状态。

- 风险：调查状态模型过复杂。
  - 控制：每个信号最多 3 个动作，先做轻量阶段，不做完整任务系统。

- 风险：持久化结构变化破坏旧用户数据。
  - 控制：新增 schema version 和迁移函数。

- 风险：移动端抽屉继续互相抢层级。
  - 控制：明确层级表：modal > diary open > terminal open > alerts > diary closed > terminal closed。

- 风险：UI 文案过多，削弱沉浸感。
  - 控制：所有提示只放在状态/档案/终端里，不增加说明型 landing 文案。

## 待审核问题

1. 是否同意下一轮以“调查工作流状态模型”为主线，而不是继续零散加功能？
2. 是否允许引入 localStorage schema v3 和迁移逻辑？
3. 是否接受每个信号增加 2-3 个调查动作，并让 Archive/Terminal/Diary 都围绕动作推进？
4. UI 方向是否继续保持当前冷静、密集、操作台风格，而不是改成更大面积的叙事/视觉展示页？
5. 下一轮是否需要我在实现后继续直接提交并推送，还是先给你看本地结果再推？

## 审核结论占位

- 审核状态：已按用户授权进入实现。
- 已实施范围：Phase 1 的部分 UI 稳定性、Phase 2 前半段的调查状态模型、v3 持久化迁移、Systems/Archive/Diary/Terminal 联动、终端命令请求预填、Diary 独立动作完成、扩展浏览器回归验证。
- 下一步仍不建议现在做：大规模重写 3D 地图、引入新设计库、重构为多路由应用。

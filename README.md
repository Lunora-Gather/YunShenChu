<div align="center">

# ☁️ 云深处 / The Deep Cloud

**A cinematic observer console for a floating city above the clouds.**  
一座漂浮在云层之上的城市，一组被隐藏的异常频段，一套属于观察者的调查协议。

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=111111)](#技术栈--tech-stack)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)](#技术栈--tech-stack)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](#技术栈--tech-stack)
[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Live-222222?logo=github&logoColor=white)](https://lunora-gather.github.io/YunShenChu/)

[在线体验 / Play Live](https://lunora-gather.github.io/YunShenChu/) · [Lunora Gather](https://github.com/Lunora-Gather)

</div>

---

## ✦ 项目概览 / Overview

**云深处 / The Deep Cloud** 是一个以“空中城市观察台”为核心概念的交互式叙事前端项目。玩家不是传统意义上的角色，而是接入城市系统的 **Observer**：在启动序列之后进入控制台，观察漂浮城市的各个城区，扫描隐藏频段，锁定异常信号，并沿着系统给出的 **Next Action** 推进调查。

项目的体验重点不是单一关卡通关，而是把 **城市监控、异常信号、档案调查、终端命令、居民动态与视觉氛围** 组合成一个完整的观察者界面。

> Open the city console, listen beneath the cloudline, and follow every anomaly until the archive answers back.

---

## ✦ 在线入口 / Live Demo

```text
https://lunora-gather.github.io/YunShenChu/
```

如果 GitHub Pages 刚完成部署但页面还没刷新，可以尝试强制刷新浏览器缓存。

| 系统 | 快捷键 |
| --- | --- |
| Windows / Linux | `Ctrl + F5` |
| macOS | `Command + Shift + R` |

---

## ✦ 核心体验 / Experience Highlights

| 模块 | 说明 |
| --- | --- |
| **Boot Sequence** | 启动序列营造进入观察者协议的仪式感。 |
| **Observer Console** | 主控制台聚合城市状态、城区切换、信号压力、时间与全局指标。 |
| **3D City Window** | 以可视化城市窗口展示漂浮城市、交通与环境层。 |
| **District Rail** | 在不同城区之间切换，观察高度、人口、安防、地标和社会指标。 |
| **Signal Interceptor** | 扫描隐藏频段，发现异常信号并写入观察者记忆。 |
| **Archive Investigation** | 对已发现或封存的异常线程进行筛选、搜索和调查推进。 |
| **Deep Terminal** | 通过终端动作执行追踪、记忆审计等调查步骤。 |
| **Camera / Diary / Pulse** | 结合安全摄像头、观察者日记和居民动态补充证据链。 |
| **Temporal Toggle** | 切换实时城市与 Foundation Archive 的时间层。 |
| **Atmospheric Systems** | 星场、粒子、天气、数据流、故障叠层和音频反馈共同塑造氛围。 |

---

## ✦ 玩法线索 / How It Plays

1. 进入页面后等待启动序列完成。
2. 在城市窗口中选择不同城区，查看当前区域的状态与地标。
3. 点击 **Start / Signals** 打开信号拦截器，扫描隐藏频段。
4. 锁定异常信号后，根据 **Next Action** 执行下一步调查。
5. 在 **Systems / Archive / Pulse** 等面板中交叉验证线索。
6. 使用终端、摄像头和观察者日记推进异常线程。

---

## ✦ 技术栈 / Tech Stack

| 分类 | 技术 |
| --- | --- |
| Frontend | React 19 |
| Language | TypeScript |
| Build Tool | Vite |
| Icons | Lucide React |
| Styling | CSS Modules / Vanilla CSS |
| Deploy | GitHub Pages |

---

## ✦ 本地运行 / Local Development

```bash
git clone https://github.com/Lunora-Gather/YunShenChu.git
cd YunShenChu/SkyCity
npm ci
npm run dev
```

常用脚本：

```bash
npm run dev      # 启动本地开发服务器
npm run lint     # 运行 ESLint 检查
npm run build    # TypeScript 与 Vite 生产构建
npm run preview  # 本地预览生产构建
```

构建产物会输出到：

```text
SkyCity/dist/
```

项目已在 Vite 中配置相对资源路径，适合 GitHub Pages 子路径部署。

---

## ✦ 项目结构 / Project Structure

```text
.
├── README.md
└── SkyCity/
    ├── index.html
    ├── package.json
    ├── vite.config.ts
    └── src/
        ├── App.tsx
        ├── App.css
        ├── components/
        │   ├── AudioEngine/
        │   ├── BootSequence/
        │   ├── Chronicle/
        │   ├── CitizenFeed/
        │   ├── DataStream/
        │   ├── DeepTerminal/
        │   ├── EconomyDashboard/
        │   ├── Map3D/
        │   ├── SecurityCamera/
        │   ├── SignalInterceptor/
        │   └── ...
        ├── context/
        └── data/
            └── signals.ts
```

---

## ✦ 设计关键词 / Design Language

- **Cloud City / 空中城市**：漂浮城区、云层边界、城市高度与交通层。
- **Observer Protocol / 观察者协议**：玩家通过控制台理解城市，而不是直接扮演城市居民。
- **Signal Mystery / 频段谜题**：异常不是直接出现，而是通过频率、档案、证据和行动逐步显影。
- **Cinematic Interface / 电影化界面**：星场、扫描线、数据流、故障层和终端感构成整体视觉气质。

---

## ✦ 部署 / Deployment

仓库可通过 GitHub Pages 发布。生产构建命令：

```bash
cd SkyCity
npm ci
npm run build
```

发布目录：

```text
SkyCity/dist
```

---

## ✦ License

当前仓库暂未声明许可证。如需开放复用、课程展示或二次分发，建议后续补充明确的开源许可证。

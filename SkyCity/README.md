# 云深处 · 开发与发布

这里是《云深处》的应用目录。玩家入口、第一案提示和结案后的居民委托见[项目首页](../README.md)。以下命令在 `SkyCity/` 运行。

## 启动调查台

使用 Node.js 24 和 npm，与 GitHub Pages 的构建环境一致。

```sh
npm ci --include=optional
npm run dev
```

在浏览器中打开终端输出的网址。默认打开标题画面，同一地址的 `?view=field` 可直达调查台，`#watch` 可直达值夜巡查。要检查生产版，先运行 `npm run build`，再运行 `npm run preview`。

## 修改内容时从哪里开始

| 要修改的内容 | 入口 |
| --- | --- |
| 三环场景、远近景和调查台布局 | [现场数据](src/data/fieldSites.ts)、[调查台](src/App.tsx)、[调查台样式](src/FieldConsole.css) |
| 信号、案卷、仪器和最终发车清单 | [信号目录](src/data/signals.ts)、[案卷记录](src/data/caseFiles.ts)、[仪器样本](src/data/instruments.ts)、[发车清单](src/data/departureManifest.ts) |
| 班次、街区修缮、居民来信和回程货 | [巡查规则](src/data/nightWatch.ts)、[货运与来信](src/data/nightFreight.ts)、[值班台](src/components/NightWatch/) |
| 主档、重玩档、旧档迁移和备份合并 | [存储逻辑](src/context/observerStorage.ts)、[存档管理](src/components/SaveDesk/) |

## 验证

```sh
npm run lint
npm run test:storage
npx playwright install webkit
npm run test:browser
```

- `test:storage` 覆盖旧档迁移、备份验证、写入失败、同槽结局合并，以及巡查取样、调度和交班规则。
- `test:browser` 用构建后的游戏走完五案、发车清单与两种结局，另用触控操作跑完整主线、十四班巡查、居民送货和回程委托。布局检查覆盖短窗口、横屏、窄屏、长交班簿，以及地图站点能否实际点中。
- 在 macOS 上运行 `npm run test:safari` 可用系统 Safari 检查共享的浏览器流程。保持打开的测试页可见，结果会显示在页面和终端。浏览器测试通过独立本地地址读写测试存档。

## 制作离线版

```sh
npm run release:build
```

需要 Python 3.9 或更高版本。命令重新生成 `dist/`，检查入口资源、离线样式和 ZIP 完整性，然后写入 `release/The-Deep-Cloud.zip`。可用 `npm run release:build -- --output /目标目录/The-Deep-Cloud.zip` 指定输出路径。

解压后，macOS 用户双击「打开云深处.command」。在其他有 Python 3 的系统上，也可以从解压后的目录运行以下命令，再用浏览器打开 [本机游戏](http://127.0.0.1:4187/)。

```sh
python3 tools/play_local.py --serve-only
```

## 同步部署

推送到 `main` 会触发 [Pages 发布流程](../.github/workflows/deploy-pages.yml)。它安装锁定依赖，运行代码检查及存档与巡查测试，构建一次游戏，再把同一构建的离线包放入站点的 `downloads/`。生成的 `dist/` 和 `release/` 留在构建环境。

发布完成后，可从[线上游戏](https://lunora-gather.github.io/YunShenChu/)、[值夜巡查直达入口](https://lunora-gather.github.io/YunShenChu/#watch)和[离线下载](https://lunora-gather.github.io/YunShenChu/downloads/The-Deep-Cloud.zip)验收。

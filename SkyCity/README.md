# 云深处 / The Deep Cloud

云端城市观察台。玩家在主舷窗中观察区域、扫描隐藏频段、锁定异常信号，并沿着全局 Next Action 推进调查闭环。

## 在线试玩

GitHub Pages:

https://lunora-gather.github.io/YunShenChu/

## 本地运行

```bash
npm ci
npm run dev
```

开发服务器启动后打开终端输出中的本地地址，通常是 `http://127.0.0.1:5173/`。

## 构建

```bash
npm run lint
npm run build
```

构建产物在 `dist/`。Vite 已使用相对资源路径配置，`dist/index.html` 可以在 GitHub Pages 子路径下正常加载资源。

## 体验检查点

- 首次进入时，城市舷窗会显示 `Start signal sweep` 入口。
- 锁定信号后，底部 Signal Strip 会显示当前记忆和下一步调查动作。
- Archive 支持按 All / Unlocked / Sealed 过滤，并可搜索异常 id、标题、来源、证据、影响和调查动作。
- 本地记忆会保存已发现信号、调查动作和观察日志，刷新后可恢复。

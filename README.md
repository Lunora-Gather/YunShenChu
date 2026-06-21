# 云深处 / The Deep Cloud

可交互的空中城市观察台。打开页面后，扫描隐藏频段、锁定异常信号，并沿着全局 Next Action 推进调查。

## 在线试玩

GitHub Pages:

https://lunora-gather.github.io/YunShenChu/

> 如果页面还没出现，检查 GitHub 仓库的 Pages 设置是否启用 GitHub Actions 部署。

## 本地运行

```bash
cd SkyCity
npm ci
npm run dev
```

## 构建检查

```bash
cd SkyCity
npm run lint
npm run build
```

构建产物会输出到 `SkyCity/dist/`。项目已配置相对资源路径，GitHub Pages 子路径部署和直接打开构建后的 `index.html` 都能加载前端资源。

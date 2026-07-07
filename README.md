# 明日方舟式文风转换器

一个把中文文本改写成明日方舟式战术终端风格的小工具。当前主部署目标是 Vercel，前端静态页面和 `/api/transform` API 代理在同一个域名下运行。

主站地址：

```text
https://arknights-style-converter.vercel.app
```

备用 GitHub Pages 地址：

```text
https://huzaigong.github.io/arknights-style-converter/
```

仓库地址：

```text
https://github.com/HuZaiGong/arknights-style-converter
```

## 功能

- 输入中文文本并转换为明日方舟式表达。
- 基于 `DesignLanguage.txt` 的战术工业/HUD 风格界面。
- 内置通用语气预设：
  - 罗德岛终端
  - 阿米娅式
  - 凯尔希式
  - W式
  - 银灰式
  - 能天使式
- 支持大量干员风格预设，并提供搜索和筛选。
- 可按干员名、阵营、职业、标签、风格模板检索。
- 风格强度滑杆。
- 小齿轮配置菜单，可配置 API URL、API Key、Model。
- 一键复制转换结果。
- 本地 Node 代理用于开发。
- Vercel API 代理用于主生产环境。
- Cloudflare Worker 作为 GitHub Pages fallback 保留。

## 架构

主生产路径，也就是 Vercel：

```text
浏览器访问 Vercel 页面
  -> 同源 /api/transform
  -> OpenAI-compatible /chat/completions API
  -> 浏览器收到结果
```

本地开发路径：

```text
浏览器访问 http://127.0.0.1:4173
  -> 本地 Node 服务 /api/transform
  -> OpenAI-compatible /chat/completions API
  -> 浏览器收到结果
```

GitHub Pages fallback 路径：

```text
浏览器访问 GitHub Pages
  -> Cloudflare Worker /api/transform
  -> OpenAI-compatible /chat/completions API
  -> 浏览器收到结果
```

`app.js` 会按当前页面域名选择 API endpoint：

- `localhost` / `127.0.0.1`：使用本地 `/api/transform`
- `*.github.io`：使用 Cloudflare Worker fallback
- 其他生产域名，例如 Vercel：使用同源 `/api/transform`

## 文件说明

- `index.html`：主页面结构。
- `styles.css`：战术工业/HUD 风格样式。
- `app.js`：浏览器交互、设置菜单、干员搜索、endpoint 选择。
- `config.js`：共享默认配置、通用预设、prompt、校验逻辑、错误文案。
- `operatorStyles.js`：干员风格模板和干员数据。
- `api/transform.js`：Vercel Serverless Function API 代理。
- `server.js`：本地开发静态服务和 API 代理。
- `worker.js`：Cloudflare Worker API 代理，用于 GitHub Pages fallback。
- `vercel.json`：Vercel 函数配置。
- `wrangler.toml`：Cloudflare Worker 部署配置。
- `DesignLanguage.txt`：界面设计参考。

## 干员风格

干员风格定义在 `operatorStyles.js`。

文件分为两层：

```text
styleArchetypes -> 可复用的语气模板
operators        -> 干员名、阵营、职业、稀有度、标签、修饰说明
```

这样可以避免每个干员都写一大段完全独立的 prompt。新增干员时，优先复用已有 `archetype`，只有现有模板无法表达该干员风格时，再新增模板。

当前 UI 支持搜索式选择干员风格。可以搜索：

- 干员名，例如 `凯尔希`、`重岳`
- 阵营，例如 `罗德岛`、`拉特兰`、`卡西米尔`
- 职业，例如 `近卫`、`医疗`、`狙击`
- 标签，例如 `深海`、`骑士`、`毒理`、`审判`
- 风格模板，例如 `poeticMystic`、`silentBlade`

选择器提供三个筛选入口：

```text
全部 / 通用 / 干员
```

这让干员数量继续增加时也能快速定位，而不是在超长下拉框里查找。

## 设置菜单

页面右上角的小齿轮菜单支持运行时配置：

- API URL
- API Key
- Model

默认配置指向 Kenari 的 OpenAI-compatible API。设置会保存到浏览器 `localStorage`，每次转换时都会随请求发送给本地服务、Vercel 函数或 Worker。

Cloudflare Worker 会限制允许的来源和上游 API host，避免变成通用开放代理。Vercel 主部署是同源请求，不涉及浏览器 CORS 问题。

## 本地开发

要求：

- Node.js 18 或更新版本。

启动本地服务：

```bash
npm start
```

打开：

```text
http://127.0.0.1:4173
```

运行语法检查：

```bash
npm run check
```

可选：使用 Vercel 本地开发模式：

```bash
npm run dev:vercel
```

## Vercel 部署

Vercel 应连接到这个 GitHub 仓库。连接后，日常更新只需要提交并推送到 GitHub，Vercel 会自动部署最新提交。一般不需要先手动更新 Vercel 再更新 GitHub。

登录：

```bash
npx vercel login
```

第一次设置/部署：

```bash
npx vercel
```

生产部署：

```bash
npx vercel --prod
```

生产 API endpoint：

```text
/api/transform
```

因为 Vercel 上前端和 API 同源，所以主站不会遇到 `workers.dev` 难以访问的问题。

## GitHub 日常更新流程

普通代码更新：

```bash
git add .
git commit -m "Describe the change"
git push
```

如果 Vercel 已经和 GitHub 仓库关联，推送到 `main` 后会自动触发新部署。

## Cloudflare Worker fallback

Cloudflare Worker 仍保留给 GitHub Pages fallback 使用。

手动部署 Worker：

```bash
npx wrangler deploy
```

当前 Worker 地址：

```text
https://arknights-style-converter-api.1421201386.workers.dev
```

## GitHub Pages fallback

GitHub Pages 地址：

```text
https://huzaigong.github.io/arknights-style-converter/
```

检查 GitHub Pages 状态：

```bash
gh api repos/HuZaiGong/arknights-style-converter/pages --jq '{html_url, status, source}'
```

## 备注

- API 配置有意暴露在页面设置菜单中，当前项目不把 API key 安全作为重点。
- Vercel 函数和 Worker 都会返回统一错误码和面向用户的中文错误提示，不直接暴露上游原始响应。
- prompt 只借鉴明日方舟式战术、医疗、工业、终端报告语感；要求模型不要引用官方台词，也不要声称输出来自官方。

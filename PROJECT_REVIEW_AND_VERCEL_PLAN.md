# 项目现状审查与 Vercel API 代理方案

## 当前状态

仓库地址：

```text
https://github.com/HuZaiGong/arknights-style-converter
```

当前主部署目标：Vercel。

预期 Vercel 前端与 API：

```text
https://arknights-style-converter.vercel.app/
https://arknights-style-converter.vercel.app/api/transform
```

备用 GitHub Pages 前端：

```text
https://huzaigong.github.io/arknights-style-converter/
```

备用 Cloudflare Worker API 代理：

```text
https://arknights-style-converter-api.1421201386.workers.dev/api/transform
```

当前本地开发服务：

```text
http://127.0.0.1:4173
```

## 当前结构

```text
index.html
app.js
styles.css
config.js
server.js
api/transform.js
worker.js
vercel.json
wrangler.toml
package.json
README.md
DesignLanguage.txt
Speaking style of the arknights.txt
```

## 当前可工作的部分

- 静态 UI 可以部署到 Vercel 或 GitHub Pages。
- Vercel 提供同源 `/api/transform` Serverless Function。
- 本地 Node 服务可以提供页面，并代理 `/api/transform`。
- Cloudflare Worker 仍保留为 GitHub Pages fallback。
- 默认配置、prompt 构造、校验逻辑和错误文案集中在 `config.js`。
- 页面里已有小齿轮设置菜单，可配置 API URL、API key 和 model。
- `apikey.txt` 已删除。
- `npm run check` 会检查核心 JavaScript 文件，包括 Vercel API。

## 已解决的问题

### 1. 主生产路径不再依赖 `workers.dev`

Vercel 主部署路径是：

```text
浏览器
  -> Vercel 静态前端
  -> 同源 /api/transform
  -> Kenari OpenAI-compatible API
  -> 浏览器收到结果
```

这样主站用户不会再访问 `workers.dev`。GitHub Pages 仍然可以作为备用页面，但它会继续通过 Cloudflare Worker fallback 调用 API。

### 2. 前端和 API 同源

Vercel 上的前端和 API 都在同一个域名下：

```text
https://arknights-style-converter.vercel.app/
https://arknights-style-converter.vercel.app/api/transform
```

因此主生产路径没有浏览器 CORS 问题。

### 3. 部署面更清晰

推荐的日常更新流程是：

```text
修改代码
  -> git commit
  -> git push GitHub
  -> Vercel 自动从 GitHub 部署
```

如果 Vercel 项目已关联 GitHub 仓库，之后通常不需要先手动更新 Vercel 再更新 GitHub。GitHub 是代码源，Vercel 是自动部署目标。

## 仍然存在的注意点

### 1. 默认 API key 仍然公开

默认 key 仍然在 `config.js` 中：

```js
apiKey: "kn-..."
```

这是当前项目接受的前提。以后如果要收紧，可以把 key 移入 Vercel Environment Variables，并让 `api/transform.js` 使用 `process.env.KENARI_API_KEY`。

### 2. GitHub Pages fallback 仍依赖 Worker

GitHub Pages 不是主路径了，但如果用户访问 GitHub Pages fallback，它仍然会调用 Cloudflare Worker：

```text
GitHub Pages
  -> Cloudflare Worker
  -> Kenari API
```

因此 GitHub Pages fallback 仍可能受到 `workers.dev` 网络可达性的影响。

### 3. Vercel API 允许自定义 API URL

页面设置菜单允许用户修改 API URL。Vercel API 会校验 URL 格式，但不像 Worker 那样强制 host 白名单。这样更灵活，也意味着用户输入错误 API URL 时会得到上游请求失败的提示。

## Vercel 部署步骤

### 1. 登录

```bash
npx vercel login
```

### 2. 第一次部署/关联项目

在项目根目录运行：

```bash
npx vercel
```

常见回答：

```text
Set up and deploy? yes
Which scope? 选择账号
Link to existing project? no 或选择已有项目
Project name? arknights-style-converter
Directory? ./
Build command? 留空
Output directory? 留空
Development command? 留空
```

### 3. 生产部署

```bash
npx vercel --prod
```

### 4. 测试生产 API

```bash
curl -i https://arknights-style-converter.vercel.app/api/transform \
  -H "Content-Type: application/json" \
  --data "{\"text\":\"今天事情很多，但我会处理完。\",\"persona\":\"terminal\",\"intensity\":65}"
```

预期结果：

```json
{
  "ok": true,
  "result": "...",
  "model": "deepseek-v4-flash:free"
}
```

## 日常更新流程

如果 Vercel 已关联 GitHub 仓库：

```bash
git add .
git commit -m "Describe the change"
git push
```

推送到 GitHub 后，Vercel 会自动部署最新提交。

如果只是本地临时预览：

```bash
npm run dev:vercel
```

如果需要手动生产部署：

```bash
npx vercel --prod
```

## 推荐后续整理

Vercel 验证稳定后，可以考虑：

- 把 GitHub Pages 标记为 fallback，而不是主入口。
- 保留 Cloudflare Worker 作为备用，或删除 `worker.js` / `wrangler.toml` 简化仓库。
- 把默认 API key 移入 Vercel 环境变量，减少前端暴露。
- 增加浏览器级 smoke test，验证设置菜单、模块加载和转换流程。

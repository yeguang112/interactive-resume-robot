# 腾讯云 CloudBase 部署指南

## 前置条件

1. 注册腾讯云账号：https://cloud.tencent.com/
2. 登录 CloudBase 控制台：https://console.cloud.tencent.com/tcb

---

## 方式一：控制台部署（推荐，无需安装 CLI）

### 第 1 步：创建 CloudBase 环境

1. 打开 https://console.cloud.tencent.com/tcb
2. 点击「新建环境」
3. 选择「按量计费」→ 填写环境名称（如 `resume-robot`）
4. 选择离你最近的地域（广州、上海、北京等）
5. 创建完成后记下**环境 ID**（类似 `resume-robot-xxxxx`）

### 第 2 步：开启云托管

1. 在 CloudBase 控制台左侧菜单选择「云托管」
2. 点击「开通服务」
3. 选择「代码库导入」→ 关联你的 GitHub 仓库 `yeguang112/interactive-resume-robot`
   - 如果仓库还没有最新代码，先推送代码到 GitHub
4. 或选择「本地代码上传」→ 打包项目目录（不含 node_modules）上传

### 第 3 步：配置环境变量

1. 在云托管 →「服务设置」→「环境变量」中添加：
   ```
   DEEPSEEK_API_KEY = <你的DeepSeek API Key>
   ```
2. 保存

### 第 4 步：部署

1. 云托管会自动识别 `Dockerfile` 并构建
2. 构建完成后，在「访问服务」中可以看到访问地址
3. CloudBase 会提供一个免费域名：`https://xxx.sh.run.tcloudbase.com`
4. 点击访问地址即可打开网站

---

## 方式二：CLI 部署

### 安装 CLI

```bash
npm install -g @cloudbase/cli
```

### 登录

```bash
tcb login
```

### 初始化

```bash
cd interactive-resume-robot
tcb init
# 选择「云托管」模板
```

### 部署

```bash
# 设置环境变量
tcb env set DEEPSEEK_API_KEY "<你的DeepSeek API Key>"

# 部署到云托管
tcb run deploy --port 3000
```

---

## 方式三：本地打包上传（最简单）

如果 GitHub 连接不方便，可以直接上传代码包：

1. 在项目目录执行构建：
   ```bash
   npm install
   npx vite build
   ```
2. 打包以下文件为 ZIP（不要包含 node_modules）：
   - `server.js`
   - `Dockerfile`
   - `.dockerignore`
   - `package.json`
   - `src/`（整个目录）
   - `index.html`
   - `vite.config.ts`
   - `tailwind.config.ts`
   - `postcss.config.js`
   - `tsconfig.json`
3. 在 CloudBase 控制台 → 云托管 → 「新建服务」→ 「本地上传代码」
4. 上传 ZIP 文件
5. 设置环境变量 `DEEPSEEK_API_KEY`
6. 点击部署

---

## 部署后验证

1. 打开 CloudBase 提供的访问地址
2. 检查：
   - ✅ 页面正常加载，得意黑字体显示
   - ✅ 3D 机器人场景加载
   - ✅ 点击机器人进入对话模式
   - ✅ AI 对话正常回复（流式）
   - ✅ 语音朗读正常播放
3. 如果有问题，在云托管「日志」中查看运行日志

---

## 常见问题

### Q: 构建失败怎么办？
A: 检查 Dockerfile 中的 Node.js 版本。项目需要 Node.js 18+。

### Q: API 报 500 错误？
A: 确认环境变量 `DEEPSEEK_API_KEY` 已正确设置。

### Q: TTS 没有声音？
A: Edge TTS 需要连接微软服务器，确认服务器的网络可以访问外网。

### Q: 3D 场景加载慢？
A: Spline 场景从国外 CDN 加载，首次加载较慢属正常现象。

### Q: 如何绑定自定义域名？
A: 在 CloudBase 控制台 → 云托管 → 「访问服务」→ 添加自定义域名。国内域名需要 ICP 备案。

---

## 文件说明

| 文件 | 作用 |
|------|------|
| `server.js` | Express 生产服务器，处理静态文件 + API |
| `Dockerfile` | Docker 容器构建配置 |
| `.dockerignore` | Docker 构建排除文件 |
| `cloudbaserc.json` | CloudBase 部署配置 |
| `package.json` | 项目依赖和脚本 |

# Supabase 设置指南

## 为什么需要 Supabase？

你的网站部署在 GitHub Pages（纯静态），没有后端服务器。Supabase 提供免费的 PostgreSQL 数据库 + API，让你的数字分身能够：
- 记录每个用户的对话到数据库
- 在管理后台查看所有对话
- 动态更新 AI 的知识库（无需重新部署代码）

## 设置步骤（约 5 分钟）

### 1. 注册 Supabase

1. 访问 https://supabase.com
2. 点击 "Start your project" 注册（可用 GitHub 登录）
3. 点击 "New Project" 创建新项目
4. 填写项目名称（如 `resume-chat`），选择离你最近的区域
5. 设置数据库密码（记住它，或用自动生成的）
6. 点击 "Create new project"，等待 1-2 分钟初始化

### 2. 创建数据表

1. 在 Supabase 控制台左侧点击 **"SQL Editor"**
2. 点击 "New query"
3. 打开项目根目录的 `supabase-schema.sql` 文件
4. 复制全部内容粘贴到 SQL Editor
5. 点击 "Run" 执行
6. 确认看到 "Success" 消息

### 3. 获取 API 密钥

1. 在 Supabase 控制台左侧点击 **"Project Settings"**（齿轮图标）
2. 点击 **"API"**
3. 找到以下两个值：
   - **Project URL**: 类似 `https://xxxxxxxx.supabase.co`
   - **anon public key**: 一长串 `eyJ...` 开头的字符串

### 4. 配置本地环境变量

编辑项目根目录的 `.env` 文件，取消 Supabase 配置的注释并填入：

```
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...你的anon_key
```

### 5. 配置 GitHub Actions 密钥（用于线上部署）

1. 访问 https://github.com/yeguang112/interactive-resume-robot/settings/secrets/actions
2. 点击 "New repository secret"
3. 添加两个密钥：
   - Name: `SUPABASE_URL`，Value: 你的 Supabase Project URL
   - Name: `SUPABASE_ANON_KEY`，Value: 你的 Supabase anon public key
4. 添加完后重新触发部署（Actions → Run workflow）

### 6. 测试

- **本地测试**: `npm run build && cd dist && python -m http.server 8080`
  - 访问 http://localhost:8080 和 AI 对话
  - 访问 http://localhost:8080/?admin=1 查看管理后台
- **线上测试**: 等 GitHub Pages 部署完成后同样测试

## 管理后台使用

### 访问方式
在网站 URL 后添加 `?admin=1`：
- 本地: `http://localhost:8080/?admin=1`
- 线上: `https://yeguang112.github.io/interactive-resume-robot/?admin=1`

### 功能说明

**对话记录标签页:**
- 查看所有用户与 AI 的对话
- 标记重要对话（★）
- 标记已查看（✓）
- 添加管理笔记
- 一键将用户问题加入知识库

**知识库标签页:**
- 添加新的知识条目（AI 会自动读取作为补充知识）
- 启用/禁用知识条目
- 删除知识条目
- 知识条目按分类管理（如"用户纠正"、"补充信息"等）

### 知识库工作原理

1. 你在管理后台添加知识条目
2. 用户发送消息时，AI 会先从 Supabase 获取所有活跃的知识条目
3. 这些知识会被追加到系统提示词中
4. AI 回复时会参考这些补充知识
5. **无需重新部署代码，立即生效**（有 5 分钟缓存）

## 安全说明

- 使用的是 Supabase 的 anon key（公开密钥），只能执行 RLS 策略允许的操作
- 匿名用户只能：插入对话记录、查看/更新对话记录、查看/插入/更新/删除知识库
- 如果需要更严格的权限控制，可以在 Supabase 中修改 RLS 策略
- 建议生产环境添加管理员认证（当前为简化版，管理后台无密码保护）

## 免费额度

Supabase 免费计划包含：
- 500MB 数据库存储
- 50,000 月活用户
- 无限 API 请求
- 对个人项目完全够用

FROM node:18-slim

WORKDIR /app

# 复制 package 文件
COPY package.json package-lock.json* ./

# 安装所有依赖（包括 devDependencies 用于构建）
RUN npm install

# 安装 express（生产服务器）
RUN npm install express

# 复制源代码
COPY . .

# 构建前端
RUN npx vite build

# 移除开发依赖，减小镜像体积
RUN npm prune --production

EXPOSE 3000

CMD ["node", "server.js"]

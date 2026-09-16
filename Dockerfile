# 使用 Node.js 官方镜像
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm install --production

# 复制应用代码
COPY . .

# 创建数据目录并设置权限
RUN mkdir -p /app/data && chown -R node:node /app/data

# 切换到非 root 用户
USER node

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["node", "server.js"]

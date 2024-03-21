#!/bin/bash

# 服务器步骤
FRONTEND_DIR="/home/ubuntu/ec-web-signoz/frontend" # 前端目录
OTEL_COLLECTOR_DIR="/home/ubuntu/ec-web-signoz/signoz-otel-collector"

# 进入前端目录
cd $FRONTEND_DIR || {
    echo "Failed to enter the frontend directory."
    exit 1
}

# 安装依赖
echo "Installing npm dependencies..."
npm install --force || {
    echo "Failed to install npm dependencies."
    exit 1
}

# 构建前端，tb1环境执行npm run build:tb1
echo "Building the frontend..."
# npm run build || {
npm run build:tb1 || {
    echo "Failed to build the frontend."
    exit 1
}

# 构建otel-collector
cd $OTEL_COLLECTOR_DIR || {
    echo "Failed to enter the signoz-otel-collector directory."
    exit 1
}
make build

# 构建query-service
cd "/home/ubuntu/ec-web-signoz"
make build-query-service-static-amd64

# 关闭运行的前端与收集器容器
echo "Stopping running containers..."
docker stop signoz-otel-collector signoz-frontend signoz-query-service || {
    echo "Failed to stop the containers."
    exit 1
}

# 删除所有停止的容器和未使用的镜像
echo "delete unuse containers & images..."
docker container prune -f
docker image prune -f -a

# 重新启动服务
# 1, 清空文件日志
cat /dev/null > "/home/ubuntu/templogs/access.log"
cat /dev/null > "/home/ubuntu/templogs/customlog.log"

# 2, 使用Docker Compose重新启动服务
docker-compose -f /home/ubuntu/ec-web-signoz/deploy/docker/clickhouse-setup/docker-compose.yaml up -d
echo "Complete the process!"
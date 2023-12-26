# fork from https://github.com/SigNoz/signoz

## 线上分支 - master

## 部署流程

### 一，流程说明

1. jenkins 环境拉取代码，分支为 master；
2. 复制完整项目到服务器对应目录中/home/ubuntu/ec-web-signoz 下
3. 进入服务器环境，进入 frontend 目录，执行 npm install --force
4. 运行 npm run build
5. 关闭正在运行的前端与收集器容器

```
docker stop signoz-otel-collector signoz-frontend
```

6. 删除停止运行容器镜像；

```
docker container prune -f
docker image prune -f -a
```

7. 重新启动服务，先清空文件日志信息，在重启 docker 服务；

### 二，具体操作

#### 1，服务器部分

- 给予脚本权限：chmod +x deploy.sh
- 执行脚本

```
  ./deploy.sh
```

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

<!-- - 给予脚本权限：chmod +x deploy.sh -->

- 执行脚本

```
  ./deploy.sh
```

### 三，首次机器迁移需要操作

#### 迁移数据

迁移系列目录下数据内容迁移到新机器上；

- 关闭现阶段正在运行服务, 由于服务器上 docker 服务只有 signoz 相关服务，可以全关闭

```
docker stop $(docker ps -aq)
docker container prune -f
docker image prune -f -a
```

- 复制下列目录下数据到新服务器上

```
1, /home/ubuntu/ec-web-signoz/deploy/docker/clickhouse-setup/data/signoz
2, /home/ubuntu/ec-web-signoz/deploy/docker/clickhouse-setup/data/clickhouse
```

- 在新机器上启服务，执行下列内容

```
1，cat /dev/null > "/home/ubuntu/templogs/access.log"
2，cat /dev/null > "/home/ubuntu/templogs/customlog.log"
3，docker-compose -f /home/ubuntu/ec-web-signoz/deploy/docker/clickhouse-setup/docker-compose.yaml up -d
```

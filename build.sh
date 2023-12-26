#!/bin/bash

# jenkins机器步骤
# 定义变量
GIT_REPO_URL="https://github.com/sayweee/ec-web-signoz.git" # 替换成你的仓库 URL
GIT_BRANCH="master"
DESTINATION_DIR="/home/ubuntu/ec-web-signoz" # 替换成服务器上的目标目录


# 拉取代码
echo "Pulling code from the repository..."
git clone -b $GIT_BRANCH $GIT_REPO_URL || {
    echo "Failed to clone the repository."
    exit 1
}

# 复制项目到服务器对应目录中，从jenkins复制到服务器
cp -rf ec-web-signoz $DESTINATION_DIR


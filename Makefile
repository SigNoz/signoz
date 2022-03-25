#
# Reference Guide - https://www.gnu.org/software/make/manual/make.html
#

# Build variables
BUILD_VERSION   ?= $(shell git describe --always --tags)
BUILD_HASH      ?= $(shell git rev-parse --short HEAD)
BUILD_TIME      ?= $(shell date -u +"%Y-%m-%dT%H:%M:%SZ")
BUILD_BRANCH    ?= $(shell git rev-parse --abbrev-ref HEAD)

# Internal variables or constants.
FRONTEND_DIRECTORY ?= frontend
FLATTENER_DIRECTORY ?= pkg/processors/flattener
QUERY_SERVICE_DIRECTORY ?= pkg/query-service
STANDALONE_DIRECTORY ?= deploy/docker/clickhouse-setup
SWARM_DIRECTORY ?= deploy/docker-swarm/clickhouse-setup

REPONAME ?= signoz
DOCKER_TAG ?= latest

FRONTEND_DOCKER_IMAGE ?= frontend
QUERY_SERVICE_DOCKER_IMAGE ?= query-service
FLATTERNER_DOCKER_IMAGE ?= flattener-processor

# Build-time Go variables
PACKAGE?=go.signoz.io/query-service
buildVersion=${PACKAGE}/version.buildVersion
buildHash=${PACKAGE}/version.buildHash
buildTime=${PACKAGE}/version.buildTime
gitBranch=${PACKAGE}/version.gitBranch

LD_FLAGS="-X ${buildHash}=${BUILD_HASH} -X ${buildTime}=${BUILD_TIME} -X ${buildVersion}=${BUILD_VERSION} -X ${gitBranch}=${BUILD_BRANCH}"

all: build-push-frontend build-push-query-service build-push-flattener
# Steps to build and push docker image of frontend
.PHONY: build-frontend-amd64  build-push-frontend
# Step to build docker image of frontend in amd64 (used in build pipeline)
build-frontend-amd64:
	@echo "------------------"
	@echo "--> Building frontend docker image for amd64"
	@echo "------------------"
	@cd $(FRONTEND_DIRECTORY) && \
	docker build -f Dockerfile  --no-cache -t $(REPONAME)/$(FRONTEND_DOCKER_IMAGE):$(DOCKER_TAG) \
	--build-arg TARGETPLATFORM="linux/amd64" .

# Step to build and push docker image of frontend(used in push pipeline)
build-push-frontend:
	@echo "------------------"
	@echo "--> Building and pushing frontend docker image"
	@echo "------------------"
	@cd $(FRONTEND_DIRECTORY) && \
	docker buildx build --file Dockerfile --progress plane --no-cache --push --platform linux/amd64 \
	--tag $(REPONAME)/$(FRONTEND_DOCKER_IMAGE):$(DOCKER_TAG) .

# Steps to build and push docker image of query service
.PHONY: build-query-service-amd64  build-push-query-service
# Step to build docker image of query service in amd64 (used in build pipeline)
build-query-service-amd64:
	@echo "------------------"
	@echo "--> Building query-service docker image for amd64"
	@echo "------------------"
	@cd $(QUERY_SERVICE_DIRECTORY) && \
	docker build -f Dockerfile  --no-cache -t $(REPONAME)/$(QUERY_SERVICE_DOCKER_IMAGE):$(DOCKER_TAG) \
	--build-arg TARGETPLATFORM="linux/amd64" --build-arg LD_FLAGS=$(LD_FLAGS) .

# Step to build and push docker image of query in amd64 and arm64 (used in push pipeline)
build-push-query-service:
	@echo "------------------"
	@echo "--> Building and pushing query-service docker image"
	@echo "------------------"
	@cd $(QUERY_SERVICE_DIRECTORY) && \
	docker buildx build --file Dockerfile --progress plane --no-cache \
	--push --platform linux/arm64,linux/amd64 --build-arg LD_FLAGS=$(LD_FLAGS) \
	--tag $(REPONAME)/$(QUERY_SERVICE_DOCKER_IMAGE):$(DOCKER_TAG) .

# Steps to build and push docker image of flattener
.PHONY: build-flattener-amd64  build-push-flattener
# Step to build docker image of flattener in amd64 (used in build pipeline)
build-flattener-amd64:
	@echo "------------------"
	@echo "--> Building flattener docker image for amd64"
	@echo "------------------"
	@cd $(FLATTENER_DIRECTORY) && \
	docker build -f Dockerfile  --no-cache -t $(REPONAME)/$(FLATTERNER_DOCKER_IMAGE):$(DOCKER_TAG) \
	--build-arg TARGETPLATFORM="linux/amd64" .

# Step to build and push docker image of flattener in amd64 (used in push pipeline)
build-push-flattener:
	@echo "------------------"
	@echo "--> Building and pushing flattener docker image"
	@echo "------------------"
	@cd $(FLATTENER_DIRECTORY) && \
	docker buildx build --file Dockerfile --progress plane \
	--no-cache --push --platform linux/arm64,linux/amd64 \
	--tag $(REPONAME)/$(FLATTERNER_DOCKER_IMAGE):$(DOCKER_TAG) .

dev-setup:
	mkdir -p /var/lib/signoz
	sqlite3 /var/lib/signoz/signoz.db "VACUUM";
	mkdir -p pkg/query-service/config/dashboards
	@echo "------------------"
	@echo "--> Local Setup completed"
	@echo "------------------"

run-x86:
	@docker-compose -f $(STANDALONE_DIRECTORY)/docker-compose.yaml up -d

run-arm:
	@docker-compose -f $(STANDALONE_DIRECTORY)/docker-compose.arm.yaml up -d

down-x86:
	@docker-compose -f $(STANDALONE_DIRECTORY)/docker-compose.yaml down -v

down-arm:
	@docker-compose -f $(STANDALONE_DIRECTORY)/docker-compose.arm.yaml down -v

clear-standalone-data:
	@cd $(STANDALONE_DIRECTORY)
	@docker run --rm -v "data:/pwd" busybox \
	sh -c "cd /pwd && rm -rf alertmanager/* clickhouse/* signoz/*"

clear-swarm-data:
	@cd $(SWARM_DIRECTORY)
	@docker run --rm -v "data:/pwd" busybox \
	sh -c "cd /pwd && rm -rf alertmanager/* clickhouse/* signoz/*"

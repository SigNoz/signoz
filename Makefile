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
QUERY_SERVICE_DIRECTORY ?= pkg/query-service
STANDALONE_DIRECTORY ?= deploy/docker/clickhouse-setup
SWARM_DIRECTORY ?= deploy/docker-swarm/clickhouse-setup
LOCAL_GOOS ?= $(shell go env GOOS)
LOCAL_GOARCH ?= $(shell go env GOARCH)

REPONAME ?= signoz
DOCKER_TAG ?= latest

FRONTEND_DOCKER_IMAGE ?= frontend
QUERY_SERVICE_DOCKER_IMAGE ?= query-service

# Build-time Go variables
PACKAGE?=go.signoz.io/query-service
buildVersion=${PACKAGE}/version.buildVersion
buildHash=${PACKAGE}/version.buildHash
buildTime=${PACKAGE}/version.buildTime
gitBranch=${PACKAGE}/version.gitBranch

LD_FLAGS="-X ${buildHash}=${BUILD_HASH} -X ${buildTime}=${BUILD_TIME} -X ${buildVersion}=${BUILD_VERSION} -X ${gitBranch}=${BUILD_BRANCH}"

all: build-push-frontend build-push-query-service
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

dev-setup:
	mkdir -p /var/lib/signoz
	sqlite3 /var/lib/signoz/signoz.db "VACUUM";
	mkdir -p pkg/query-service/config/dashboards
	@echo "------------------"
	@echo "--> Local Setup completed"
	@echo "------------------"

run-local:
	@LOCAL_GOOS=$(LOCAL_GOOS) LOCAL_GOARCH=$(LOCAL_GOARCH) docker-compose -f \
	$(STANDALONE_DIRECTORY)/docker-compose-core.yaml -f $(STANDALONE_DIRECTORY)/docker-compose-local.yaml \
	up --build -d

down-local:
	@docker-compose -f \
	$(STANDALONE_DIRECTORY)/docker-compose-core.yaml -f $(STANDALONE_DIRECTORY)/docker-compose-local.yaml \
	down -v

run-x86:
	@docker-compose -f \
	$(STANDALONE_DIRECTORY)/docker-compose-core.yaml -f $(STANDALONE_DIRECTORY)/docker-compose-prod.yaml \
	up --build -d

down-x86:
	@docker-compose -f \
	$(STANDALONE_DIRECTORY)/docker-compose-core.yaml -f $(STANDALONE_DIRECTORY)/docker-compose-prod.yaml \
	down -v

clear-standalone-data:
	@docker run --rm -v "$(PWD)/$(STANDALONE_DIRECTORY)/data:/pwd" busybox \
	sh -c "cd /pwd && rm -rf alertmanager/* clickhouse/* signoz/*"

clear-swarm-data:
	@docker run --rm -v "$(PWD)/$(SWARM_DIRECTORY)/data:/pwd" busybox \
	sh -c "cd /pwd && rm -rf alertmanager/* clickhouse/* signoz/*"

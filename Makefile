#
# Reference Guide - https://www.gnu.org/software/make/manual/make.html
#

# Build variables
BUILD_VERSION   ?= $(shell git describe --always --tags)
BUILD_HASH      ?= $(shell git rev-parse --short HEAD)
BUILD_TIME      ?= $(shell date -u +"%Y-%m-%dT%H:%M:%SZ")
BUILD_BRANCH    ?= $(shell git rev-parse --abbrev-ref HEAD)
DEV_LICENSE_SIGNOZ_IO ?= https://staging-license.signoz.io/api/v1

# Internal variables or constants.
FRONTEND_DIRECTORY ?= frontend
QUERY_SERVICE_DIRECTORY ?= pkg/query-service
EE_QUERY_SERVICE_DIRECTORY ?= ee/query-service
STANDALONE_DIRECTORY ?= deploy/docker/clickhouse-setup
SWARM_DIRECTORY ?= deploy/docker-swarm/clickhouse-setup
LOCAL_GOOS ?= $(shell go env GOOS)
LOCAL_GOARCH ?= $(shell go env GOARCH)

REPONAME ?= signoz
DOCKER_TAG ?= latest

FRONTEND_DOCKER_IMAGE ?= frontend
QUERY_SERVICE_DOCKER_IMAGE ?= query-service
DEV_BUILD ?= ""

# Build-time Go variables
PACKAGE?=go.signoz.io/signoz
buildVersion=${PACKAGE}/pkg/query-service/version.buildVersion
buildHash=${PACKAGE}/pkg/query-service/version.buildHash
buildTime=${PACKAGE}/pkg/query-service/version.buildTime
gitBranch=${PACKAGE}/pkg/query-service/version.gitBranch
licenseSignozIo=${PACKAGE}/ee/query-service/constants.LicenseSignozIo

LD_FLAGS=-X ${buildHash}=${BUILD_HASH} -X ${buildTime}=${BUILD_TIME} -X ${buildVersion}=${BUILD_VERSION} -X ${gitBranch}=${BUILD_BRANCH}
DEV_LD_FLAGS=-X ${licenseSignozIo}=${DEV_LICENSE_SIGNOZ_IO}

all: build-push-frontend build-push-query-service
# Steps to build and push docker image of frontend
.PHONY: build-frontend-amd64  build-push-frontend
# Step to build docker image of frontend in amd64 (used in build pipeline)
build-frontend-amd64:
	@echo "------------------"
	@echo "--> Building frontend docker image for amd64"
	@echo "------------------"
	@cd $(FRONTEND_DIRECTORY) && \
	docker build --file Dockerfile  --no-cache -t $(REPONAME)/$(FRONTEND_DOCKER_IMAGE):$(DOCKER_TAG) \
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
	@docker build --file $(QUERY_SERVICE_DIRECTORY)/Dockerfile \
	--no-cache -t $(REPONAME)/$(QUERY_SERVICE_DOCKER_IMAGE):$(DOCKER_TAG) \
	--build-arg TARGETPLATFORM="linux/amd64" --build-arg LD_FLAGS="$(LD_FLAGS)" .

# Step to build and push docker image of query in amd64 and arm64 (used in push pipeline)
build-push-query-service:
	@echo "------------------"
	@echo "--> Building and pushing query-service docker image"
	@echo "------------------"
	@docker buildx build --file $(QUERY_SERVICE_DIRECTORY)/Dockerfile --progress plane --no-cache \
	--push --platform linux/arm64,linux/amd64 --build-arg LD_FLAGS="$(LD_FLAGS)" \
	--tag $(REPONAME)/$(QUERY_SERVICE_DOCKER_IMAGE):$(DOCKER_TAG) .

# Step to build EE docker image of query service in amd64 (used in build pipeline)
build-ee-query-service-amd64:
	@echo "------------------"
	@echo "--> Building query-service docker image for amd64"
	@echo "------------------"
	@if [ $(DEV_BUILD) != "" ]; then \
		docker build --file $(EE_QUERY_SERVICE_DIRECTORY)/Dockerfile \
		--no-cache -t $(REPONAME)/$(QUERY_SERVICE_DOCKER_IMAGE):$(DOCKER_TAG) \
		--build-arg TARGETPLATFORM="linux/amd64" --build-arg LD_FLAGS="${LD_FLAGS} ${DEV_LD_FLAGS}" .; \
	else \
		docker build --file $(EE_QUERY_SERVICE_DIRECTORY)/Dockerfile \
		--no-cache -t $(REPONAME)/$(QUERY_SERVICE_DOCKER_IMAGE):$(DOCKER_TAG) \
		--build-arg TARGETPLATFORM="linux/amd64" --build-arg LD_FLAGS="$(LD_FLAGS)" .; \
	fi

# Step to build and push EE docker image of query in amd64 and arm64 (used in push pipeline)
build-push-ee-query-service:
	@echo "------------------"
	@echo "--> Building and pushing query-service docker image"
	@echo "------------------"
	@docker buildx build --file $(EE_QUERY_SERVICE_DIRECTORY)/Dockerfile \
	--progress plane --no-cache --push --platform linux/arm64,linux/amd64 \
	--build-arg LD_FLAGS="$(LD_FLAGS)" --tag $(REPONAME)/$(QUERY_SERVICE_DOCKER_IMAGE):$(DOCKER_TAG) .

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
	@docker-compose -f $(STANDALONE_DIRECTORY)/docker-compose.yaml up --build -d

down-x86:
	@docker-compose -f $(STANDALONE_DIRECTORY)/docker-compose.yaml down -v

clear-standalone-data:
	@docker run --rm -v "$(PWD)/$(STANDALONE_DIRECTORY)/data:/pwd" busybox \
	sh -c "cd /pwd && rm -rf alertmanager/* clickhous*/* signoz/* zookeeper-*/*"

clear-swarm-data:
	@docker run --rm -v "$(PWD)/$(SWARM_DIRECTORY)/data:/pwd" busybox \
	sh -c "cd /pwd && rm -rf alertmanager/* clickhous*/* signoz/* zookeeper-*/*"

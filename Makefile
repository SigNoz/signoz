#
# Reference Guide - https://www.gnu.org/software/make/manual/make.html
#

# Build variables
BUILD_VERSION   ?= $(shell git describe --always --tags)
BUILD_HASH      ?= $(shell git rev-parse --short HEAD)
BUILD_TIME      ?= $(shell date -u +"%Y-%m-%dT%H:%M:%SZ")
BUILD_BRANCH    ?= $(shell git rev-parse --abbrev-ref HEAD)
DEV_LICENSE_SIGNOZ_IO ?= https://staging-license.signoz.io/api/v1
ZEUS_URL ?= https://api.signoz.cloud
DEV_BUILD ?= "" # set to any non-empty value to enable dev build

# Internal variables or constants.
FRONTEND_DIRECTORY ?= frontend
QUERY_SERVICE_DIRECTORY ?= pkg/query-service
EE_QUERY_SERVICE_DIRECTORY ?= ee/query-service
STANDALONE_DIRECTORY ?= deploy/docker
SWARM_DIRECTORY ?= deploy/docker-swarm
CH_HISTOGRAM_QUANTILE_DIRECTORY ?= scripts/clickhouse/histogramquantile

GOOS ?= $(shell go env GOOS)
GOARCH ?= $(shell go env GOARCH)
GOPATH ?= $(shell go env GOPATH)

REPONAME ?= signoz
DOCKER_TAG ?= $(subst v,,$(BUILD_VERSION))
FRONTEND_DOCKER_IMAGE ?= frontend
QUERY_SERVICE_DOCKER_IMAGE ?= query-service

# Build-time Go variables
PACKAGE?=go.signoz.io/signoz
buildVersion=${PACKAGE}/pkg/query-service/version.buildVersion
buildHash=${PACKAGE}/pkg/query-service/version.buildHash
buildTime=${PACKAGE}/pkg/query-service/version.buildTime
gitBranch=${PACKAGE}/pkg/query-service/version.gitBranch
licenseSignozIo=${PACKAGE}/ee/query-service/constants.LicenseSignozIo
zeusURL=${PACKAGE}/ee/query-service/constants.ZeusURL

LD_FLAGS=-X ${buildHash}=${BUILD_HASH} -X ${buildTime}=${BUILD_TIME} -X ${buildVersion}=${BUILD_VERSION} -X ${gitBranch}=${BUILD_BRANCH} -X ${zeusURL}=${ZEUS_URL}
DEV_LD_FLAGS=-X ${licenseSignozIo}=${DEV_LICENSE_SIGNOZ_IO}

all: build-push-frontend build-push-query-service

# Steps to build static files of frontend
build-frontend-static:
	@echo "------------------"
	@echo "--> Building frontend static files"
	@echo "------------------"
	@cd $(FRONTEND_DIRECTORY) && \
	rm -rf build && \
	CI=1 yarn install && \
	yarn build && \
	ls -l build

# Steps to build and push docker image of frontend
.PHONY: build-frontend-amd64  build-push-frontend
# Step to build docker image of frontend in amd64 (used in build pipeline)
build-frontend-amd64: build-frontend-static
	@echo "------------------"
	@echo "--> Building frontend docker image for amd64"
	@echo "------------------"
	@cd $(FRONTEND_DIRECTORY) && \
	docker build --file Dockerfile -t $(REPONAME)/$(FRONTEND_DOCKER_IMAGE):$(DOCKER_TAG) \
	--build-arg TARGETPLATFORM="linux/amd64" .

# Step to build and push docker image of frontend(used in push pipeline)
build-push-frontend: build-frontend-static
	@echo "------------------"
	@echo "--> Building and pushing frontend docker image"
	@echo "------------------"
	@cd $(FRONTEND_DIRECTORY) && \
	docker buildx build --file Dockerfile --progress plain --push --platform linux/arm64,linux/amd64 \
	--tag $(REPONAME)/$(FRONTEND_DOCKER_IMAGE):$(DOCKER_TAG) .

# Steps to build static binary of query service
.PHONY: build-query-service-static
build-query-service-static:
	@echo "------------------"
	@echo "--> Building query-service static binary"
	@echo "------------------"
	@if [ $(DEV_BUILD) != "" ]; then \
		cd $(QUERY_SERVICE_DIRECTORY) && \
		CGO_ENABLED=1 go build -tags timetzdata -a -o ./bin/query-service-${GOOS}-${GOARCH} \
		-ldflags "-linkmode external -extldflags '-static' -s -w ${LD_FLAGS} ${DEV_LD_FLAGS}"; \
	else \
		cd $(QUERY_SERVICE_DIRECTORY) && \
		CGO_ENABLED=1 go build -tags timetzdata -a -o ./bin/query-service-${GOOS}-${GOARCH} \
		-ldflags "-linkmode external -extldflags '-static' -s -w ${LD_FLAGS}"; \
	fi

.PHONY: build-query-service-static-amd64
build-query-service-static-amd64:
	make GOARCH=amd64 build-query-service-static

.PHONY: build-query-service-static-arm64
build-query-service-static-arm64:
	make CC=aarch64-linux-gnu-gcc GOARCH=arm64 build-query-service-static

# Steps to build static binary of query service for all platforms
.PHONY: build-query-service-static-all
build-query-service-static-all: build-query-service-static-amd64 build-query-service-static-arm64 build-frontend-static

# Steps to build and push docker image of query service
.PHONY: build-query-service-amd64 build-push-query-service
# Step to build docker image of query service in amd64 (used in build pipeline)
build-query-service-amd64: build-query-service-static-amd64 build-frontend-static
	@echo "------------------"
	@echo "--> Building query-service docker image for amd64"
	@echo "------------------"
	@docker build --file $(QUERY_SERVICE_DIRECTORY)/Dockerfile \
	--tag $(REPONAME)/$(QUERY_SERVICE_DOCKER_IMAGE):$(DOCKER_TAG) \
	--build-arg TARGETPLATFORM="linux/amd64" .

# Step to build and push docker image of query in amd64 and arm64 (used in push pipeline)
build-push-query-service: build-query-service-static-all
	@echo "------------------"
	@echo "--> Building and pushing query-service docker image"
	@echo "------------------"
	@docker buildx build --file $(QUERY_SERVICE_DIRECTORY)/Dockerfile --progress plain \
	--push --platform linux/arm64,linux/amd64 \
	--tag $(REPONAME)/$(QUERY_SERVICE_DOCKER_IMAGE):$(DOCKER_TAG) .

# Step to build EE docker image of query service in amd64 (used in build pipeline)
build-ee-query-service-amd64:
	@echo "------------------"
	@echo "--> Building query-service docker image for amd64"
	@echo "------------------"
	make QUERY_SERVICE_DIRECTORY=${EE_QUERY_SERVICE_DIRECTORY} build-query-service-amd64

# Step to build and push EE docker image of query in amd64 and arm64 (used in push pipeline)
build-push-ee-query-service:
	@echo "------------------"
	@echo "--> Building and pushing query-service docker image"
	@echo "------------------"
	make QUERY_SERVICE_DIRECTORY=${EE_QUERY_SERVICE_DIRECTORY} build-push-query-service

dev-setup:
	mkdir -p /var/lib/signoz
	sqlite3 /var/lib/signoz/signoz.db "VACUUM";
	mkdir -p pkg/query-service/config/dashboards
	@echo "------------------"
	@echo "--> Local Setup completed"
	@echo "------------------"

pull-signoz:
	@docker-compose -f $(STANDALONE_DIRECTORY)/docker-compose.yaml pull

run-signoz:
	@docker-compose -f $(STANDALONE_DIRECTORY)/docker-compose.yaml up --build -d

run-testing:
	@docker-compose -f $(STANDALONE_DIRECTORY)/docker-compose.testing.yaml up --build -d

down-signoz:
	@docker-compose -f $(STANDALONE_DIRECTORY)/docker-compose.yaml down -v

clear-standalone-data:
	@docker run --rm -v "$(PWD)/$(STANDALONE_DIRECTORY)/data:/pwd" busybox \
	sh -c "cd /pwd && rm -rf alertmanager/* clickhouse*/* signoz/* zookeeper-*/*"

clear-swarm-data:
	@docker run --rm -v "$(PWD)/$(SWARM_DIRECTORY)/data:/pwd" busybox \
	sh -c "cd /pwd && rm -rf alertmanager/* clickhouse*/* signoz/* zookeeper-*/*"

clear-standalone-ch:
	@docker run --rm -v "$(PWD)/$(STANDALONE_DIRECTORY)/data:/pwd" busybox \
	sh -c "cd /pwd && rm -rf clickhouse*/* zookeeper-*/*"

clear-swarm-ch:
	@docker run --rm -v "$(PWD)/$(SWARM_DIRECTORY)/data:/pwd" busybox \
	sh -c "cd /pwd && rm -rf clickhouse*/* zookeeper-*/*"

check-no-ee-references:
	@echo "Checking for 'ee' package references in 'pkg' directory..."
	@if grep -R --include="*.go" '.*/ee/.*' pkg/; then \
		echo "Error: Found references to 'ee' packages in 'pkg' directory"; \
		exit 1; \
	else \
		echo "No references to 'ee' packages found in 'pkg' directory"; \
	fi

test:
	go test ./pkg/...

goreleaser-snapshot:
	@if [[ ${GORELEASER_WORKDIR} ]]; then \
		cd ${GORELEASER_WORKDIR} && \
		goreleaser release --clean --snapshot; \
		cd -; \
	else \
		goreleaser release --clean --snapshot; \
	fi

goreleaser-snapshot-histogram-quantile:
	make GORELEASER_WORKDIR=$(CH_HISTOGRAM_QUANTILE_DIRECTORY) goreleaser-snapshot

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
GORELEASER_BIN ?= goreleaser

GOOS ?= $(shell go env GOOS)
GOARCH ?= $(shell go env GOARCH)
GOPATH ?= $(shell go env GOPATH)

REPONAME ?= coolboi567
DOCKER_TAG ?= $(subst v,,$(BUILD_VERSION))
SIGNOZ_DOCKER_IMAGE ?= signoz
SIGNOZ_COMMUNITY_DOCKER_IMAGE ?= signoz-community

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

all: build-push-frontend build-push-signoz

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

# Steps to build static binary of signoz
.PHONY: build-signoz-static
build-signoz-static:
	@echo "------------------"
	@echo "--> Building signoz static binary"
	@echo "------------------"
	@if [ $(DEV_BUILD) != "" ]; then \
		cd $(EE_QUERY_SERVICE_DIRECTORY) && \
		CGO_ENABLED=1 go build -tags timetzdata -a -o ./bin/signoz-${GOOS}-${GOARCH} \
		-ldflags "-linkmode external -extldflags '-static' -s -w ${LD_FLAGS} ${DEV_LD_FLAGS}"; \
	else \
		cd $(EE_QUERY_SERVICE_DIRECTORY) && \
		CGO_ENABLED=1 go build -tags timetzdata -a -o ./bin/signoz-${GOOS}-${GOARCH} \
		-ldflags "-linkmode external -extldflags '-static' -s -w ${LD_FLAGS}"; \
	fi

.PHONY: build-signoz-static-amd64
build-signoz-static-amd64:
	make GOARCH=amd64 build-signoz-static

.PHONY: build-signoz-static-arm64
build-signoz-static-arm64:
	make CC=aarch64-linux-gnu-gcc GOARCH=arm64 build-signoz-static

# Steps to build static binary of signoz for all platforms
.PHONY: build-signoz-static-all
build-signoz-static-all: build-signoz-static-amd64 build-signoz-static-arm64 build-frontend-static

# Steps to build and push docker image of signoz
.PHONY: build-signoz-amd64 build-push-signoz
# Step to build docker image of signoz in amd64 (used in build pipeline)
build-signoz-amd64: build-signoz-static-amd64 build-frontend-static
	@echo "------------------"
	@echo "--> Building signoz docker image for amd64"
	@echo "------------------"
	@docker build --file $(EE_QUERY_SERVICE_DIRECTORY)/Dockerfile \
	--tag $(REPONAME)/$(SIGNOZ_DOCKER_IMAGE):$(DOCKER_TAG) \
	--build-arg TARGETPLATFORM="linux/amd64" .

# Step to build and push docker image of query in amd64 and arm64 (used in push pipeline)
build-push-signoz: build-signoz-static-all
	@echo "------------------"
	@echo "--> Building and pushing signoz docker image"
	@echo "------------------"
	@docker buildx build --file $(EE_QUERY_SERVICE_DIRECTORY)/Dockerfile --progress plain \
	--push --platform linux/arm64,linux/amd64 \
	--tag $(REPONAME)/$(SIGNOZ_DOCKER_IMAGE):$(DOCKER_TAG) .

# Step to build docker image of signoz community in amd64 (used in build pipeline)
build-signoz-community-amd64:
	@echo "------------------"
	@echo "--> Building signoz docker image for amd64"
	@echo "------------------"
	make EE_QUERY_SERVICE_DIRECTORY=${QUERY_SERVICE_DIRECTORY} SIGNOZ_DOCKER_IMAGE=${SIGNOZ_COMMUNITY_DOCKER_IMAGE} build-signoz-amd64

# Step to build and push docker image of signoz community in amd64 and arm64 (used in push pipeline)
build-push-signoz-community:
	@echo "------------------"
	@echo "--> Building and pushing signoz community docker image"
	@echo "------------------"
	make EE_QUERY_SERVICE_DIRECTORY=${QUERY_SERVICE_DIRECTORY} SIGNOZ_DOCKER_IMAGE=${SIGNOZ_COMMUNITY_DOCKER_IMAGE} build-push-signoz

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

########################################################
# Goreleaser
########################################################
.PHONY: goreleaser-snapshot goreleaser-snapshot-histogram-quantile goreleaser-snapshot-signoz goreleaser-snapshot-signoz-community

goreleaser-snapshot:
	@if [[ ${GORELEASER_WORKDIR} ]]; then \
		cd ${GORELEASER_WORKDIR} && \
		${GORELEASER_BIN} release --clean --snapshot; \
		cd -; \
	else \
		${GORELEASER_BIN} release --clean --snapshot; \
	fi

goreleaser-snapshot-histogram-quantile:
	make GORELEASER_WORKDIR=$(CH_HISTOGRAM_QUANTILE_DIRECTORY) goreleaser-snapshot

goreleaser-snapshot-signoz: build-frontend-static
	make GORELEASER_WORKDIR=$(EE_QUERY_SERVICE_DIRECTORY) goreleaser-snapshot

goreleaser-snapshot-signoz-community: build-frontend-static
	make GORELEASER_WORKDIR=$(QUERY_SERVICE_DIRECTORY) goreleaser-snapshot

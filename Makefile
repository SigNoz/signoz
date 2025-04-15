##############################################################
# variables
##############################################################
SHELL                   := /bin/bash
SRC						?= $(shell pwd)
NAME					?= signoz
OS                      ?= $(shell uname -s | tr '[A-Z]' '[a-z]')
ARCH                    ?= $(shell uname -m | sed 's/x86_64/amd64/g' | sed 's/aarch64/arm64/g')
COMMIT_SHORT_SHA        ?= $(shell git rev-parse --short HEAD)
BRANCH_NAME             ?= $(subst /,-,$(shell git rev-parse --abbrev-ref HEAD))
VERSION                 ?= $(BRANCH_NAME)-$(COMMIT_SHORT_SHA)
TIMESTAMP               ?= $(shell date -u +"%Y-%m-%dT%H:%M:%SZ")
ARCHS					?= amd64 arm64
TARGET_DIR              ?= $(shell pwd)/target

ZEUS_URL					   		?= https://api.signoz.cloud
GO_BUILD_LDFLAG_ZEUS_URL 			= -X github.com/SigNoz/signoz/ee/query-service/constants.ZeusURL=$(ZEUS_URL)
LICENSE_URL 						?= https://license.signoz.io/api/v1
GO_BUILD_LDFLAG_LICENSE_SIGNOZ_IO 	= -X github.com/SigNoz/signoz/ee/query-service/constants.LicenseSignozIo=$(LICENSE_URL)

GO_BUILD_VERSION_LDFLAGS 		= -X github.com/SigNoz/signoz/pkg/version.version=$(VERSION) -X github.com/SigNoz/signoz/pkg/version.hash=$(COMMIT_SHORT_SHA) -X github.com/SigNoz/signoz/pkg/version.time=$(TIMESTAMP) -X github.com/SigNoz/signoz/pkg/version.branch=$(BRANCH_NAME)
GO_BUILD_ARCHS_COMMUNITY 		= $(addprefix go-build-community-,$(ARCHS))
GO_BUILD_CONTEXT_COMMUNITY 		= $(SRC)/pkg/query-service
GO_BUILD_LDFLAGS_COMMUNITY 		= $(GO_BUILD_VERSION_LDFLAGS) -X github.com/SigNoz/signoz/pkg/version.variant=community
GO_BUILD_ARCHS_ENTERPRISE 		= $(addprefix go-build-enterprise-,$(ARCHS))
GO_BUILD_ARCHS_ENTERPRISE_RACE  = $(addprefix go-build-enterprise-race-,$(ARCHS))
GO_BUILD_CONTEXT_ENTERPRISE 	= $(SRC)/ee/query-service
GO_BUILD_LDFLAGS_ENTERPRISE 	= $(GO_BUILD_VERSION_LDFLAGS) -X github.com/SigNoz/signoz/pkg/version.variant=enterprise $(GO_BUILD_LDFLAG_ZEUS_URL) $(GO_BUILD_LDFLAG_LICENSE_SIGNOZ_IO)

DOCKER_BUILD_ARCHS_COMMUNITY 	= $(addprefix docker-build-community-,$(ARCHS))
DOCKERFILE_COMMUNITY 			= $(SRC)/pkg/query-service/Dockerfile
DOCKER_REGISTRY_COMMUNITY 		?= docker.io/signoz/signoz-community
DOCKER_BUILD_ARCHS_ENTERPRISE 	= $(addprefix docker-build-enterprise-,$(ARCHS))
DOCKERFILE_ENTERPRISE 			= $(SRC)/ee/query-service/Dockerfile
DOCKER_REGISTRY_ENTERPRISE 		?= docker.io/signoz/signoz
JS_BUILD_CONTEXT 				= $(SRC)/frontend

##############################################################
# directories
##############################################################
$(TARGET_DIR):
	mkdir -p $(TARGET_DIR)

##############################################################
# common commands
##############################################################
.PHONY: help
help: ## Displays help.
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n\nTargets:\n"} /^[a-z0-9A-Z_-]+:.*?##/ { printf "  \033[36m%-40s\033[0m %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

##############################################################
# devenv commands
##############################################################
.PHONY: devenv-clickhouse
devenv-clickhouse: ## Run clickhouse in devenv
	@cd .devenv/docker/clickhouse; \
	docker compose -f compose.yaml up -d

##############################################################
# go commands
##############################################################
.PHONY: go-run-enterprise
go-run-enterprise: ## Runs the enterprise go backend server
	@SIGNOZ_INSTRUMENTATION_LOGS_LEVEL=debug \
	SIGNOZ_SQLSTORE_SQLITE_PATH=signoz.db \
	SIGNOZ_WEB_ENABLED=false \
	SIGNOZ_JWT_SECRET=secret \
	SIGNOZ_ALERTMANAGER_PROVIDER=signoz \
	SIGNOZ_TELEMETRYSTORE_PROVIDER=clickhouse \
	SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_DSN=tcp://127.0.0.1:9000 \
	go run -race \
		$(GO_BUILD_CONTEXT_ENTERPRISE)/main.go \
		--config ./conf/prometheus.yml \
		--cluster cluster \
		--use-logs-new-schema true \
		--use-trace-new-schema true

.PHONY: go-test
go-test: ## Runs go unit tests
	@go test -race ./...

.PHONY: go-run-community
go-run-community: ## Runs the community go backend server
	@SIGNOZ_INSTRUMENTATION_LOGS_LEVEL=debug \
	SIGNOZ_SQLSTORE_SQLITE_PATH=signoz.db \
	SIGNOZ_WEB_ENABLED=false \
	SIGNOZ_JWT_SECRET=secret \
	SIGNOZ_ALERTMANAGER_PROVIDER=signoz \
	SIGNOZ_TELEMETRYSTORE_PROVIDER=clickhouse \
	SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_DSN=tcp://127.0.0.1:9000 \
	go run -race \
		$(GO_BUILD_CONTEXT_COMMUNITY)/main.go \
		--config ./conf/prometheus.yml \
		--cluster cluster \
		--use-logs-new-schema true \
		--use-trace-new-schema true

.PHONY: go-build-community $(GO_BUILD_ARCHS_COMMUNITY)
go-build-community: ## Builds the go backend server for community
go-build-community: $(GO_BUILD_ARCHS_COMMUNITY)
$(GO_BUILD_ARCHS_COMMUNITY): go-build-community-%: $(TARGET_DIR)
	@mkdir -p $(TARGET_DIR)/$(OS)-$*
	@echo ">> building binary $(TARGET_DIR)/$(OS)-$*/$(NAME)-community"
	@if [ $* = "arm64" ]; then \
		CC=aarch64-linux-gnu-gcc CGO_ENABLED=1 GOARCH=$* GOOS=$(OS) go build -C $(GO_BUILD_CONTEXT_COMMUNITY) -tags timetzdata -o $(TARGET_DIR)/$(OS)-$*/$(NAME)-community -ldflags "-linkmode external -extldflags '-static' -s -w $(GO_BUILD_LDFLAGS_COMMUNITY)"; \
	else \
		CGO_ENABLED=1 GOARCH=$* GOOS=$(OS) go build -C $(GO_BUILD_CONTEXT_COMMUNITY) -tags timetzdata -o $(TARGET_DIR)/$(OS)-$*/$(NAME)-community -ldflags "-linkmode external -extldflags '-static' -s -w $(GO_BUILD_LDFLAGS_COMMUNITY)"; \
	fi


.PHONY: go-build-enterprise $(GO_BUILD_ARCHS_ENTERPRISE)
go-build-enterprise: ## Builds the go backend server for enterprise
go-build-enterprise: $(GO_BUILD_ARCHS_ENTERPRISE)
$(GO_BUILD_ARCHS_ENTERPRISE): go-build-enterprise-%: $(TARGET_DIR)
	@mkdir -p $(TARGET_DIR)/$(OS)-$*
	@echo ">> building binary $(TARGET_DIR)/$(OS)-$*/$(NAME)"
	@if [ $* = "arm64" ]; then \
		CC=aarch64-linux-gnu-gcc CGO_ENABLED=1 GOARCH=$* GOOS=$(OS) go build -C $(GO_BUILD_CONTEXT_ENTERPRISE) -tags timetzdata -o $(TARGET_DIR)/$(OS)-$*/$(NAME) -ldflags "-linkmode external -extldflags '-static' -s -w $(GO_BUILD_LDFLAGS_ENTERPRISE)"; \
	else \
		CGO_ENABLED=1 GOARCH=$* GOOS=$(OS) go build -C $(GO_BUILD_CONTEXT_ENTERPRISE) -tags timetzdata -o $(TARGET_DIR)/$(OS)-$*/$(NAME) -ldflags "-linkmode external -extldflags '-static' -s -w $(GO_BUILD_LDFLAGS_ENTERPRISE)"; \
	fi

.PHONY: go-build-enterprise-race $(GO_BUILD_ARCHS_ENTERPRISE_RACE)
go-build-enterprise-race: ## Builds the go backend server for enterprise with race
go-build-enterprise-race: $(GO_BUILD_ARCHS_ENTERPRISE_RACE)
$(GO_BUILD_ARCHS_ENTERPRISE_RACE): go-build-enterprise-race-%: $(TARGET_DIR)
	@mkdir -p $(TARGET_DIR)/$(OS)-$*
	@echo ">> building binary $(TARGET_DIR)/$(OS)-$*/$(NAME)"
	@if [ $* = "arm64" ]; then \
		CC=aarch64-linux-gnu-gcc CGO_ENABLED=1 GOARCH=$* GOOS=$(OS) go build -C $(GO_BUILD_CONTEXT_ENTERPRISE) -race -tags timetzdata -o $(TARGET_DIR)/$(OS)-$*/$(NAME) -ldflags "-linkmode external -extldflags '-static' -s -w $(GO_BUILD_LDFLAGS_ENTERPRISE)"; \
	else \
		CGO_ENABLED=1 GOARCH=$* GOOS=$(OS) go build -C $(GO_BUILD_CONTEXT_ENTERPRISE) -race -tags timetzdata -o $(TARGET_DIR)/$(OS)-$*/$(NAME) -ldflags "-linkmode external -extldflags '-static' -s -w $(GO_BUILD_LDFLAGS_ENTERPRISE)"; \
	fi

##############################################################
# js commands
##############################################################
.PHONY: js-build
js-build: ## Builds the js frontend
	@echo ">> building js frontend"
	@cd $(JS_BUILD_CONTEXT) && CI=1 yarn install && yarn build

##############################################################
# docker commands
##############################################################
.PHONY: docker-build-community $(DOCKER_BUILD_ARCHS_COMMUNITY)
docker-build-community: ## Builds the docker image for community
docker-build-community: $(DOCKER_BUILD_ARCHS_COMMUNITY)
$(DOCKER_BUILD_ARCHS_COMMUNITY): docker-build-community-%: go-build-community-% js-build
	@echo ">> building docker image for $(NAME)-community"
	@docker build -t "$(DOCKER_REGISTRY_COMMUNITY):$(VERSION)-$*" \
		--build-arg TARGETARCH="$*" \
		-f $(DOCKERFILE_COMMUNITY) $(SRC)

.PHONY: docker-buildx-community
docker-buildx-community: ## Builds the docker image for community using buildx
docker-buildx-community: go-build-community js-build
	@echo ">> building docker image for $(NAME)-community"
	@docker buildx build --file $(DOCKERFILE_COMMUNITY) \
		--progress plain \
		--platform linux/arm64,linux/amd64 \
		--push \
		--tag $(DOCKER_REGISTRY_COMMUNITY):$(VERSION) $(SRC)

.PHONY: docker-build-enterprise $(DOCKER_BUILD_ARCHS_ENTERPRISE)
docker-build-enterprise: ## Builds the docker image for enterprise
docker-build-enterprise: $(DOCKER_BUILD_ARCHS_ENTERPRISE)
$(DOCKER_BUILD_ARCHS_ENTERPRISE): docker-build-enterprise-%: go-build-enterprise-% js-build
	@echo ">> building docker image for $(NAME)"
	@docker build -t "$(DOCKER_REGISTRY_ENTERPRISE):$(VERSION)-$*" \
		--build-arg TARGETARCH="$*" \
		-f $(DOCKERFILE_ENTERPRISE) $(SRC)

.PHONY: docker-buildx-enterprise
docker-buildx-enterprise: ## Builds the docker image for enterprise using buildx
docker-buildx-enterprise: go-build-enterprise js-build
	@echo ">> building docker image for $(NAME)"
	@docker buildx build --file $(DOCKERFILE_ENTERPRISE) \
		--progress plain \
		--platform linux/arm64,linux/amd64 \
		--push \
		--tag $(DOCKER_REGISTRY_ENTERPRISE):$(VERSION) $(SRC)

##############################################################
# python commands
##############################################################
.PHONY: py-fmt
py-fmt: ## Run black for integration tests
	@cd tests/integration && poetry run black .

.PHONY: py-lint
py-lint: ## Run lint for integration tests
	@cd tests/integration && poetry run isort .
	@cd tests/integration && poetry run autoflake .
	@cd tests/integration && poetry run pylint .

.PHONY: py-test
py-test: ## Runs integration tests
	@cd tests/integration && poetry run pytest --basetemp=./tmp/ -vv --capture=no src/
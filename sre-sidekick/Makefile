.PHONY: fmt test run run-log-demo watch-logs

fmt:
	gofmt -w cmd internal

test:
	go test ./...

run:
	go run ./cmd/reliability-agent

run-log-demo:
	go run ./cmd/log-demo-backend

watch-logs:
	go run ./cmd/reliability-agent audit-watch --profile examples/log-demo-backend.yaml

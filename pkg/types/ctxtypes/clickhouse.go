package ctxtypes

import "context"

type ctxKey string

const (
	ClickhouseContextMaxThreadsKey ctxKey = "clickhouse_max_threads"
	ClickhouseContextReadOnlyKey   ctxKey = "clickhouse_readonly"
)

// SetClickhouseMaxThreads stores the max threads value in context.
func SetClickhouseMaxThreads(ctx context.Context, maxThreads int) context.Context {
	return context.WithValue(ctx, ClickhouseContextMaxThreadsKey, maxThreads)
}

// SetClickhouseReadOnly marks the context so the statement runs under a read-only
// ClickHouse session. The telemetry store connection is shared with write paths, so
// those must never set this.
func SetClickhouseReadOnly(ctx context.Context) context.Context {
	return context.WithValue(ctx, ClickhouseContextReadOnlyKey, true)
}

package ctxtypes

import "context"

type ctxKey string

const (
	ClickhouseContextMaxThreadsKey ctxKey = "clickhouse_max_threads"
	clickhouseContextReadOnlyKey   ctxKey = "clickhouse_read_only"
)

// SetClickhouseMaxThreads stores the max threads value in context.
func SetClickhouseMaxThreads(ctx context.Context, maxThreads int) context.Context {
	return context.WithValue(ctx, ClickhouseContextMaxThreadsKey, maxThreads)
}

// SetClickhouseReadOnly marks queries that must be executed in ClickHouse read-only mode.
func SetClickhouseReadOnly(ctx context.Context) context.Context {
	return context.WithValue(ctx, clickhouseContextReadOnlyKey, true)
}

// IsClickhouseReadOnly reports whether the query must be executed in ClickHouse read-only mode.
func IsClickhouseReadOnly(ctx context.Context) bool {
	readOnly, ok := ctx.Value(clickhouseContextReadOnlyKey).(bool)
	return ok && readOnly
}

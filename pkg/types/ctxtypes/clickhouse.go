package ctxtypes

import "context"

type ctxKey string

const (
	ClickhouseContextMaxThreadsKey ctxKey = "clickhouse_max_threads"
)

// SetClickhouseMaxThreads stores the max threads value in context.
func SetClickhouseMaxThreads(ctx context.Context, maxThreads int) context.Context {
	return context.WithValue(ctx, ClickhouseContextMaxThreadsKey, maxThreads)
}

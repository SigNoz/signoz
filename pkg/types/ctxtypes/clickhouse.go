package ctxtypes

import "context"

type ctxKey string

const (
	ClickhouseContextMaxThreadsKey     ctxKey = "clickhouse_max_threads"
	ClickhouseContextReadJSONNativeKey ctxKey = "clickhouse_read_json_native"
)

// SetClickhouseMaxThreads stores the max threads value in context.
func SetClickhouseMaxThreads(ctx context.Context, maxThreads int) context.Context {
	return context.WithValue(ctx, ClickhouseContextMaxThreadsKey, maxThreads)
}

// SetClickhouseReadJSONNative marks the query to read JSON columns as native documents
// (output_format_native_write_json_as_string=0) instead of collapsed strings.
func SetClickhouseReadJSONNative(ctx context.Context) context.Context {
	return context.WithValue(ctx, ClickhouseContextReadJSONNativeKey, true)
}

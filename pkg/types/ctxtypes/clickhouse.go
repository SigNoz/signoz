package ctxtypes

import "context"

type ctxKey string

const (
	ClickhouseContextMaxThreadsKey ctxKey = "clickhouse_max_threads"
	ClickhouseContextSettingsKey   ctxKey = "clickhouse_settings"
)

// SetClickhouseMaxThreads stores the max threads value in context.
func SetClickhouseMaxThreads(ctx context.Context, maxThreads int) context.Context {
	return context.WithValue(ctx, ClickhouseContextMaxThreadsKey, maxThreads)
}

// SetClickhouseSettings stores query settings in context that are applied on
// top of the configured defaults for the queries run with it.
func SetClickhouseSettings(ctx context.Context, settings map[string]any) context.Context {
	return context.WithValue(ctx, ClickhouseContextSettingsKey, settings)
}

// ClickhouseSettingsFromContext returns the query settings stored with
// SetClickhouseSettings, or nil.
func ClickhouseSettingsFromContext(ctx context.Context) map[string]any {
	settings, _ := ctx.Value(ClickhouseContextSettingsKey).(map[string]any)
	return settings
}

package telemetrystore

import (
	"context"
	"maps"

	"github.com/ClickHouse/clickhouse-go/v2"
)

type querySettingsKey struct{}

// NewContextWithQuerySettings attaches ClickHouse settings for the queries run with ctx.
// The settings hook applies them over its defaults, so they win on a clash.
func NewContextWithQuerySettings(ctx context.Context, settings clickhouse.Settings) context.Context {
	merged := clickhouse.Settings{}
	maps.Copy(merged, QuerySettingsFromContext(ctx))
	maps.Copy(merged, settings)
	return context.WithValue(ctx, querySettingsKey{}, merged)
}

// QuerySettingsFromContext returns the settings attached with NewContextWithQuerySettings, or nil.
func QuerySettingsFromContext(ctx context.Context) clickhouse.Settings {
	settings, _ := ctx.Value(querySettingsKey{}).(clickhouse.Settings)
	return settings
}

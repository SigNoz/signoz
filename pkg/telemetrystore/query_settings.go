package telemetrystore

import (
	"context"
	"maps"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"

	"github.com/SigNoz/signoz/pkg/errors"
)

// ErrQueryTimeoutExceeded is the cause of a deadline set by NewContextWithQueryTimeout.
var ErrQueryTimeoutExceeded = errors.New(errors.TypeTimeout, errors.MustNewCode("query_timeout_exceeded"), "query timeout exceeded")

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

// NewContextWithQueryTimeout bounds the queries run with ctx. clickhouse-go replaces max_execution_time with the
// context deadline, so the deadline is what enforces a query timeout. Its cause tells it apart from the caller's own
// deadline.
func NewContextWithQueryTimeout(ctx context.Context, timeout time.Duration) (context.Context, context.CancelFunc) {
	return context.WithTimeoutCause(ctx, timeout, ErrQueryTimeoutExceeded)
}

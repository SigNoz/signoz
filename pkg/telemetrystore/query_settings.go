package telemetrystore

import (
	"context"
	"fmt"
	"maps"
	"time"

	chproto "github.com/ClickHouse/ch-go/proto"
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

// NewContextWithQueryTimeout bounds the queries run with ctx. clickhouse-go replaces max_execution_time with the
// context deadline, so the deadline is what enforces a query timeout. Its cause is the exception ClickHouse raises
// for max_execution_time.
//
// TODO: this is a workaround for https://github.com/ClickHouse/clickhouse-go/issues/2100. Once it is fixed, send
// max_execution_time as a query setting and drop this deadline.
func NewContextWithQueryTimeout(ctx context.Context, timeout time.Duration) (context.Context, context.CancelFunc) {
	return context.WithTimeoutCause(ctx, timeout, &clickhouse.Exception{
		Code:    int32(chproto.ErrTimeoutExceeded),
		Name:    "TIMEOUT_EXCEEDED",
		Message: fmt.Sprintf("Timeout exceeded: maximum: %s", timeout),
	})
}

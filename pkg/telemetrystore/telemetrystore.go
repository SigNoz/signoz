package telemetrystore

import (
	"context"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
)

type TelemetryStore interface {
	ClickHouseDB() clickhouse.Conn
}

type TelemetryStoreHook interface {
	BeforeQuery(ctx context.Context, query string, args ...interface{}) (context.Context, string, []interface{})
	AfterQuery(ctx context.Context, query string, args []interface{}, rows driver.Rows, err error)
}

func WrapBeforeQuery(hooks []TelemetryStoreHook, ctx context.Context, query string, args ...interface{}) (context.Context, string, []interface{}) {
	for _, hook := range hooks {
		ctx, query, args = hook.BeforeQuery(ctx, query, args...)
	}
	return ctx, query, args
}

// runAfterHooks executes all after hooks in order
func WrapAfterQuery(hooks []TelemetryStoreHook, ctx context.Context, query string, args []interface{}, rows driver.Rows, err error) {
	for _, hook := range hooks {
		hook.AfterQuery(ctx, query, args, rows, err)
	}
}

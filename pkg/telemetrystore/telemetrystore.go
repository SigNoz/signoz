package telemetrystore

import (
	"context"

	"github.com/ClickHouse/clickhouse-go/v2"
)

type TelemetryStore interface {
	ClickhouseDB() clickhouse.Conn
}

type TelemetryStoreHook interface {
	BeforeQuery(ctx context.Context, event *QueryEvent) context.Context
	AfterQuery(ctx context.Context, event *QueryEvent)
}

func WrapBeforeQuery(hooks []TelemetryStoreHook, ctx context.Context, event *QueryEvent) context.Context {
	for _, hook := range hooks {
		ctx = hook.BeforeQuery(ctx, event)
	}
	return ctx
}

func WrapAfterQuery(hooks []TelemetryStoreHook, ctx context.Context, event *QueryEvent) {
	for i := len(hooks) - 1; i >= 0; i-- {
		hooks[i].AfterQuery(ctx, event)
	}
}

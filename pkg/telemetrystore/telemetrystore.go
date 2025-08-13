package telemetrystore

import (
	"context"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/SigNoz/signoz/pkg/factory"
)

type TelemetryStore interface {
	// ClickhouseDB returns the clickhouse database connection.
	ClickhouseDB() clickhouse.Conn

	// Cluster returns the cluster name.
	Cluster() string
}

type TelemetryStoreHook interface {
	BeforeQuery(ctx context.Context, event *QueryEvent) context.Context
	AfterQuery(ctx context.Context, event *QueryEvent)
}

type TelemetryStoreHookFactoryFunc func(string) factory.ProviderFactory[TelemetryStoreHook, Config]

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

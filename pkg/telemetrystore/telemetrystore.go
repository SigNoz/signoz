package telemetrystore

import (
	"context"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/SigNoz/signoz/pkg/types/telemetrystoretypes"
)

type TelemetryStore interface {
	// ClickhouseDB returns the clickhouse connection, which can also EXPLAIN.
	ClickhouseDB() clickhouse.Conn

	// Cluster returns the cluster name.
	Cluster() string

	// Estimate returns the per-table scan estimate from EXPLAIN ESTIMATE.
	Estimate(ctx context.Context, stmt string, args ...any) ([]telemetrystoretypes.EstimateEntry, error)

	// Plan runs EXPLAIN PLAN to check stmt parses and binds.
	Plan(ctx context.Context, stmt string, args ...any) error

	// Indexes returns the granule-skip breakdown from EXPLAIN json = 1, indexes = 1.
	Indexes(ctx context.Context, stmt string, args ...any) (telemetrystoretypes.Granules, bool, error)
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

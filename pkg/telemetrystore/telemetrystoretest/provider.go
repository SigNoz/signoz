package telemetrystoretest

import (
	"context"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/DATA-DOG/go-sqlmock"
	cmock "github.com/SigNoz/clickhouse-go-mock"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/telemetrystore/clickhousetelemetrystore"
	"github.com/SigNoz/signoz/pkg/types/telemetrystoretypes"
)

var _ telemetrystore.TelemetryStore = (*Provider)(nil)

// Provider represents a mock telemetry store provider for testing.
type Provider struct {
	clickhouseDB cmock.ClickConnMockCommon
}

// New creates a new mock telemetry store provider.
func New(_ telemetrystore.Config, matcher sqlmock.QueryMatcher) *Provider {
	clickhouseDB, err := cmock.NewClickHouseWithQueryMatcher(&clickhouse.Options{}, matcher)
	if err != nil {
		panic(err)
	}

	return &Provider{
		clickhouseDB: clickhouseDB,
	}
}

// ClickhouseDB returns the mock Clickhouse connection.
func (p *Provider) ClickhouseDB() clickhouse.Conn {
	return p.clickhouseDB.(clickhouse.Conn)
}

// Cluster returns the cluster name.
func (p *Provider) Cluster() string {
	return "cluster"
}

// Estimate runs EXPLAIN ESTIMATE against the mock connection.
func (p *Provider) Estimate(ctx context.Context, stmt string, args ...any) ([]telemetrystoretypes.EstimateEntry, error) {
	return clickhousetelemetrystore.RunExplainEstimate(ctx, p.clickhouseDB.(clickhouse.Conn), stmt, args...)
}

// Plan runs EXPLAIN PLAN against the mock connection.
func (p *Provider) Plan(ctx context.Context, stmt string, args ...any) error {
	return clickhousetelemetrystore.RunExplainPlan(ctx, p.clickhouseDB.(clickhouse.Conn), stmt, args...)
}

// Indexes runs EXPLAIN indexes against the mock connection.
func (p *Provider) Indexes(ctx context.Context, stmt string, args ...any) (telemetrystoretypes.Granules, bool, error) {
	return clickhousetelemetrystore.RunExplainIndexes(ctx, p.clickhouseDB.(clickhouse.Conn), stmt, args...)
}

// Mock returns the underlying Clickhouse mock instance for setting expectations.
func (p *Provider) Mock() cmock.ClickConnMockCommon {
	return p.clickhouseDB
}

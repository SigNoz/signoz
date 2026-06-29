package telemetrystoretest

import (
	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/DATA-DOG/go-sqlmock"
	cmock "github.com/SigNoz/clickhouse-go-mock"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
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

// ClickhouseDB returns the mock Clickhouse connection, enriched with Explain.
func (p *Provider) ClickhouseDB() telemetrystore.ClickhouseConn {
	return telemetrystore.NewClickhouseConn(p.clickhouseDB.(clickhouse.Conn))
}

// Cluster returns the cluster name.
func (p *Provider) Cluster() string {
	return "cluster"
}

// Mock returns the underlying Clickhouse mock instance for setting expectations.
func (p *Provider) Mock() cmock.ClickConnMockCommon {
	return p.clickhouseDB
}

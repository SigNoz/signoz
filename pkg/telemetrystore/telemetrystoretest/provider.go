package telemetrystoretest

import (
	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/DATA-DOG/go-sqlmock"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	cmock "github.com/srikanthccv/ClickHouse-go-mock"
)

var _ telemetrystore.TelemetryStore = (*Provider)(nil)

// Provider represents a mock telemetry store provider for testing
type Provider struct {
	clickhouseDB cmock.ClickConnMockCommon
}

// New creates a new mock telemetry store provider
func New(_ telemetrystore.Config, matcher sqlmock.QueryMatcher) *Provider {
	clickhouseDB, err := cmock.NewClickHouseWithQueryMatcher(&clickhouse.Options{}, matcher)
	if err != nil {
		panic(err)
	}

	return &Provider{
		clickhouseDB: clickhouseDB,
	}
}

// ClickhouseDB returns the mock Clickhouse connection
func (p *Provider) ClickhouseDB() clickhouse.Conn {
	return p.clickhouseDB.(clickhouse.Conn)
}

// Cluster returns the cluster name
func (p *Provider) Cluster() string {
	return "cluster"
}

// Mock returns the underlying Clickhouse mock instance for setting expectations
func (p *Provider) Mock() cmock.ClickConnMockCommon {
	return p.clickhouseDB
}

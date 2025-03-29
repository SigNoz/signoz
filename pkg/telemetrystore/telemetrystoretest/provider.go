package telemetrystoretest

import (
	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/DATA-DOG/go-sqlmock"
	"github.com/SigNoz/signoz/pkg/promengine"
	"github.com/SigNoz/signoz/pkg/promengine/promenginetest"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	cmock "github.com/srikanthccv/ClickHouse-go-mock"
)

var _ telemetrystore.TelemetryStore = (*Provider)(nil)

// Provider represents a mock telemetry store provider for testing
type Provider struct {
	clickhouseDB cmock.ClickConnMockCommon
	engine       promengine.PromEngine
}

// New creates a new mock telemetry store provider
func New(matcher sqlmock.QueryMatcher) (*Provider, error) {
	clickhouseDB, err := cmock.NewClickHouseWithQueryMatcher(&clickhouse.Options{}, matcher)
	if err != nil {
		return nil, err
	}

	engine, err := promenginetest.New()
	if err != nil {
		return nil, err
	}

	return &Provider{
		clickhouseDB: clickhouseDB,
		engine:       engine,
	}, nil
}

func (p *Provider) PrometheusEngine() promengine.PromEngine {
	return p.engine
}

// ClickhouseDB returns the mock Clickhouse connection
func (p *Provider) ClickhouseDB() clickhouse.Conn {
	return p.clickhouseDB.(clickhouse.Conn)
}

// Mock returns the underlying Clickhouse mock instance for setting expectations
func (p *Provider) Mock() cmock.ClickConnMockCommon {
	return p.clickhouseDB
}

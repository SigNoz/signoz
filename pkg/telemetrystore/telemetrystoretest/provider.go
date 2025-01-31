package telemetrystoretest

import (
	"github.com/ClickHouse/clickhouse-go/v2"
	cmock "github.com/srikanthccv/ClickHouse-go-mock"
)

// Provider represents a mock telemetry store provider for testing
type Provider struct {
	mock cmock.ClickConnMockCommon
}

// New creates a new mock telemetry store provider
func New() (*Provider, error) {
	options := &clickhouse.Options{} // Default options
	mock, err := cmock.NewClickHouseNative(options)
	if err != nil {
		return nil, err
	}

	return &Provider{
		mock: mock,
	}, nil
}

// Clickhouse returns the mock Clickhouse connection
func (p *Provider) Clickhouse() clickhouse.Conn {
	return p.mock.(clickhouse.Conn)
}

// Mock returns the underlying Clickhouse mock instance for setting expectations
func (p *Provider) Mock() cmock.ClickConnMockCommon {
	return p.mock
}

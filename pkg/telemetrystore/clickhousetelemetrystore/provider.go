package clickhousetelemetrystore

import (
	"context"

	"github.com/ClickHouse/clickhouse-go/v2"
	"go.signoz.io/signoz/pkg/factory"
	"go.signoz.io/signoz/pkg/telemetrystore"
)

type provider struct {
	settings       factory.ScopedProviderSettings
	clickHouseConn clickHouseWrapper
}

func NewFactory() factory.ProviderFactory[telemetrystore.TelemetryStore, telemetrystore.Config] {
	return factory.NewProviderFactory(factory.MustNewName("clickhouse"), New)
}

func New(ctx context.Context, providerSettings factory.ProviderSettings, config telemetrystore.Config) (telemetrystore.TelemetryStore, error) {
	settings := factory.NewScopedProviderSettings(providerSettings, "go.signoz.io/signoz/pkg/telemetrystore/clickhousetelemetrystore")

	chConn, err := clickhouse.Open(&clickhouse.Options{
		Addr: []string{config.ClickHouse.Address},
		Auth: clickhouse.Auth{
			Username: config.ClickHouse.Username,
			Password: config.ClickHouse.Password,
		},
		MaxIdleConns: config.Connection.MaxIdleConns,
		MaxOpenConns: config.Connection.MaxOpenConns,
		DialTimeout:  config.Connection.DialTimeout,
		Debug:        config.ClickHouse.Debug,
	})
	if err != nil {
		return nil, err
	}

	wrappedConn := wrapClickhouseConn(chConn, config.ClickHouse.QuerySettings)

	return &provider{
		settings:       settings,
		clickHouseConn: wrappedConn,
	}, nil
}

// returns  connection with wrapper
func (p *provider) ClickHouse() clickhouse.Conn {
	return p.clickHouseConn
}

// return the underlying connection without wrapper
func (p *provider) ClickHouseConn() clickhouse.Conn {
	return p.clickHouseConn.conn
}

package clickhousetelemetrystore

import (
	"context"

	"github.com/ClickHouse/clickhouse-go/v2"
	"go.signoz.io/signoz/pkg/factory"
	"go.signoz.io/signoz/pkg/telemetrystore"
)

type provider struct {
	settings       factory.ScopedProviderSettings
	clickhouseConn clickhouse.Conn
}

func NewFactory() factory.ProviderFactory[telemetrystore.TelemetryStore, telemetrystore.Config] {
	return factory.NewProviderFactory(factory.MustNewName("clickhouse"), New)
}

func New(ctx context.Context, providerSettings factory.ProviderSettings, config telemetrystore.Config) (telemetrystore.TelemetryStore, error) {
	settings := factory.NewScopedProviderSettings(providerSettings, "go.signoz.io/signoz/pkg/telemetrystore/clickhousetelemetrystore")

	chConn, err := clickhouse.Open(&clickhouse.Options{
		Addr: []string{config.Clickhouse.Address},
		Auth: clickhouse.Auth{
			Username: config.Clickhouse.Username,
			Password: config.Clickhouse.Password,
		},
		MaxIdleConns: config.Connection.MaxIdleConns,
		MaxOpenConns: config.Connection.MaxOpenConns,
		DialTimeout:  config.Connection.DialTimeout,
		Debug:        config.Clickhouse.Debug,
	})
	if err != nil {
		return nil, err
	}

	return &provider{
		settings:       settings,
		clickhouseConn: chConn,
	}, nil
}

func (p *provider) Clickhouse() clickhouse.Conn {
	return p.clickhouseConn
}

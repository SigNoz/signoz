package clickhousetelemetrystore

import (
	"context"
	"fmt"
	"os"

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

	// TODO(remove): Remove this once we have a proper way to set the DSN
	if os.Getenv("ClickHouseUrl") != "" {
		fmt.Println("[Deprecated] env ClickHouseUrl is deprecated and scheduled for removal. Please use SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_ADDRESS instead.")
		config.ClickHouse.DSN = os.Getenv("ClickHouseUrl")
	}

	options, err := clickhouse.ParseDSN(config.ClickHouse.DSN)
	if err != nil {
		return nil, err
	}
	options.MaxIdleConns = config.Connection.MaxIdleConns
	options.MaxOpenConns = config.Connection.MaxOpenConns
	options.DialTimeout = config.Connection.DialTimeout

	chConn, err := clickhouse.Open(options)
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

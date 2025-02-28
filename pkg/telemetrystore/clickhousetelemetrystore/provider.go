package clickhousetelemetrystore

import (
	"context"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
	"go.signoz.io/signoz/pkg/factory"
	"go.signoz.io/signoz/pkg/telemetrystore"
)

type provider struct {
	settings       factory.ScopedProviderSettings
	clickHouseConn clickhouse.Conn
	hooks          []telemetrystore.TelemetryStoreHook
}

func NewFactory(hookFactories ...factory.ProviderFactory[telemetrystore.TelemetryStoreHook, telemetrystore.Config]) factory.ProviderFactory[telemetrystore.TelemetryStore, telemetrystore.Config] {
	return factory.NewProviderFactory(factory.MustNewName("clickhouse"), func(ctx context.Context, providerSettings factory.ProviderSettings, config telemetrystore.Config) (telemetrystore.TelemetryStore, error) {
		// we want to fail fast so we have hook registration errors before creating the telemetry store
		hooks := make([]telemetrystore.TelemetryStoreHook, len(hookFactories))
		for i, hookFactory := range hookFactories {
			hook, err := hookFactory.New(ctx, providerSettings, config)
			if err != nil {
				return nil, err
			}
			hooks[i] = hook
		}
		return New(ctx, providerSettings, config, hooks...)
	})
}

func New(ctx context.Context, providerSettings factory.ProviderSettings, config telemetrystore.Config, hooks ...telemetrystore.TelemetryStoreHook) (telemetrystore.TelemetryStore, error) {
	settings := factory.NewScopedProviderSettings(providerSettings, "go.signoz.io/signoz/pkg/telemetrystore/clickhousetelemetrystore")

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

	return &provider{
		settings:       settings,
		clickHouseConn: chConn,
		hooks:          hooks,
	}, nil
}

func (p *provider) ClickHouseDB() clickhouse.Conn {
	return p
}

func (p provider) Close() error {
	return p.clickHouseConn.Close()
}

func (p provider) Ping(ctx context.Context) error {
	return p.clickHouseConn.Ping(ctx)
}

func (p provider) Stats() driver.Stats {
	return p.clickHouseConn.Stats()
}

func (p provider) Query(ctx context.Context, query string, args ...interface{}) (driver.Rows, error) {
	ctx, query, args = telemetrystore.WrapBeforeQuery(p.hooks, ctx, query, args...)
	rows, err := p.clickHouseConn.Query(ctx, query, args...)
	telemetrystore.WrapAfterQuery(p.hooks, ctx, query, args, rows, err)
	return rows, err
}

func (p provider) QueryRow(ctx context.Context, query string, args ...interface{}) driver.Row {
	ctx, query, args = telemetrystore.WrapBeforeQuery(p.hooks, ctx, query, args...)
	row := p.clickHouseConn.QueryRow(ctx, query, args...)
	telemetrystore.WrapAfterQuery(p.hooks, ctx, query, args, nil, nil)
	return row
}

func (p provider) Select(ctx context.Context, dest interface{}, query string, args ...interface{}) error {
	ctx, query, args = telemetrystore.WrapBeforeQuery(p.hooks, ctx, query, args...)
	err := p.clickHouseConn.Select(ctx, dest, query, args...)
	telemetrystore.WrapAfterQuery(p.hooks, ctx, query, args, nil, err)
	return err
}

func (p provider) Exec(ctx context.Context, query string, args ...interface{}) error {
	ctx, query, args = telemetrystore.WrapBeforeQuery(p.hooks, ctx, query, args...)
	err := p.clickHouseConn.Exec(ctx, query, args...)
	telemetrystore.WrapAfterQuery(p.hooks, ctx, query, args, nil, err)
	return err
}

func (p provider) AsyncInsert(ctx context.Context, query string, wait bool, args ...interface{}) error {
	ctx, query, args = telemetrystore.WrapBeforeQuery(p.hooks, ctx, query, args...)
	err := p.clickHouseConn.AsyncInsert(ctx, query, wait, args...)
	telemetrystore.WrapAfterQuery(p.hooks, ctx, query, args, nil, err)
	return err
}

func (p provider) PrepareBatch(ctx context.Context, query string, opts ...driver.PrepareBatchOption) (driver.Batch, error) {
	ctx, query, args := telemetrystore.WrapBeforeQuery(p.hooks, ctx, query)
	batch, err := p.clickHouseConn.PrepareBatch(ctx, query, opts...)
	telemetrystore.WrapAfterQuery(p.hooks, ctx, query, args, nil, err)
	return batch, err
}

func (p provider) ServerVersion() (*driver.ServerVersion, error) {
	return p.clickHouseConn.ServerVersion()
}

func (p provider) Contributors() []string {
	return p.clickHouseConn.Contributors()
}

package clickhousetelemetrystore

import (
	"context"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
)

type provider struct {
	settings       factory.ScopedProviderSettings
	clickHouseConn clickhouse.Conn
	cluster        string
	hooks          []telemetrystore.TelemetryStoreHook
}

func NewFactory(hookFactories ...telemetrystore.TelemetryStoreHookFactoryFunc) factory.ProviderFactory[telemetrystore.TelemetryStore, telemetrystore.Config] {
	return factory.NewProviderFactory(factory.MustNewName("clickhouse"), func(ctx context.Context, providerSettings factory.ProviderSettings, config telemetrystore.Config) (telemetrystore.TelemetryStore, error) {
		return New(ctx, providerSettings, config, hookFactories...)
	})
}

func New(ctx context.Context, providerSettings factory.ProviderSettings, config telemetrystore.Config, hookFactories ...telemetrystore.TelemetryStoreHookFactoryFunc) (telemetrystore.TelemetryStore, error) {
	settings := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/telemetrystore/clickhousetelemetrystore")

	options, err := clickhouse.ParseDSN(config.Clickhouse.DSN)
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

	var version string
	if err := chConn.QueryRow(ctx, "SELECT version()").Scan(&version); err != nil {
		return nil, err
	}

	hooks := make([]telemetrystore.TelemetryStoreHook, len(hookFactories))
	for i, hookFactory := range hookFactories {
		hook, err := hookFactory(version).New(ctx, providerSettings, config)
		if err != nil {
			return nil, err
		}
		hooks[i] = hook
	}

	return &provider{
		settings:       settings,
		clickHouseConn: chConn,
		cluster:        config.Clickhouse.Cluster,
		hooks:          hooks,
	}, nil
}

func (p *provider) ClickhouseDB() clickhouse.Conn {
	return p
}

func (p *provider) Cluster() string {
	return p.cluster
}

func (p *provider) Close() error {
	return p.clickHouseConn.Close()
}

func (p *provider) Ping(ctx context.Context) error {
	return p.clickHouseConn.Ping(ctx)
}

func (p *provider) Stats() driver.Stats {
	return p.clickHouseConn.Stats()
}

func (p *provider) Query(ctx context.Context, query string, args ...interface{}) (driver.Rows, error) {
	event := telemetrystore.NewQueryEvent(query, args)

	ctx = telemetrystore.WrapBeforeQuery(p.hooks, ctx, event)
	rows, err := p.clickHouseConn.Query(ctx, query, args...)

	event.Err = err
	telemetrystore.WrapAfterQuery(p.hooks, ctx, event)

	return rows, err
}

func (p *provider) QueryRow(ctx context.Context, query string, args ...interface{}) driver.Row {
	event := telemetrystore.NewQueryEvent(query, args)

	ctx = telemetrystore.WrapBeforeQuery(p.hooks, ctx, event)
	row := p.clickHouseConn.QueryRow(ctx, query, args...)

	event.Err = row.Err()
	telemetrystore.WrapAfterQuery(p.hooks, ctx, event)

	return row
}

func (p *provider) Select(ctx context.Context, dest interface{}, query string, args ...interface{}) error {
	event := telemetrystore.NewQueryEvent(query, args)

	ctx = telemetrystore.WrapBeforeQuery(p.hooks, ctx, event)
	err := p.clickHouseConn.Select(ctx, dest, query, args...)

	event.Err = err
	telemetrystore.WrapAfterQuery(p.hooks, ctx, event)

	return err
}

func (p *provider) Exec(ctx context.Context, query string, args ...interface{}) error {
	event := telemetrystore.NewQueryEvent(query, args)

	ctx = telemetrystore.WrapBeforeQuery(p.hooks, ctx, event)
	err := p.clickHouseConn.Exec(ctx, query, args...)

	event.Err = err
	telemetrystore.WrapAfterQuery(p.hooks, ctx, event)

	return err
}

func (p *provider) AsyncInsert(ctx context.Context, query string, wait bool, args ...interface{}) error {
	event := telemetrystore.NewQueryEvent(query, args)

	ctx = telemetrystore.WrapBeforeQuery(p.hooks, ctx, event)
	err := p.clickHouseConn.AsyncInsert(ctx, query, wait, args...)

	event.Err = err
	telemetrystore.WrapAfterQuery(p.hooks, ctx, event)

	return err
}

func (p *provider) PrepareBatch(ctx context.Context, query string, opts ...driver.PrepareBatchOption) (driver.Batch, error) {
	event := telemetrystore.NewQueryEvent(query, nil)

	ctx = telemetrystore.WrapBeforeQuery(p.hooks, ctx, event)
	batch, err := p.clickHouseConn.PrepareBatch(ctx, query, opts...)

	event.Err = err
	telemetrystore.WrapAfterQuery(p.hooks, ctx, event)

	return batch, err
}

func (p *provider) ServerVersion() (*driver.ServerVersion, error) {
	return p.clickHouseConn.ServerVersion()
}

func (p *provider) Contributors() []string {
	return p.clickHouseConn.Contributors()
}

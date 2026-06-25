package clickhousetelemetrystore

import (
	"context"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"go.opentelemetry.io/otel/metric"
)

type provider struct {
	settings       factory.ScopedProviderSettings
	clickHouseConn clickhouse.Conn
	cluster        string
	hooks          []telemetrystore.TelemetryStoreHook
}

func NewFactory(hookFactories ...factory.ProviderFactory[telemetrystore.TelemetryStoreHook, telemetrystore.Config]) factory.ProviderFactory[telemetrystore.TelemetryStore, telemetrystore.Config] {
	return factory.NewProviderFactory(factory.MustNewName("clickhouse"), func(ctx context.Context, providerSettings factory.ProviderSettings, config telemetrystore.Config) (telemetrystore.TelemetryStore, error) {
		return New(ctx, providerSettings, config, hookFactories...)
	})
}

func New(ctx context.Context, providerSettings factory.ProviderSettings, config telemetrystore.Config, hookFactories ...factory.ProviderFactory[telemetrystore.TelemetryStoreHook, telemetrystore.Config]) (telemetrystore.TelemetryStore, error) {
	settings := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/telemetrystore/clickhousetelemetrystore")

	options, err := clickhouse.ParseDSN(config.Clickhouse.DSN)
	if err != nil {
		return nil, err
	}
	options.MaxIdleConns = config.Connection.MaxIdleConns
	options.MaxOpenConns = config.Connection.MaxOpenConns
	options.DialTimeout = config.Connection.DialTimeout
	// This is to avoid the driver decoding issues with JSON columns
	options.Settings["output_format_native_write_json_as_string"] = 1

	chConn, err := clickhouse.Open(options)
	if err != nil {
		return nil, err
	}

	hooks := make([]telemetrystore.TelemetryStoreHook, len(hookFactories))
	for i, hookFactory := range hookFactories {
		hook, err := hookFactory.New(ctx, providerSettings, config)
		if err != nil {
			return nil, err
		}
		hooks[i] = hook
	}

	metrics, err := newMetrics(settings.Meter())
	if err != nil {
		return nil, err
	}

	_, err = settings.Meter().RegisterCallback(func(_ context.Context, observer metric.Observer) error {
		stats := chConn.Stats()
		observer.ObserveInt64(metrics.open, int64(stats.Open))
		observer.ObserveInt64(metrics.idle, int64(stats.Idle))
		observer.ObserveInt64(metrics.maxOpen, int64(stats.MaxOpenConns))
		observer.ObserveInt64(metrics.maxIdle, int64(stats.MaxIdleConns))
		return nil
	}, metrics.open, metrics.idle, metrics.maxOpen, metrics.maxIdle)
	if err != nil {
		return nil, err
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
	if err != nil {
		event.Err = err
		telemetrystore.WrapAfterQuery(p.hooks, ctx, event)
		return nil, err
	}

	return &rowsWithHooks{
		Rows:    rows,
		ctx:     ctx,
		event:   event,
		onClose: func() { telemetrystore.WrapAfterQuery(p.hooks, ctx, event) },
	}, nil
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
	// TODO: migrate to WithAsync() — https://github.com/SigNoz/engineering-pod/issues/5093
	err := p.clickHouseConn.AsyncInsert(ctx, query, wait, args...) //nolint:staticcheck

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

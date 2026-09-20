package oceanbasetelemetrystore

import (
	"context"
	"database/sql"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/types/telemetrystoretypes"
	"github.com/go-sql-driver/mysql"
)

type provider struct {
	db     *sql.DB
	config telemetrystore.OceanBaseConfig
	hooks  []telemetrystore.TelemetryStoreHook
}

var _ telemetrystore.TelemetryStore = (*provider)(nil)

func NewFactory(hooks ...factory.ProviderFactory[telemetrystore.TelemetryStoreHook, telemetrystore.Config]) factory.ProviderFactory[telemetrystore.TelemetryStore, telemetrystore.Config] {
	return factory.NewProviderFactory(factory.MustNewName("oceanbase"), func(ctx context.Context, settings factory.ProviderSettings, config telemetrystore.Config) (telemetrystore.TelemetryStore, error) {
		return New(ctx, settings, config, hooks...)
	})
}

func New(ctx context.Context, settings factory.ProviderSettings, config telemetrystore.Config, hookFactories ...factory.ProviderFactory[telemetrystore.TelemetryStoreHook, telemetrystore.Config]) (telemetrystore.TelemetryStore, error) {
	if err := config.Validate(); err != nil {
		return nil, err
	}
	dsn, err := mysql.ParseDSN(config.OceanBase.DSN)
	if err != nil {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid OceanBase DSN")
	}
	// Timestamp result types have the same UTC semantics as the querier. Keep
	// prepared parameters and forbid multiple statements, including in custom DSNs.
	dsn.ParseTime = true
	dsn.Loc = time.UTC
	dsn.MultiStatements = false
	dsn.InterpolateParams = false
	dsn.Timeout = config.Connection.DialTimeout
	connector, err := mysql.NewConnector(dsn)
	if err != nil {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid OceanBase connection configuration")
	}
	db := sql.OpenDB(connector)
	db.SetMaxOpenConns(config.Connection.MaxOpenConns)
	db.SetMaxIdleConns(config.Connection.MaxIdleConns)
	db.SetConnMaxLifetime(5 * time.Minute)
	hooks := make([]telemetrystore.TelemetryStoreHook, 0, len(hookFactories))
	for _, f := range hookFactories {
		hook, err := f.New(ctx, settings, config)
		if err != nil {
			db.Close()
			return nil, err
		}
		hooks = append(hooks, hook)
	}
	pingCtx, cancel := context.WithTimeout(ctx, config.Connection.DialTimeout)
	defer cancel()
	if err := db.PingContext(pingCtx); err != nil {
		db.Close()
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "connect to OceanBase telemetry store")
	}
	return &provider{db: db, config: config.OceanBase, hooks: hooks}, nil
}

func (p *provider) QueryContext(ctx context.Context, query string, args ...any) (telemetrystore.Rows, error) {
	event := telemetrystore.NewQueryEvent(query, args)
	ctx = telemetrystore.WrapBeforeQuery(p.hooks, ctx, event)
	ctx, cancel := context.WithTimeout(ctx, p.config.QueryTimeout)
	finish := func(err error) {
		event.Err = err
		telemetrystore.WrapAfterQuery(p.hooks, ctx, event)
		cancel()
	}
	rows, err := p.db.QueryContext(ctx, query, args...)
	if err != nil {
		finish(err)
		return nil, err
	}
	result, err := newRows(rows, event.StartTime, finish)
	if err != nil {
		rows.Close()
		finish(err)
		return nil, err
	}
	result.maxRows = p.config.MaxResultRows
	return result, nil
}

func (p *provider) Close() error                   { return p.db.Close() }
func (p *provider) Ping(ctx context.Context) error { return p.db.PingContext(ctx) }
func (p *provider) ClickhouseDB() clickhouse.Conn  { return telemetrystore.UnsupportedClickHouse{} }
func (p *provider) Cluster() string                { return "" }
func (p *provider) Estimate(context.Context, string, ...any) ([]telemetrystoretypes.EstimateEntry, error) {
	return nil, telemetrystore.Unsupported("ClickHouse scan estimates")
}
func (p *provider) Plan(ctx context.Context, stmt string, args ...any) error {
	rows, err := p.QueryContext(ctx, "EXPLAIN "+stmt, args...)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
	}
	return rows.Err()
}
func (p *provider) Indexes(context.Context, string, ...any) (telemetrystoretypes.Granules, bool, error) {
	return telemetrystoretypes.Granules{}, false, telemetrystore.Unsupported("ClickHouse granule indexes")
}

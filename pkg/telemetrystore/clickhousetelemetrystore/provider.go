package clickhousetelemetrystore

import (
	"context"

	chproto "github.com/ClickHouse/ch-go/proto"
	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/types/telemetrystoretypes"
	"go.opentelemetry.io/otel/metric"
)

var (
	ErrCodeSyntaxError       = errors.MustNewCode("syntax_error")
	ErrCodeUnknownTable      = errors.MustNewCode("unknown_table")
	ErrCodeUnknownDatabase   = errors.MustNewCode("unknown_database")
	ErrCodeUnknownIdentifier = errors.MustNewCode("unknown_identifier")
	ErrCodeIllegalArgument   = errors.MustNewCode("illegal_argument")

	ErrCodeQueryCanceled   = errors.MustNewCode("query_canceled")
	ErrCodeQueryTimeout    = errors.MustNewCode("query_timeout")
	ErrCodeExecutionFailed = errors.MustNewCode("execution_failed")
)

// Codes absent from this map fall through to the raw driver error in castError.
var clickHouseExceptionWrappers = map[chproto.Error]func(cause error, ex *clickhouse.Exception) error{
	chproto.ErrSyntaxError: func(cause error, ex *clickhouse.Exception) error {
		return errors.WrapInvalidInputf(cause, ErrCodeSyntaxError, "SQL syntax error: %s", ex.Message)
	},
	chproto.ErrUnknownTable: func(cause error, ex *clickhouse.Exception) error {
		return errors.WrapNotFoundf(cause, ErrCodeUnknownTable, "unknown table: %s", ex.Message)
	},
	chproto.ErrUnknownDatabase: func(cause error, ex *clickhouse.Exception) error {
		return errors.WrapNotFoundf(cause, ErrCodeUnknownDatabase, "unknown database: %s", ex.Message)
	},
	chproto.ErrUnknownIdentifier: func(cause error, ex *clickhouse.Exception) error {
		return errors.WrapInvalidInputf(cause, ErrCodeUnknownIdentifier, "unknown identifier: %s", ex.Message)
	},
	chproto.ErrUnknownFunction: func(cause error, ex *clickhouse.Exception) error {
		return errors.WrapInvalidInputf(cause, ErrCodeUnknownIdentifier, "unknown function: %s", ex.Message)
	},
	chproto.ErrUnknownAggregateFunction: func(cause error, ex *clickhouse.Exception) error {
		return errors.WrapInvalidInputf(cause, ErrCodeUnknownIdentifier, "unknown aggregate function: %s", ex.Message)
	},
	chproto.ErrUnknownType: func(cause error, ex *clickhouse.Exception) error {
		return errors.WrapInvalidInputf(cause, ErrCodeUnknownIdentifier, "unknown type: %s", ex.Message)
	},
	chproto.ErrUnknownStorage: func(cause error, ex *clickhouse.Exception) error {
		return errors.WrapInvalidInputf(cause, ErrCodeUnknownIdentifier, "unknown storage engine: %s", ex.Message)
	},
	chproto.ErrIllegalColumn: func(cause error, ex *clickhouse.Exception) error {
		return errors.WrapInvalidInputf(cause, ErrCodeUnknownIdentifier, "illegal column: %s", ex.Message)
	},
	chproto.ErrUnknownElementInAst: func(cause error, ex *clickhouse.Exception) error {
		return errors.WrapInvalidInputf(cause, ErrCodeSyntaxError, "unknown element in SQL AST: %s", ex.Message)
	},
	chproto.ErrUnknownTypeOfQuery: func(cause error, ex *clickhouse.Exception) error {
		return errors.WrapInvalidInputf(cause, ErrCodeSyntaxError, "unknown query type: %s", ex.Message)
	},
	chproto.ErrIllegalTypeOfArgument: func(cause error, ex *clickhouse.Exception) error {
		return errors.WrapInvalidInputf(cause, ErrCodeIllegalArgument, "illegal argument type: %s", ex.Message)
	},
	chproto.ErrNumberOfArgumentsDoesntMatch: func(cause error, ex *clickhouse.Exception) error {
		return errors.WrapInvalidInputf(cause, ErrCodeIllegalArgument, "wrong number of arguments: %s", ex.Message)
	},
	chproto.ErrTooManyArgumentsForFunction: func(cause error, ex *clickhouse.Exception) error {
		return errors.WrapInvalidInputf(cause, ErrCodeIllegalArgument, "too many arguments to function: %s", ex.Message)
	},
	chproto.ErrTooLessArgumentsForFunction: func(cause error, ex *clickhouse.Exception) error {
		return errors.WrapInvalidInputf(cause, ErrCodeIllegalArgument, "too few arguments to function: %s", ex.Message)
	},
}

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

	p := &provider{
		settings:       settings,
		clickHouseConn: chConn,
		cluster:        config.Clickhouse.Cluster,
		hooks:          hooks,
	}
	return p, nil
}

func (p *provider) ClickhouseDB() clickhouse.Conn {
	return p
}

func (p *provider) Estimate(ctx context.Context, stmt string, args ...any) ([]telemetrystoretypes.EstimateEntry, error) {
	return RunExplainEstimate(ctx, p, stmt, args...)
}

func (p *provider) Plan(ctx context.Context, stmt string, args ...any) error {
	return RunExplainPlan(ctx, p, stmt, args...)
}

func (p *provider) Indexes(ctx context.Context, stmt string, args ...any) (telemetrystoretypes.Granules, bool, error) {
	return RunExplainIndexes(ctx, p, stmt, args...)
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
		return nil, castError(err)
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

	if row == nil {
		telemetrystore.WrapAfterQuery(p.hooks, ctx, event)
		return nil
	}

	event.Err = row.Err()
	telemetrystore.WrapAfterQuery(p.hooks, ctx, event)

	return &rowWithCastError{Row: row}
}

func (p *provider) Select(ctx context.Context, dest interface{}, query string, args ...interface{}) error {
	event := telemetrystore.NewQueryEvent(query, args)

	ctx = telemetrystore.WrapBeforeQuery(p.hooks, ctx, event)
	err := p.clickHouseConn.Select(ctx, dest, query, args...)

	event.Err = err
	telemetrystore.WrapAfterQuery(p.hooks, ctx, event)

	return castError(err)
}

func (p *provider) Exec(ctx context.Context, query string, args ...interface{}) error {
	event := telemetrystore.NewQueryEvent(query, args)

	ctx = telemetrystore.WrapBeforeQuery(p.hooks, ctx, event)
	err := p.clickHouseConn.Exec(ctx, query, args...)

	event.Err = err
	telemetrystore.WrapAfterQuery(p.hooks, ctx, event)

	return castError(err)
}

func (p *provider) AsyncInsert(ctx context.Context, query string, wait bool, args ...interface{}) error {
	event := telemetrystore.NewQueryEvent(query, args)

	ctx = telemetrystore.WrapBeforeQuery(p.hooks, ctx, event)
	err := p.clickHouseConn.Exec(clickhouse.Context(ctx, clickhouse.WithAsync(wait)), query, args...)

	event.Err = err
	telemetrystore.WrapAfterQuery(p.hooks, ctx, event)

	return castError(err)
}

func (p *provider) PrepareBatch(ctx context.Context, query string, opts ...driver.PrepareBatchOption) (driver.Batch, error) {
	event := telemetrystore.NewQueryEvent(query, nil)

	ctx = telemetrystore.WrapBeforeQuery(p.hooks, ctx, event)
	batch, err := p.clickHouseConn.PrepareBatch(ctx, query, opts...)

	event.Err = err
	telemetrystore.WrapAfterQuery(p.hooks, ctx, event)

	if batch == nil {
		return nil, castError(err)
	}
	return &batchWithCastError{Batch: batch}, castError(err)
}

func (p *provider) ServerVersion() (*driver.ServerVersion, error) {
	return p.clickHouseConn.ServerVersion()
}

func (p *provider) Contributors() []string {
	return p.clickHouseConn.Contributors()
}

func castError(err error) error {
	if err == nil {
		return nil
	}

	if errors.Is(err, context.Canceled) {
		return errors.WrapCanceledf(err, ErrCodeQueryCanceled, "query canceled")
	}
	if errors.Is(err, context.DeadlineExceeded) {
		return errors.WrapTimeoutf(err, ErrCodeQueryTimeout, "query timed out")
	}

	var ex *clickhouse.Exception
	if !errors.As(err, &ex) {
		return err
	}

	if wrap, ok := clickHouseExceptionWrappers[chproto.Error(ex.Code)]; ok {
		return wrap(err, ex)
	}

	return err
}

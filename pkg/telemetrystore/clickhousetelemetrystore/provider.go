package clickhousetelemetrystore

import (
	"context"
	"log/slog"

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

	ErrCodeDistributedSubqueryDenied = errors.MustNewCode("distributed_subquery_denied")
	ErrCodeDecimalOverflow           = errors.MustNewCode("decimal_overflow")
	ErrCodeNoCommonType              = errors.MustNewCode("no_common_type")
	ErrCodeNotAnAggregate            = errors.MustNewCode("not_an_aggregate")
	ErrCodeIllegalAggregation        = errors.MustNewCode("illegal_aggregation")
	ErrCodeInvalidRegexp             = errors.MustNewCode("invalid_regexp")
	ErrCodeSettingNotAllowed         = errors.MustNewCode("setting_not_allowed")

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
	chproto.ErrBadGet: func(cause error, ex *clickhouse.Exception) error {
		return errors.WrapInvalidInputf(cause, ErrCodeIllegalArgument, "parameter of the wrong type: %s", ex.Message).
			WithSuggestions("write numeric function parameters in the type the function expects, for example 1.0 rather than 1 where it takes a Float64")
	},
	chproto.ErrDistributedInJoinSubqueryDenied: func(cause error, ex *clickhouse.Exception) error {
		return errors.WrapInvalidInputf(cause, ErrCodeDistributedSubqueryDenied, "IN or JOIN subquery over a distributed table is not allowed: %s", ex.Message).
			WithSuggestions("use GLOBAL IN or GLOBAL JOIN for the subquery")
	},
	chproto.ErrDecimalOverflow: func(cause error, ex *clickhouse.Exception) error {
		return errors.WrapInvalidInputf(cause, ErrCodeDecimalOverflow, "decimal overflow: %s", ex.Message).
			WithSuggestions("cast the Decimal values to Float64, or to a wider Decimal such as Decimal128, before the arithmetic")
	},
	chproto.ErrNoCommonType: func(cause error, ex *clickhouse.Exception) error {
		return errors.WrapInvalidInputf(cause, ErrCodeNoCommonType, "values have no common type: %s", ex.Message).
			WithSuggestions("cast the values to one type, for example with toInt64 or toFloat64, so that the branches of if or multiIf, the elements of an array, or the columns of a UNION share it; count() returns UInt64, which has no common type with Int64")
	},
	chproto.ErrNotAnAggregate: func(cause error, ex *clickhouse.Exception) error {
		return errors.WrapInvalidInputf(cause, ErrCodeNotAnAggregate, "column is neither in GROUP BY nor inside an aggregate function: %s", ex.Message).
			WithSuggestions("add the column to GROUP BY, or wrap it in an aggregate function such as any()")
	},
	chproto.ErrIllegalAggregation: func(cause error, ex *clickhouse.Exception) error {
		return errors.WrapInvalidInputf(cause, ErrCodeIllegalAggregation, "aggregate function in a place that does not allow one: %s", ex.Message).
			WithSuggestions("give an aggregate an alias that is not a column name, because ClickHouse reads the alias in WHERE; move a condition on an aggregate from WHERE to HAVING; compute a nested aggregate in a subquery")
	},
	chproto.ErrSizesOfArraysDontMatch: func(cause error, ex *clickhouse.Exception) error {
		return errors.WrapInvalidInputf(cause, ErrCodeIllegalArgument, "arrays of different sizes: %s", ex.Message).
			WithSuggestions("pass arrays of the same length to a function that takes several arrays, such as arrayMap or arrayZip")
	},
	chproto.ErrCannotCompileRegexp: func(cause error, ex *clickhouse.Exception) error {
		return errors.WrapInvalidInputf(cause, ErrCodeInvalidRegexp, "regular expression does not compile: %s", ex.Message).
			WithSuggestions("write the pattern in RE2 syntax, which has no lookaround or backreferences, and escape a backslash that is meant literally")
	},
	// A SETTINGS clause went past a constraint of the query's settings profile.
	chproto.ErrSettingConstraintViolation: func(cause error, ex *clickhouse.Exception) error {
		return errors.WrapInvalidInputf(cause, ErrCodeSettingNotAllowed, "setting not allowed: %s", ex.Message).
			WithSuggestions("remove the setting from the SETTINGS clause of the query")
	},
}

type provider struct {
	settings       factory.ScopedProviderSettings
	clickHouseConn clickhouse.Conn
	profileConns   map[string]clickhouse.Conn
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

	chConn, err := open(config.Clickhouse.DSN, config.Connection)
	if err != nil {
		return nil, err
	}

	profileConns := make(map[string]clickhouse.Conn, len(config.Clickhouse.Profiles))
	for name, profile := range config.Clickhouse.Profiles {
		profileConns[name], err = open(profile.DSN, config.Connection)
		if err != nil {
			return nil, err
		}
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
		profileConns:   profileConns,
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
	for _, conn := range p.profileConns {
		if err := conn.Close(); err != nil {
			return err
		}
	}
	return p.clickHouseConn.Close()
}

func (p *provider) Ping(ctx context.Context) error {
	return p.clickHouseConn.Ping(ctx)
}

func (p *provider) Stats() driver.Stats {
	return p.clickHouseConn.Stats()
}

func (p *provider) Query(ctx context.Context, query string, args ...interface{}) (driver.Rows, error) {
	conn := p.connFor(ctx)

	event := telemetrystore.NewQueryEvent(query, args)

	ctx = telemetrystore.WrapBeforeQuery(p.hooks, ctx, event)
	rows, err := conn.Query(ctx, query, args...)
	if err != nil {
		event.Err = err
		telemetrystore.WrapAfterQuery(p.hooks, ctx, event)
		return nil, castError(err)
	}

	return &rowsWithHooks{
		Rows:    telemetrystore.WrapRows(rows),
		ctx:     ctx,
		event:   event,
		onClose: func() { telemetrystore.WrapAfterQuery(p.hooks, ctx, event) },
	}, nil
}

func (p *provider) QueryRow(ctx context.Context, query string, args ...interface{}) driver.Row {
	conn := p.connFor(ctx)

	event := telemetrystore.NewQueryEvent(query, args)

	ctx = telemetrystore.WrapBeforeQuery(p.hooks, ctx, event)
	row := conn.QueryRow(ctx, query, args...)

	if row == nil {
		telemetrystore.WrapAfterQuery(p.hooks, ctx, event)
		return nil
	}

	event.Err = row.Err()
	telemetrystore.WrapAfterQuery(p.hooks, ctx, event)

	return &rowWithCastError{Row: row}
}

func (p *provider) Select(ctx context.Context, dest interface{}, query string, args ...interface{}) error {
	conn := p.connFor(ctx)

	event := telemetrystore.NewQueryEvent(query, args)

	ctx = telemetrystore.WrapBeforeQuery(p.hooks, ctx, event)
	err := conn.Select(ctx, dest, query, args...)

	event.Err = err
	telemetrystore.WrapAfterQuery(p.hooks, ctx, event)

	return castError(err)
}

func (p *provider) Exec(ctx context.Context, query string, args ...interface{}) error {
	conn := p.connFor(ctx)

	event := telemetrystore.NewQueryEvent(query, args)

	ctx = telemetrystore.WrapBeforeQuery(p.hooks, ctx, event)
	err := conn.Exec(ctx, query, args...)

	event.Err = err
	telemetrystore.WrapAfterQuery(p.hooks, ctx, event)

	return castError(err)
}

func (p *provider) AsyncInsert(ctx context.Context, query string, wait bool, args ...interface{}) error {
	conn := p.connFor(ctx)

	event := telemetrystore.NewQueryEvent(query, args)

	ctx = telemetrystore.WrapBeforeQuery(p.hooks, ctx, event)
	err := conn.Exec(clickhouse.Context(ctx, clickhouse.WithAsync(wait)), query, args...)

	event.Err = err
	telemetrystore.WrapAfterQuery(p.hooks, ctx, event)

	return castError(err)
}

func (p *provider) PrepareBatch(ctx context.Context, query string, opts ...driver.PrepareBatchOption) (driver.Batch, error) {
	conn := p.connFor(ctx)

	event := telemetrystore.NewQueryEvent(query, nil)

	ctx = telemetrystore.WrapBeforeQuery(p.hooks, ctx, event)
	batch, err := conn.PrepareBatch(ctx, query, opts...)

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

func open(dsn string, connection telemetrystore.ConnectionConfig) (clickhouse.Conn, error) {
	options, err := clickhouse.ParseDSN(dsn)
	if err != nil {
		return nil, err
	}
	options.MaxIdleConns = connection.MaxIdleConns
	options.MaxOpenConns = connection.MaxOpenConns
	options.DialTimeout = connection.DialTimeout
	// Read JSON columns natively: the driver mis-decodes JSON(max_dynamic_paths=0) columns without
	// the flattened serialization, and reading them as a string collapses a key stored at both a
	// scalar and an object path.
	options.Settings["output_format_native_use_flattened_dynamic_and_json_serialization"] = 1

	return clickhouse.Open(options)
}

// connFor falls back to the default connection, which has no profile, when the profile of ctx is not configured.
func (p *provider) connFor(ctx context.Context) clickhouse.Conn {
	profile := telemetrystore.ProfileFromContext(ctx)
	if profile == "" {
		return p.clickHouseConn
	}
	if conn, ok := p.profileConns[profile]; ok {
		return conn
	}
	p.settings.Logger().WarnContext(ctx, "clickhouse settings profile is not configured, running the query without it", slog.String("profile", profile))
	return p.clickHouseConn
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

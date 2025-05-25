package resourcefilter

import (
	"context"
	"fmt"

	"github.com/SigNoz/signoz/pkg/errors"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/huandu/go-sqlbuilder"
)

type ResourceFilterStatementBuilderOpts struct {
	FieldMapper      qbtypes.FieldMapper
	ConditionBuilder qbtypes.ConditionBuilder
	Compiler         qbtypes.FilterCompiler
}

var (
	ErrUnsupportedSignal = errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported signal type")
)

// Configuration for different signal types
type signalConfig struct {
	dbName    string
	tableName string
}

var signalConfigs = map[telemetrytypes.Signal]signalConfig{
	telemetrytypes.SignalTraces: {
		dbName:    TracesDBName,
		tableName: TraceResourceV3TableName,
	},
	telemetrytypes.SignalLogs: {
		dbName:    LogsDBName,
		tableName: LogsResourceV2TableName,
	},
}

// Generic resource filter statement builder
type resourceFilterStatementBuilder[T any] struct {
	opts   ResourceFilterStatementBuilderOpts
	signal telemetrytypes.Signal
}

// Ensure interface compliance at compile time
var (
	_ qbtypes.StatementBuilder[qbtypes.TraceAggregation] = (*resourceFilterStatementBuilder[qbtypes.TraceAggregation])(nil)
	_ qbtypes.StatementBuilder[qbtypes.LogAggregation]   = (*resourceFilterStatementBuilder[qbtypes.LogAggregation])(nil)
)

// Constructor functions
func NewTraceResourceFilterStatementBuilder(opts ResourceFilterStatementBuilderOpts) *resourceFilterStatementBuilder[qbtypes.TraceAggregation] {
	return &resourceFilterStatementBuilder[qbtypes.TraceAggregation]{
		opts:   opts,
		signal: telemetrytypes.SignalTraces,
	}
}

func NewLogResourceFilterStatementBuilder(opts ResourceFilterStatementBuilderOpts) *resourceFilterStatementBuilder[qbtypes.LogAggregation] {
	return &resourceFilterStatementBuilder[qbtypes.LogAggregation]{
		opts:   opts,
		signal: telemetrytypes.SignalLogs,
	}
}

// Build builds a SQL query based on the given parameters
func (b *resourceFilterStatementBuilder[T]) Build(
	ctx context.Context,
	start uint64,
	end uint64,
	requestType qbtypes.RequestType,
	query qbtypes.QueryBuilderQuery[T],
) (*qbtypes.Statement, error) {
	config, exists := signalConfigs[b.signal]
	if !exists {
		return nil, fmt.Errorf("%w: %s", ErrUnsupportedSignal, b.signal)
	}

	q := sqlbuilder.ClickHouse.NewSelectBuilder()
	q.Select("fingerprint")
	q.From(fmt.Sprintf("%s.%s", config.dbName, config.tableName))

	if err := b.addConditions(ctx, q, start, end, query); err != nil {
		return nil, err
	}

	stmt, args := q.Build()
	return &qbtypes.Statement{
		Query: stmt,
		Args:  args,
	}, nil
}

// addConditions adds both filter and time conditions to the query
func (b *resourceFilterStatementBuilder[T]) addConditions(
	ctx context.Context,
	sb *sqlbuilder.SelectBuilder,
	start, end uint64,
	query qbtypes.QueryBuilderQuery[T],
) error {
	// Add filter condition if present
	if query.Filter != nil && query.Filter.Expression != "" {
		filterWhereClause, _, err := b.opts.Compiler.Compile(ctx, query.Filter.Expression)
		if err != nil {
			return err
		}
		if filterWhereClause != nil {
			sb.AddWhereClause(filterWhereClause)
		}
	}

	// Add time filter
	b.addTimeFilter(sb, start, end)
	return nil
}

// addTimeFilter adds time-based filtering conditions
func (b *resourceFilterStatementBuilder[T]) addTimeFilter(sb *sqlbuilder.SelectBuilder, start, end uint64) {
	// Convert nanoseconds to seconds and adjust start bucket
	const (
		nsToSeconds      = 1000000000
		bucketAdjustment = 1800 // 30 minutes
	)

	startBucket := start/nsToSeconds - bucketAdjustment
	endBucket := end / nsToSeconds

	sb.Where(
		sb.GE("seen_at_ts_bucket_start", startBucket),
		sb.LE("seen_at_ts_bucket_start", endBucket),
	)
}

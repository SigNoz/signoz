package resourcefilter

import (
	"context"
	"fmt"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/huandu/go-sqlbuilder"
)

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
	fieldMapper      qbtypes.FieldMapper
	conditionBuilder qbtypes.ConditionBuilder
	metadataStore    telemetrytypes.MetadataStore
	signal           telemetrytypes.Signal
}

// Ensure interface compliance at compile time
var (
	_ qbtypes.StatementBuilder[qbtypes.TraceAggregation] = (*resourceFilterStatementBuilder[qbtypes.TraceAggregation])(nil)
	_ qbtypes.StatementBuilder[qbtypes.LogAggregation]   = (*resourceFilterStatementBuilder[qbtypes.LogAggregation])(nil)
)

// Constructor functions
func NewTraceResourceFilterStatementBuilder(
	fieldMapper qbtypes.FieldMapper,
	conditionBuilder qbtypes.ConditionBuilder,
	metadataStore telemetrytypes.MetadataStore,
) *resourceFilterStatementBuilder[qbtypes.TraceAggregation] {
	return &resourceFilterStatementBuilder[qbtypes.TraceAggregation]{
		fieldMapper:      fieldMapper,
		conditionBuilder: conditionBuilder,
		metadataStore:    metadataStore,
		signal:           telemetrytypes.SignalTraces,
	}
}

func NewLogResourceFilterStatementBuilder(
	fieldMapper qbtypes.FieldMapper,
	conditionBuilder qbtypes.ConditionBuilder,
	metadataStore telemetrytypes.MetadataStore,
) *resourceFilterStatementBuilder[qbtypes.LogAggregation] {
	return &resourceFilterStatementBuilder[qbtypes.LogAggregation]{
		fieldMapper:      fieldMapper,
		conditionBuilder: conditionBuilder,
		metadataStore:    metadataStore,
		signal:           telemetrytypes.SignalLogs,
	}
}

func (b *resourceFilterStatementBuilder[T]) getKeySelectors(query qbtypes.QueryBuilderQuery[T]) []*telemetrytypes.FieldKeySelector {
	var keySelectors []*telemetrytypes.FieldKeySelector

	if query.Filter != nil && query.Filter.Expression != "" {
		whereClauseSelectors := querybuilder.QueryStringToKeysSelectors(query.Filter.Expression)
		keySelectors = append(keySelectors, whereClauseSelectors...)
	}

	for idx := range keySelectors {
		keySelectors[idx].Signal = b.signal
	}

	return keySelectors
}

// Build builds a SQL query based on the given parameters
func (b *resourceFilterStatementBuilder[T]) Build(
	ctx context.Context,
	start uint64,
	end uint64,
	requestType qbtypes.RequestType,
	query qbtypes.QueryBuilderQuery[T],
	variables map[string]qbtypes.VariableItem,
) (*qbtypes.Statement, error) {
	config, exists := signalConfigs[b.signal]
	if !exists {
		return nil, fmt.Errorf("%w: %s", ErrUnsupportedSignal, b.signal)
	}

	q := sqlbuilder.NewSelectBuilder()
	q.Select("fingerprint")
	q.From(fmt.Sprintf("%s.%s", config.dbName, config.tableName))

	keySelectors := b.getKeySelectors(query)
	keys, err := b.metadataStore.GetKeysMulti(ctx, keySelectors)
	if err != nil {
		return nil, err
	}

	if err := b.addConditions(ctx, q, start, end, query, keys, variables); err != nil {
		return nil, err
	}

	stmt, args := q.BuildWithFlavor(sqlbuilder.ClickHouse)
	return &qbtypes.Statement{
		Query: stmt,
		Args:  args,
	}, nil
}

// addConditions adds both filter and time conditions to the query
func (b *resourceFilterStatementBuilder[T]) addConditions(
	_ context.Context,
	sb *sqlbuilder.SelectBuilder,
	start, end uint64,
	query qbtypes.QueryBuilderQuery[T],
	keys map[string][]*telemetrytypes.TelemetryFieldKey,
	variables map[string]qbtypes.VariableItem,
) error {
	// Add filter condition if present
	if query.Filter != nil && query.Filter.Expression != "" {

		// warnings would be encountered as part of the main condition already
		filterWhereClause, _, err := querybuilder.PrepareWhereClause(query.Filter.Expression, querybuilder.FilterExprVisitorOpts{
			FieldMapper:        b.fieldMapper,
			ConditionBuilder:   b.conditionBuilder,
			FieldKeys:          keys,
			SkipFullTextFilter: true,
			Variables:          variables,
		})

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

	startBucket := start/querybuilder.NsToSeconds - querybuilder.BucketAdjustment
	endBucket := end / querybuilder.NsToSeconds

	sb.Where(
		sb.GE("seen_at_ts_bucket_start", startBucket),
		sb.LE("seen_at_ts_bucket_start", endBucket),
	)
}

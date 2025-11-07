package resourcefilter

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
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
	logger           *slog.Logger
	fieldMapper      qbtypes.FieldMapper
	conditionBuilder qbtypes.ConditionBuilder
	metadataStore    telemetrytypes.MetadataStore
	signal           telemetrytypes.Signal

	fullTextColumn *telemetrytypes.TelemetryFieldKey
	jsonBodyPrefix string
	jsonKeyToKey   qbtypes.JsonKeyToFieldFunc
}

// Ensure interface compliance at compile time
var (
	_ qbtypes.StatementBuilder[qbtypes.TraceAggregation] = (*resourceFilterStatementBuilder[qbtypes.TraceAggregation])(nil)
	_ qbtypes.StatementBuilder[qbtypes.LogAggregation]   = (*resourceFilterStatementBuilder[qbtypes.LogAggregation])(nil)
)

// Constructor functions
func NewTraceResourceFilterStatementBuilder(
	settings factory.ProviderSettings,
	fieldMapper qbtypes.FieldMapper,
	conditionBuilder qbtypes.ConditionBuilder,
	metadataStore telemetrytypes.MetadataStore,
) *resourceFilterStatementBuilder[qbtypes.TraceAggregation] {
	set := factory.NewScopedProviderSettings(settings, "github.com/SigNoz/signoz/pkg/querybuilder/resourcefilter")
	return &resourceFilterStatementBuilder[qbtypes.TraceAggregation]{
		logger:           set.Logger(),
		fieldMapper:      fieldMapper,
		conditionBuilder: conditionBuilder,
		metadataStore:    metadataStore,
		signal:           telemetrytypes.SignalTraces,
	}
}

func NewLogResourceFilterStatementBuilder(
	settings factory.ProviderSettings,
	fieldMapper qbtypes.FieldMapper,
	conditionBuilder qbtypes.ConditionBuilder,
	metadataStore telemetrytypes.MetadataStore,
	fullTextColumn *telemetrytypes.TelemetryFieldKey,
	jsonBodyPrefix string,
	jsonKeyToKey qbtypes.JsonKeyToFieldFunc,
) *resourceFilterStatementBuilder[qbtypes.LogAggregation] {
	set := factory.NewScopedProviderSettings(settings, "github.com/SigNoz/signoz/pkg/querybuilder/resourcefilter")
	return &resourceFilterStatementBuilder[qbtypes.LogAggregation]{
		logger:           set.Logger(),
		fieldMapper:      fieldMapper,
		conditionBuilder: conditionBuilder,
		metadataStore:    metadataStore,
		signal:           telemetrytypes.SignalLogs,
		fullTextColumn:   fullTextColumn,
		jsonBodyPrefix:   jsonBodyPrefix,
		jsonKeyToKey:     jsonKeyToKey,
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
		keySelectors[idx].SelectorMatchType = telemetrytypes.FieldSelectorMatchTypeExact
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
		return nil, errors.WrapInvalidInputf(ErrUnsupportedSignal, errors.CodeInvalidInput, "unsupported signal: %s", b.signal)
	}

	q := sqlbuilder.NewSelectBuilder()
	q.Select("fingerprint")
	q.From(fmt.Sprintf("%s.%s", config.dbName, config.tableName))

	keySelectors := b.getKeySelectors(query)
	keys, _, err := b.metadataStore.GetKeysMulti(ctx, keySelectors)
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
		filterWhereClause, err := querybuilder.PrepareWhereClause(query.Filter.Expression, querybuilder.FilterExprVisitorOpts{
			Logger:             b.logger,
			FieldMapper:        b.fieldMapper,
			ConditionBuilder:   b.conditionBuilder,
			FieldKeys:          keys,
			FullTextColumn:     b.fullTextColumn,
			JsonBodyPrefix:     b.jsonBodyPrefix,
			JsonKeyToKey:       b.jsonKeyToKey,
			SkipFullTextFilter: true,
			SkipFunctionCalls:  true,
			// there is no need for "key" not found error for resource filtering
			IgnoreNotFoundKeys: true,
			Variables:          variables,
        }, start, end)

		if err != nil {
			return err
		}
		if filterWhereClause != nil {
			sb.AddWhereClause(filterWhereClause.WhereClause)
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
	var endBucket uint64
	if end != 0 {
		endBucket = end / querybuilder.NsToSeconds
	}

	sb.Where(
		sb.GE("seen_at_ts_bucket_start", startBucket),
	)
	if end != 0 {
		sb.Where(
			sb.LE("seen_at_ts_bucket_start", endBucket),
		)
	}
}

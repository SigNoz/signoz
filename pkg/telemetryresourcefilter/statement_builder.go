package telemetryresourcefilter

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/types/featuretypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/huandu/go-sqlbuilder"
)

// resourceFilterStatementBuilder builds resource fingerprint filter CTEs.
type resourceFilterStatementBuilder[T any] struct {
	logger           *slog.Logger
	dbName           string
	tableName        string
	fieldMapper      qbtypes.FieldMapper
	conditionBuilder qbtypes.ConditionBuilder
	metadataStore    telemetrytypes.MetadataStore
	signal           telemetrytypes.Signal
	source           telemetrytypes.Source
	flagger          flagger.Flagger

	fullTextColumn *telemetrytypes.TelemetryFieldKey
	jsonKeyToKey   qbtypes.JsonKeyToFieldFunc
}

// Ensure interface compliance at compile time.
var (
	_ qbtypes.StatementBuilder[qbtypes.TraceAggregation] = (*resourceFilterStatementBuilder[qbtypes.TraceAggregation])(nil)
	_ qbtypes.StatementBuilder[qbtypes.LogAggregation]   = (*resourceFilterStatementBuilder[qbtypes.LogAggregation])(nil)
)

func New[T any](
	settings factory.ProviderSettings,
	dbName string,
	tableName string,
	signal telemetrytypes.Signal,
	source telemetrytypes.Source,
	metadataStore telemetrytypes.MetadataStore,
	fullTextColumn *telemetrytypes.TelemetryFieldKey,
	jsonKeyToKey qbtypes.JsonKeyToFieldFunc,
	fl flagger.Flagger,
) *resourceFilterStatementBuilder[T] {
	set := factory.NewScopedProviderSettings(settings, "github.com/SigNoz/signoz/pkg/telemetryresourcefilter")
	fm := NewFieldMapper()
	cb := NewConditionBuilder(fm)
	return &resourceFilterStatementBuilder[T]{
		logger:           set.Logger(),
		dbName:           dbName,
		tableName:        tableName,
		fieldMapper:      fm,
		conditionBuilder: cb,
		metadataStore:    metadataStore,
		signal:           signal,
		source:           source,
		flagger:          fl,
		fullTextColumn:   fullTextColumn,
		jsonKeyToKey:     jsonKeyToKey,
	}
}

func (b *resourceFilterStatementBuilder[T]) getKeySelectors(query qbtypes.QueryBuilderQuery[T]) []*telemetrytypes.FieldKeySelector {
	var keySelectors []*telemetrytypes.FieldKeySelector

	if query.Filter != nil && query.Filter.Expression != "" {
		whereClauseSelectors := querybuilder.QueryStringToKeysSelectors(query.Filter.Expression)
		keySelectors = append(keySelectors, whereClauseSelectors...)
	}

	// exclude out the body related key selectors
	filteredKeySelectors := []*telemetrytypes.FieldKeySelector{}
	for idx := range keySelectors {
		if keySelectors[idx].FieldContext == telemetrytypes.FieldContextBody {
			continue
		}
		keySelectors[idx].Signal = b.signal
		keySelectors[idx].Source = b.source
		keySelectors[idx].SelectorMatchType = telemetrytypes.FieldSelectorMatchTypeExact
		filteredKeySelectors = append(filteredKeySelectors, keySelectors[idx])
	}

	return filteredKeySelectors
}

// Build builds a SQL query based on the given parameters.
func (b *resourceFilterStatementBuilder[T]) Build(
	ctx context.Context,
	start uint64,
	end uint64,
	requestType qbtypes.RequestType,
	query qbtypes.QueryBuilderQuery[T],
	variables map[string]qbtypes.VariableItem,
) (*qbtypes.Statement, error) {
	q := sqlbuilder.NewSelectBuilder()
	q.Select("fingerprint")
	q.From(fmt.Sprintf("%s.%s", b.dbName, b.tableName))

	keySelectors := b.getKeySelectors(query)
	keys, _, err := b.metadataStore.GetKeysMulti(ctx, keySelectors)
	if err != nil {
		return nil, err
	}

	isNoOp, err := b.addConditions(ctx, q, start, end, query, keys, variables)
	if err != nil {
		return nil, err
	}
	if isNoOp {
		return nil, nil //nolint:nilnil
	}

	stmt, args := q.BuildWithFlavor(sqlbuilder.ClickHouse)
	return &qbtypes.Statement{
		Query: stmt,
		Args:  args,
	}, nil
}

// addConditions adds both filter and time conditions to the query.
// Returns true (isNoOp) when the filter expression evaluated to no resource conditions,
// meaning the CTE would select all fingerprints and should be skipped entirely.
func (b *resourceFilterStatementBuilder[T]) addConditions(
	ctx context.Context,
	sb *sqlbuilder.SelectBuilder,
	start, end uint64,
	query qbtypes.QueryBuilderQuery[T],
	keys map[string][]*telemetrytypes.TelemetryFieldKey,
	variables map[string]qbtypes.VariableItem,
) (bool, error) {

	// TODO(Tushar): thread orgID here to evaluate correctly
	bodyJSONEnabled := b.flagger.BooleanOrEmpty(ctx, flagger.FeatureUseJSONBody, featuretypes.NewFlaggerEvaluationContext(valuer.UUID{}))

	// Add filter condition if present
	if query.Filter != nil && query.Filter.Expression != "" {

		// warnings would be encountered as part of the main condition already
		filterWhereClause, err := querybuilder.PrepareWhereClause(query.Filter.Expression, querybuilder.FilterExprVisitorOpts{
			Context:            ctx,
			Logger:             b.logger,
			FieldMapper:        b.fieldMapper,
			ConditionBuilder:   b.conditionBuilder,
			FieldKeys:          keys,
			BodyJSONEnabled:    bodyJSONEnabled,
			FullTextColumn:     b.fullTextColumn,
			JsonKeyToKey:       b.jsonKeyToKey,
			SkipFullTextFilter: true,
			SkipFunctionCalls:  true,
			// there is no need for "key" not found error for resource filtering
			IgnoreNotFoundKeys: true,
			Variables:          variables,
			StartNs:            start,
			EndNs:              end,
		})

		if err != nil {
			return false, err
		}
		if filterWhereClause == nil {
			// this means all conditions evaluated to no-op (non-resource fields, unknown keys, skipped full-text/functions)
			// the CTE would select all fingerprints, so skip it entirely
			return true, nil
		}
		sb.AddWhereClause(filterWhereClause.WhereClause)
	} else {
		// No filter expression means we would select all fingerprints — skip the CTE.
		return true, nil
	}

	// Add time filter
	b.addTimeFilter(sb, start, end)
	return false, nil
}

// addTimeFilter adds time-based filtering conditions.
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

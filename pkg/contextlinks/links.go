package contextlinks

import (
	"encoding/json"
	"net/url"
	"slices"
	"strconv"
	"time"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

// PrepareParamsForTracesV5 returns the traces explorer query params for the
// given range, one explorer query per builder query with the labels folded
// into its filter; the traces explorer writes its time params in nanoseconds.
// queryType is builder_ai_query for the AI observability explorer.
func PrepareParamsForTracesV5(start, end time.Time, labels map[string]string, queries []BuilderQuery, queryType qbtypes.QueryType) url.Values {
	return prepareExplorerParams("traces", queryType, start.UnixNano(), end.UnixNano(), labels, queries)
}

// PrepareParamsForLogsV5 returns the logs explorer query params for the given
// range, one explorer query per builder query with the labels folded into its
// filter; the logs explorer writes its time params in milliseconds.
func PrepareParamsForLogsV5(start, end time.Time, labels map[string]string, queries []BuilderQuery) url.Values {
	return prepareExplorerParams("logs", qbtypes.QueryTypeBuilder, start.UnixMilli(), end.UnixMilli(), labels, queries)
}

// The end link is double encoded because otherwise a filter expression with `%` somewhere in it breaks.
func prepareExplorerParams(dataSource string, queryType qbtypes.QueryType, start, end int64, labels map[string]string, queries []BuilderQuery) url.Values {
	// builder_query is the explorer default, so it is left out to keep existing links unchanged
	builderQueryType := ""
	if queryType != qbtypes.QueryTypeBuilder {
		builderQueryType = queryType.StringValue()
	}

	// a rule without a builder query for the signal (e.g. ClickHouse SQL
	// alerts) still links to the explorer filtered on the labels alone
	if len(queries) == 0 {
		queries = []BuilderQuery{{}}
	}

	queryData := make([]LinkQuery, 0, len(queries))
	for _, query := range queries {
		queryData = append(queryData, LinkQuery{
			QueryName:        query.Name,
			DataSource:       dataSource,
			BuilderQueryType: builderQueryType,
			Filter:           &FilterExpression{Expression: PrepareFilterExpression(labels, query.Filter, query.GroupBy)},
		})
	}

	urlData := URLShareableCompositeQuery{
		QueryType: "builder",
		Builder: URLShareableBuilderQuery{
			QueryData:     queryData,
			QueryFormulas: make([]string, 0),
		},
	}

	data, _ := json.Marshal(urlData)

	params := url.Values{}
	params.Set("compositeQuery", url.QueryEscape(string(data)))
	params.Set("startTime", strconv.FormatInt(start, 10))
	params.Set("endTime", strconv.FormatInt(end, 10))
	return params
}

// ExtractBuilderQueries returns the builder queries of the given signal that
// the rule's selected query draws on, in composite query order: the selected
// query itself, or the inputs of a selected formula. Disabled inputs count,
// since a formula's inputs are usually hidden. The result is empty when none
// of them is a builder query (e.g. PromQL or ClickHouse SQL alerts). AI trace
// queries (builder_ai_query) count as trace builder queries.
func ExtractBuilderQueries(condition *ruletypes.RuleCondition, signal telemetrytypes.Signal) []BuilderQuery {
	if condition == nil || condition.CompositeQuery == nil {
		return nil
	}

	names := resolveSelectedQueryNames(condition)
	switch signal {
	case telemetrytypes.SignalLogs:
		return extractBuilderQueries[qbtypes.LogAggregation](condition.CompositeQuery.Queries, names, signal)
	case telemetrytypes.SignalTraces:
		return extractBuilderQueries[qbtypes.TraceAggregation](condition.CompositeQuery.Queries, names, signal)
	}
	return nil
}

func resolveSelectedQueryNames(condition *ruletypes.RuleCondition) []string {
	selected := condition.SelectedQuery
	if selected == "" {
		selected = condition.SelectedQueryName()
	}

	for _, query := range condition.CompositeQuery.Queries {
		if query.GetQueryName() != selected {
			continue
		}
		if formula, ok := query.Spec.(qbtypes.QueryBuilderFormula); ok {
			return formula.ExtractReferencedQueryNames()
		}
		return []string{selected}
	}
	return nil
}

func extractBuilderQueries[T any](queries []qbtypes.QueryEnvelope, names []string, signal telemetrytypes.Signal) []BuilderQuery {
	var matches []BuilderQuery
	for _, query := range queries {
		if query.Type != qbtypes.QueryTypeBuilder && query.Type != qbtypes.QueryTypeBuilderAI {
			continue
		}
		spec, ok := query.Spec.(qbtypes.QueryBuilderQuery[T])
		if !ok || spec.Signal != signal || !slices.Contains(names, spec.Name) {
			continue
		}
		filterExpr := ""
		if spec.Filter != nil {
			filterExpr = spec.Filter.Expression
		}
		matches = append(matches, BuilderQuery{Name: spec.Name, Filter: filterExpr, GroupBy: spec.GroupBy})
	}
	return matches
}

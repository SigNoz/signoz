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

func PrepareParamsForTracesV5(start, end time.Time, labels map[string]string, queries []BuilderQuery, queryType qbtypes.QueryType) url.Values {
	// the traces explorer takes its time params in nanoseconds
	return prepareExplorerParams("traces", queryType, start.UnixNano(), end.UnixNano(), labels, queries)
}

func PrepareParamsForLogsV5(start, end time.Time, labels map[string]string, queries []BuilderQuery) url.Values {
	// the logs explorer takes its time params in milliseconds
	return prepareExplorerParams("logs", qbtypes.QueryTypeBuilder, start.UnixMilli(), end.UnixMilli(), labels, queries)
}

// The end link is double encoded because otherwise a filter expression with `%` somewhere in it breaks.
func prepareExplorerParams(dataSource string, queryType qbtypes.QueryType, start, end int64, labels map[string]string, queries []BuilderQuery) url.Values {
	// builder_query is the explorer default, so it is left out to keep existing links unchanged
	builderQueryType := ""
	if queryType != qbtypes.QueryTypeBuilder {
		builderQueryType = queryType.StringValue()
	}

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
		// spec.Disabled is deliberately not checked: a formula's inputs are
		// usually hidden in the UI but must still make it into the link
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

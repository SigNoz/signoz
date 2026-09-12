package contextlinks

import (
	"encoding/json"
	"net/url"
	"strconv"
	"time"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

// PrepareParamsForTracesV5 returns the traces explorer query params for the
// given range and filters, one explorer query per filter; the traces explorer
// writes its time params in nanoseconds. queryType is builder_ai_query for the
// AI observability explorer.
func PrepareParamsForTracesV5(start, end time.Time, whereClauses []string, queryType qbtypes.QueryType) url.Values {
	return prepareExplorerParams("traces", queryType, start.UnixNano(), end.UnixNano(), whereClauses)
}

// PrepareParamsForLogsV5 returns the logs explorer query params for the given
// range and filters, one explorer query per filter; the logs explorer writes
// its time params in milliseconds.
func PrepareParamsForLogsV5(start, end time.Time, whereClauses []string) url.Values {
	return prepareExplorerParams("logs", qbtypes.QueryTypeBuilder, start.UnixMilli(), end.UnixMilli(), whereClauses)
}

// The end link is double encoded because otherwise a filter expression with `%` somewhere in it breaks.
func prepareExplorerParams(dataSource string, queryType qbtypes.QueryType, start, end int64, whereClauses []string) url.Values {
	// builder_query is the explorer default, so it is left out to keep existing links unchanged
	builderQueryType := ""
	if queryType != qbtypes.QueryTypeBuilder {
		builderQueryType = queryType.StringValue()
	}

	// the explorer needs a query to render; an unfiltered one is the meaningful
	// fallback when the caller has no filter to carry over
	if len(whereClauses) == 0 {
		whereClauses = []string{""}
	}

	queryData := make([]LinkQuery, 0, len(whereClauses))
	for _, whereClause := range whereClauses {
		queryData = append(queryData, LinkQuery{
			DataSource:       dataSource,
			BuilderQueryType: builderQueryType,
			Filter:           &FilterExpression{Expression: whereClause},
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

// BuilderQueriesForSignal returns the filter expression and group-by keys of
// every builder query for the given signal, in the order they appear in the
// composite query, or found=false when it has none (e.g. PromQL or ClickHouse
// SQL alerts). AI trace queries (builder_ai_query) count as trace builder
// queries.
func BuilderQueriesForSignal(queries []qbtypes.QueryEnvelope, signal telemetrytypes.Signal) ([]BuilderQuery, bool) {
	switch signal {
	case telemetrytypes.SignalLogs:
		return builderQueriesForSignal[qbtypes.LogAggregation](queries, signal)
	case telemetrytypes.SignalTraces:
		return builderQueriesForSignal[qbtypes.TraceAggregation](queries, signal)
	}
	return nil, false
}

func builderQueriesForSignal[T any](queries []qbtypes.QueryEnvelope, signal telemetrytypes.Signal) ([]BuilderQuery, bool) {
	matches := make([]BuilderQuery, 0, len(queries))
	for _, query := range queries {
		if query.Type != qbtypes.QueryTypeBuilder && query.Type != qbtypes.QueryTypeBuilderAI {
			continue
		}
		spec, ok := query.Spec.(qbtypes.QueryBuilderQuery[T])
		if !ok || spec.Signal != signal {
			continue
		}

		filterExpr := ""
		if spec.Filter != nil {
			filterExpr = spec.Filter.Expression
		}
		matches = append(matches, BuilderQuery{Filter: filterExpr, GroupBy: spec.GroupBy})
	}
	if len(matches) == 0 {
		return nil, false
	}
	return matches, true
}

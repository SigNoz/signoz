package contextlinks

import (
	"encoding/json"
	"net/url"
	"strconv"
	"time"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

// BuilderQueryPair is one builder query's filter and group-by, returned by
// BuilderQueriesForSignal. A single composite query can produce multiple pairs
// when the rule has more than one builder query for the same signal.
type BuilderQueryPair struct {
	Filter  string
	GroupBy []qbtypes.GroupByKey
}

// PrepareParamsForTracesV5 returns the traces explorer query params for the
// given range and per-query filter pairs; the traces explorer writes its time
// params in nanoseconds. Each pair produces one LinkQuery entry in the URL.
func PrepareParamsForTracesV5(start, end time.Time, pairs []BuilderQueryPair, labels map[string]string) url.Values {
	whereClauses := make([]string, 0, len(pairs))
	for _, p := range pairs {
		whereClauses = append(whereClauses, PrepareFilterExpression(labels, p.Filter, p.GroupBy))
	}
	return prepareExplorerParams("traces", start.UnixNano(), end.UnixNano(), whereClauses)
}

// PrepareParamsForLogsV5 returns the logs explorer query params for the given
// range and per-query filter pairs; the logs explorer writes its time params
// in milliseconds. Each pair produces one LinkQuery entry in the URL.
func PrepareParamsForLogsV5(start, end time.Time, pairs []BuilderQueryPair, labels map[string]string) url.Values {
	whereClauses := make([]string, 0, len(pairs))
	for _, p := range pairs {
		whereClauses = append(whereClauses, PrepareFilterExpression(labels, p.Filter, p.GroupBy))
	}
	return prepareExplorerParams("logs", start.UnixMilli(), end.UnixMilli(), whereClauses)
}

// The end link is double encoded because otherwise a filter expression with `%` somewhere in it breaks.
func prepareExplorerParams(dataSource string, start, end int64, whereClauses []string) url.Values {
	queryData := make([]LinkQuery, 0, len(whereClauses))
	for _, w := range whereClauses {
		queryData = append(queryData, LinkQuery{
			DataSource: dataSource,
			Filter:     &FilterExpression{Expression: w},
		})
	}
	urlData := URLShareableCompositeQuery{
		QueryType: "builder",
		Builder: URLShareableBuilderQuery{
			QueryData:      queryData,
			QueryFormulas:  make([]string, 0),
		},
	}

	data, _ := json.Marshal(urlData)

	params := url.Values{}
	params.Set("compositeQuery", url.QueryEscape(string(data)))
	params.Set("startTime", strconv.FormatInt(start, 10))
	params.Set("endTime", strconv.FormatInt(end, 10))
	return params
}

// BuilderQueriesForSignal returns one BuilderQueryPair for every builder query
// in queries that targets the given signal. The result is empty (found=false)
// when no builder query matches (e.g. the composite query is only PromQL or
// ClickHouse SQL). Pair order matches the order of the matching queries in
// the input slice.
func BuilderQueriesForSignal(queries []qbtypes.QueryEnvelope, signal telemetrytypes.Signal) ([]BuilderQueryPair, bool) {
	switch signal {
	case telemetrytypes.SignalLogs:
		return builderQueriesForSignal[qbtypes.LogAggregation](queries, signal)
	case telemetrytypes.SignalTraces:
		return builderQueriesForSignal[qbtypes.TraceAggregation](queries, signal)
	}
	return nil, false
}

func builderQueriesForSignal[T any](queries []qbtypes.QueryEnvelope, signal telemetrytypes.Signal) ([]BuilderQueryPair, bool) {
	var pairs []BuilderQueryPair
	for _, query := range queries {
		if query.Type != qbtypes.QueryTypeBuilder {
			continue
		}
		spec, ok := query.Spec.(qbtypes.QueryBuilderQuery[T])
		if !ok {
			continue
		}
		if spec.Signal != signal {
			continue
		}
		filterExpr := ""
		if spec.Filter != nil {
			filterExpr = spec.Filter.Expression
		}
		pairs = append(pairs, BuilderQueryPair{
			Filter:  filterExpr,
			GroupBy: spec.GroupBy,
		})
	}
	return pairs, len(pairs) > 0
}

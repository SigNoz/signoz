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
// given range and filter; the traces explorer writes its time params in
// nanoseconds.
func PrepareParamsForTracesV5(start, end time.Time, whereClause string) url.Values {
	return prepareExplorerParams("traces", start.UnixNano(), end.UnixNano(), whereClause)
}

// PrepareParamsForLogsV5 returns the logs explorer query params for the given
// range and filter; the logs explorer writes its time params in milliseconds.
func PrepareParamsForLogsV5(start, end time.Time, whereClause string) url.Values {
	return prepareExplorerParams("logs", start.UnixMilli(), end.UnixMilli(), whereClause)
}

// The end link is double encoded because otherwise a filter expression with `%` somewhere in it breaks.
func prepareExplorerParams(dataSource string, start, end int64, whereClause string) url.Values {
	urlData := URLShareableCompositeQuery{
		QueryType: "builder",
		Builder: URLShareableBuilderQuery{
			QueryData: []LinkQuery{{
				DataSource: dataSource,
				Filter:     &FilterExpression{Expression: whereClause},
			}},
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

// BuilderQueryForSignal returns the filter expression and group-by keys of the
// builder query for the given signal, or found=false when the composite query
// has no builder query for it (e.g. PromQL or ClickHouse SQL alerts).
// TODO(srikanthccv): re-visit this and support multiple queries.
func BuilderQueryForSignal(queries []qbtypes.QueryEnvelope, signal telemetrytypes.Signal) (string, []qbtypes.GroupByKey, bool) {
	switch signal {
	case telemetrytypes.SignalLogs:
		return builderQueryForSignal[qbtypes.LogAggregation](queries, signal)
	case telemetrytypes.SignalTraces:
		return builderQueryForSignal[qbtypes.TraceAggregation](queries, signal)
	}
	return "", nil, false
}

func builderQueryForSignal[T any](queries []qbtypes.QueryEnvelope, signal telemetrytypes.Signal) (string, []qbtypes.GroupByKey, bool) {
	var q qbtypes.QueryBuilderQuery[T]
	found := false
	for _, query := range queries {
		if query.Type != qbtypes.QueryTypeBuilder {
			continue
		}
		if spec, ok := query.Spec.(qbtypes.QueryBuilderQuery[T]); ok {
			q = spec
			found = true
		}
	}
	if !found || q.Signal != signal {
		return "", nil, false
	}

	filterExpr := ""
	if q.Filter != nil {
		filterExpr = q.Filter.Expression
	}
	return filterExpr, q.GroupBy, true
}

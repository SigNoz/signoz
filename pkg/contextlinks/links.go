package contextlinks

import (
	"encoding/json"
	"net/url"
	"strconv"
	"time"

	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

func PrepareParamsForTracesV5(start, end time.Time, whereClause string) url.Values {

	// Traces list view expects time in nanoseconds
	tr := URLShareableTimeRange{
		Start:    start.UnixNano(),
		End:      end.UnixNano(),
		PageSize: 100,
	}

	options := URLShareableOptions{}

	period, _ := json.Marshal(tr)

	linkQuery := LinkQuery{
		BuilderQuery: v3.BuilderQuery{
			DataSource:         v3.DataSourceTraces,
			QueryName:          "A",
			AggregateOperator:  v3.AggregateOperatorNoOp,
			AggregateAttribute: v3.AttributeKey{},
			Expression:         "A",
			Disabled:           false,
			Having:             []v3.Having{},
			StepInterval:       60,
		},
		Filter: &FilterExpression{Expression: whereClause},
	}

	urlData := URLShareableCompositeQuery{
		QueryType: string(v3.QueryTypeBuilder),
		Builder: URLShareableBuilderQuery{
			QueryData: []LinkQuery{
				linkQuery,
			},
			QueryFormulas: make([]string, 0),
		},
	}

	data, _ := json.Marshal(urlData)
	compositeQuery := url.QueryEscape(string(data))

	optionsData, _ := json.Marshal(options)

	params := url.Values{}
	params.Set("compositeQuery", compositeQuery)
	params.Set("timeRange", string(period))
	params.Set("startTime", strconv.FormatInt(tr.Start, 10))
	params.Set("endTime", strconv.FormatInt(tr.End, 10))
	params.Set("options", string(optionsData))
	return params
}

func PrepareParamsForLogsV5(start, end time.Time, whereClause string) url.Values {

	// Logs list view expects time in milliseconds
	tr := URLShareableTimeRange{
		Start:    start.UnixMilli(),
		End:      end.UnixMilli(),
		PageSize: 100,
	}

	options := URLShareableOptions{}

	period, _ := json.Marshal(tr)

	linkQuery := LinkQuery{
		BuilderQuery: v3.BuilderQuery{
			DataSource:         v3.DataSourceLogs,
			QueryName:          "A",
			AggregateOperator:  v3.AggregateOperatorNoOp,
			AggregateAttribute: v3.AttributeKey{},
			Expression:         "A",
			Disabled:           false,
			Having:             []v3.Having{},
			StepInterval:       60,
		},
		Filter: &FilterExpression{Expression: whereClause},
	}

	urlData := URLShareableCompositeQuery{
		QueryType: string(v3.QueryTypeBuilder),
		Builder: URLShareableBuilderQuery{
			QueryData: []LinkQuery{
				linkQuery,
			},
			QueryFormulas: make([]string, 0),
		},
	}

	data, _ := json.Marshal(urlData)
	compositeQuery := url.QueryEscape(string(data))

	optionsData, _ := json.Marshal(options)

	params := url.Values{}
	params.Set("compositeQuery", compositeQuery)
	params.Set("timeRange", string(period))
	params.Set("startTime", strconv.FormatInt(tr.Start, 10))
	params.Set("endTime", strconv.FormatInt(tr.End, 10))
	params.Set("options", string(optionsData))
	return params
}

// BuilderQueryForSignal returns the filter expression and group-by keys of the
// builder query for the given signal, or found=false when the composite query
// has no builder query for it (e.g. PromQL or ClickHouse SQL alerts).
// TODO(srikanthccv): re-visit this and support multiple queries
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

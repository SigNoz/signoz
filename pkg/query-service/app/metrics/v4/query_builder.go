package v4

import (
	"fmt"
	"time"

	metricsV3 "go.signoz.io/signoz/pkg/query-service/app/metrics/v3"
	"go.signoz.io/signoz/pkg/query-service/model"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

// PrepareMetricQuery prepares the query to be used for fetching metrics
// from the database
// start and end are in milliseconds
// step is in seconds
func PrepareMetricQuery(start, end int64, queryType v3.QueryType, panelType v3.PanelType, mq *v3.BuilderQuery, options metricsV3.Options) (string, error) {

	var shiftBy time.Duration
	var err error

	for _, fn := range mq.Functions {
		if fn.Name == "timeShift" {
			by, ok := fn.Args[0].(string)
			if !ok {
				return "", fmt.Errorf("timeShift requires one argument")
			}
			shiftBy, err = time.ParseDuration(by)
			if err != nil {
				return "", fmt.Errorf("invalid shift by argument for time shift %s", by)
			}
		}
	}
	start -= shiftBy.Milliseconds()
	end -= shiftBy.Milliseconds()

	// adjust the start and end time to be aligned with the step interval
	start = start - (start % (mq.StepInterval * 1000))
	end = end - (end % (mq.StepInterval * 1000))

	var query string
	if mq.Temporality == v3.Delta {
		if panelType == v3.PanelTypeTable {
			query, err = buildMetricQueryForDeltaTable(start, end, mq.StepInterval, mq)
		} else {
			query, err = buildMetricQueryForDeltaTimeSeries(start, end, mq.StepInterval, mq)
		}
	} else {
		if panelType == v3.PanelTypeTable {
			query, err = buildMetricQueryCumulativeTable(start, end, mq.StepInterval, mq)
		} else {
			query, err = buildMetricQueryCumulativeTimeSeries(start, end, mq.StepInterval, mq)
		}
	}

	if err != nil {
		return "", err
	}

	if having(mq.Having) != "" {
		query = fmt.Sprintf("SELECT * FROM (%s) HAVING %s", query, having(mq.Having))
	}

	if panelType == v3.PanelTypeValue {
		query, err = reduceQuery(query, mq.ReduceTo, mq.AggregateOperator)
	}
	return query, err
}

func BuildPromQuery(promQuery *v3.PromQuery, step, start, end int64) *model.QueryRangeParams {
	return &model.QueryRangeParams{
		Query: promQuery.Query,
		Start: time.UnixMilli(start),
		End:   time.UnixMilli(end),
		Step:  time.Duration(step * int64(time.Second)),
	}
}

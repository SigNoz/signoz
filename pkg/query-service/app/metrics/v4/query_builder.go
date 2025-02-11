package v4

import (
	"fmt"
	"time"

	"go.signoz.io/signoz/pkg/query-service/app/metrics"
	metricsV3 "go.signoz.io/signoz/pkg/query-service/app/metrics/v3"
	"go.signoz.io/signoz/pkg/query-service/app/metrics/v4/cumulative"
	"go.signoz.io/signoz/pkg/query-service/app/metrics/v4/delta"
	"go.signoz.io/signoz/pkg/query-service/app/metrics/v4/helpers"
	"go.signoz.io/signoz/pkg/query-service/common"
	"go.signoz.io/signoz/pkg/query-service/model"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

// PrepareMetricQuery prepares the query to be used for fetching metrics
// from the database
// start and end are in milliseconds
// step is in seconds
func PrepareMetricQuery(start, end int64, queryType v3.QueryType, panelType v3.PanelType, mq *v3.BuilderQuery, options metricsV3.Options) (string, error) {

	if valFilter := metrics.AddMetricValueFilter(mq); valFilter != nil {
		mq.MetricValueFilter = valFilter
	}
	start, end = common.AdjustedMetricTimeRange(start, end, mq.StepInterval, *mq)

	var quantile float64

	percentileOperator := mq.SpaceAggregation

	if v3.IsPercentileOperator(mq.SpaceAggregation) &&
		mq.AggregateAttribute.Type != v3.AttributeKeyType(v3.MetricTypeExponentialHistogram) {
		quantile = v3.GetPercentileFromOperator(mq.SpaceAggregation)
		// If quantile is set, we need to group by le
		// and set the space aggregation to sum
		// and time aggregation to rate
		mq.TimeAggregation = v3.TimeAggregationRate
		mq.SpaceAggregation = v3.SpaceAggregationSum
		// If le is not present in group by for quantile, add it
		leFound := false
		for _, groupBy := range mq.GroupBy {
			if groupBy.Key == "le" {
				leFound = true
				break
			}
		}
		if !leFound {
			mq.GroupBy = append(mq.GroupBy, v3.AttributeKey{
				Key:      "le",
				Type:     v3.AttributeKeyTypeTag,
				DataType: v3.AttributeKeyDataTypeString,
			})
		}
	}

	var query string
	var err error
	if mq.Temporality == v3.Delta {
		if panelType == v3.PanelTypeTable {
			query, err = delta.PrepareMetricQueryDeltaTable(start, end, mq.StepInterval, mq)
		} else {
			query, err = delta.PrepareMetricQueryDeltaTimeSeries(start, end, mq.StepInterval, mq)
		}
	} else {
		if panelType == v3.PanelTypeTable {
			query, err = cumulative.PrepareMetricQueryCumulativeTable(start, end, mq.StepInterval, mq)
		} else {
			query, err = cumulative.PrepareMetricQueryCumulativeTimeSeries(start, end, mq.StepInterval, mq)
		}
	}

	if err != nil {
		return "", err
	}

	groupByWithoutLe := []v3.AttributeKey{}
	for _, groupBy := range mq.GroupBy {
		if groupBy.Key != "le" {
			groupByWithoutLe = append(groupByWithoutLe, groupBy)
		}
	}
	groupBy := helpers.GroupByAttributeKeyTags(groupByWithoutLe...)
	orderBy := helpers.OrderByAttributeKeyTags(mq.OrderBy, groupByWithoutLe)

	// fixed-bucket histogram quantiles are calculated with UDF
	if quantile != 0 && mq.AggregateAttribute.Type != v3.AttributeKeyType(v3.MetricTypeExponentialHistogram) {
		query = fmt.Sprintf(`SELECT %s, histogramQuantile(arrayMap(x -> toFloat64(x), groupArray(le)), groupArray(value), %.3f) as value FROM (%s) GROUP BY %s ORDER BY %s`, groupBy, quantile, query, groupBy, orderBy)
		mq.SpaceAggregation = percentileOperator
	}

	if panelType == v3.PanelTypeValue && len(mq.GroupBy) > 0 {
		query = helpers.AddSecondaryAggregation(mq.SecondaryAggregation, query)
	}

	return query, nil
}

func BuildPromQuery(promQuery *v3.PromQuery, step, start, end int64) *model.QueryRangeParams {
	return &model.QueryRangeParams{
		Query: promQuery.Query,
		Start: time.UnixMilli(start),
		End:   time.UnixMilli(end),
		Step:  time.Duration(step * int64(time.Second)),
	}
}

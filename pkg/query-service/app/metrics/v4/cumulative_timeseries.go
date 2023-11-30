package v4

import (
	"fmt"
	"strings"

	"go.signoz.io/signoz/pkg/query-service/constants"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"go.signoz.io/signoz/pkg/query-service/utils"
)

var rateWithoutNegative = `If((per_series_value - lagInFrame(per_series_value, 1, 0) OVER rate_window) < 0, nan, If((ts - lagInFrame(ts, 1, toDate('1970-01-01')) OVER rate_window) >= 86400, nan, (per_series_value - lagInFrame(per_series_value, 1, 0) OVER rate_window) / (ts - lagInFrame(ts, 1, toDate('1970-01-01')) OVER rate_window)))`
var increaseWithoutNegative = `If((per_series_value - lagInFrame(per_series_value, 1, 0) OVER rate_window) < 0, nan, If((ts - lagInFrame(ts, 1, toDate('1970-01-01')) OVER rate_window) >= 86400, nan, (per_series_value - lagInFrame(per_series_value, 1, 0) OVER rate_window)))`

// buildMetricsTimeSeriesFilterQuery builds the sub-query to be used for filtering
// timeseries based on search criteria
func buildMetricsTimeSeriesFilterQuery(fs *v3.FilterSet, groupTags []v3.AttributeKey, mq *v3.BuilderQuery) (string, error) {
	metricName := mq.AggregateAttribute.Key
	var conditions []string
	if mq.Temporality == v3.Delta {
		conditions = append(conditions, fmt.Sprintf("metric_name = %s AND temporality = '%s' ", utils.ClickHouseFormattedValue(metricName), v3.Delta))
	} else {
		conditions = append(conditions, fmt.Sprintf("metric_name = %s AND temporality IN ['%s', '%s']", utils.ClickHouseFormattedValue(metricName), v3.Cumulative, v3.Unspecified))
	}

	if fs != nil && len(fs.Items) != 0 {
		for _, item := range fs.Items {
			toFormat := item.Value
			op := v3.FilterOperator(strings.ToLower(strings.TrimSpace(string(item.Operator))))
			// if the received value is an array for like/match op, just take the first value
			// or should we throw an error?
			if op == v3.FilterOperatorLike || op == v3.FilterOperatorRegex || op == v3.FilterOperatorNotLike || op == v3.FilterOperatorNotRegex {
				x, ok := item.Value.([]interface{})
				if ok {
					if len(x) == 0 {
						continue
					}
					toFormat = x[0]
				}
			}

			if op == v3.FilterOperatorContains || op == v3.FilterOperatorNotContains {
				toFormat = fmt.Sprintf("%%%s%%", toFormat)
			}
			fmtVal := utils.ClickHouseFormattedValue(toFormat)
			switch op {
			case v3.FilterOperatorEqual:
				conditions = append(conditions, fmt.Sprintf("JSONExtractString(labels, '%s') = %s", item.Key.Key, fmtVal))
			case v3.FilterOperatorNotEqual:
				conditions = append(conditions, fmt.Sprintf("JSONExtractString(labels, '%s') != %s", item.Key.Key, fmtVal))
			case v3.FilterOperatorIn:
				conditions = append(conditions, fmt.Sprintf("JSONExtractString(labels, '%s') IN %s", item.Key.Key, fmtVal))
			case v3.FilterOperatorNotIn:
				conditions = append(conditions, fmt.Sprintf("JSONExtractString(labels, '%s') NOT IN %s", item.Key.Key, fmtVal))
			case v3.FilterOperatorLike:
				conditions = append(conditions, fmt.Sprintf("like(JSONExtractString(labels, '%s'), %s)", item.Key.Key, fmtVal))
			case v3.FilterOperatorNotLike:
				conditions = append(conditions, fmt.Sprintf("notLike(JSONExtractString(labels, '%s'), %s)", item.Key.Key, fmtVal))
			case v3.FilterOperatorRegex:
				conditions = append(conditions, fmt.Sprintf("match(JSONExtractString(labels, '%s'), %s)", item.Key.Key, fmtVal))
			case v3.FilterOperatorNotRegex:
				conditions = append(conditions, fmt.Sprintf("not match(JSONExtractString(labels, '%s'), %s)", item.Key.Key, fmtVal))
			case v3.FilterOperatorGreaterThan:
				conditions = append(conditions, fmt.Sprintf("JSONExtractString(labels, '%s') > %s", item.Key.Key, fmtVal))
			case v3.FilterOperatorGreaterThanOrEq:
				conditions = append(conditions, fmt.Sprintf("JSONExtractString(labels, '%s') >= %s", item.Key.Key, fmtVal))
			case v3.FilterOperatorLessThan:
				conditions = append(conditions, fmt.Sprintf("JSONExtractString(labels, '%s') < %s", item.Key.Key, fmtVal))
			case v3.FilterOperatorLessThanOrEq:
				conditions = append(conditions, fmt.Sprintf("JSONExtractString(labels, '%s') <= %s", item.Key.Key, fmtVal))
			case v3.FilterOperatorContains:
				conditions = append(conditions, fmt.Sprintf("like(JSONExtractString(labels, '%s'), %s)", item.Key.Key, fmtVal))
			case v3.FilterOperatorNotContains:
				conditions = append(conditions, fmt.Sprintf("notLike(JSONExtractString(labels, '%s'), %s)", item.Key.Key, fmtVal))
			case v3.FilterOperatorExists:
				conditions = append(conditions, fmt.Sprintf("has(JSONExtractKeys(labels), '%s')", item.Key.Key))
			case v3.FilterOperatorNotExists:
				conditions = append(conditions, fmt.Sprintf("not has(JSONExtractKeys(labels), '%s')", item.Key.Key))
			default:
				return "", fmt.Errorf("unsupported operation")
			}
		}
	}
	queryString := strings.Join(conditions, " AND ")

	var selectLabels string
	for _, tag := range groupTags {
		selectLabels += fmt.Sprintf(" JSONExtractString(labels, '%s') as %s,", tag.Key, tag.Key)
	}

	filterSubQuery := fmt.Sprintf("SELECT DISTINCT %s fingerprint FROM %s.%s WHERE %s", selectLabels, constants.SIGNOZ_METRIC_DBNAME, constants.SIGNOZ_TIMESERIES_LOCAL_TABLENAME, queryString)

	return filterSubQuery, nil
}

// buildTemporalAggregationSubQuery builds the sub-query to be used for temporal aggregation
func buildTemporalAggregationSubQuery(start, end, step int64, mq *v3.BuilderQuery) (string, error) {

	var subQuery string

	timeSeriesSubQuery, err := buildMetricsTimeSeriesFilterQuery(mq.Filters, mq.GroupBy, mq)
	if err != nil {
		return "", err
	}

	samplesTableTimeFilter := fmt.Sprintf("metric_name = %s AND timestamp_ms >= %d AND timestamp_ms <= %d", utils.ClickHouseFormattedValue(mq.AggregateAttribute.Key), start, end)

	// Select the aggregate value for interval
	queryTmpl :=
		"SELECT fingerprint, %s" +
			" toStartOfInterval(toDateTime(intDiv(timestamp_ms, 1000)), INTERVAL %d SECOND) as ts," +
			" %s as per_series_value" +
			" FROM " + constants.SIGNOZ_METRIC_DBNAME + "." + constants.SIGNOZ_SAMPLES_TABLENAME +
			" INNER JOIN" +
			" (%s) as filtered_time_series" +
			" USING fingerprint" +
			" WHERE " + samplesTableTimeFilter +
			" GROUP BY fingerprint, ts" +
			" ORDER BY fingerprint, ts"

	var selectLabelsAny string
	for _, tag := range mq.GroupBy {
		selectLabelsAny += fmt.Sprintf("any(%s) as %s,", tag.Key, tag.Key)
	}

	var selectLabels string
	for _, tag := range mq.GroupBy {
		selectLabels += tag.Key + ","
	}

	switch mq.TemporalAggregation {
	case v3.TemporalAggregationAvg:
		op := "avg(value)"
		subQuery = fmt.Sprintf(queryTmpl, selectLabelsAny, step, op, timeSeriesSubQuery)
	case v3.TemporalAggregationSum:
		op := "sum(value)"
		subQuery = fmt.Sprintf(queryTmpl, selectLabelsAny, step, op, timeSeriesSubQuery)
	case v3.TemporalAggregationMin:
		op := "min(value)"
		subQuery = fmt.Sprintf(queryTmpl, selectLabelsAny, step, op, timeSeriesSubQuery)
	case v3.TemporalAggregationMax:
		op := "max(value)"
		subQuery = fmt.Sprintf(queryTmpl, selectLabelsAny, step, op, timeSeriesSubQuery)
	case v3.TemporalAggregationCount:
		op := "count(value)"
		subQuery = fmt.Sprintf(queryTmpl, selectLabelsAny, step, op, timeSeriesSubQuery)
	case v3.TemporalAggregationCountDistinct:
		op := "count(distinct(value))"
		subQuery = fmt.Sprintf(queryTmpl, selectLabelsAny, step, op, timeSeriesSubQuery)
	case v3.TemporalAggregationAnyLast:
		op := "anyLast(value)"
		subQuery = fmt.Sprintf(queryTmpl, selectLabelsAny, step, op, timeSeriesSubQuery)
	case v3.TemporalAggregationRate:
		op := "max(value)"
		innerSubQuery := fmt.Sprintf(queryTmpl, selectLabelsAny, step, op, timeSeriesSubQuery)
		rateQueryTmpl :=
			"SELECT %s ts, " + rateWithoutNegative +
				" as per_series_value FROM(%s) WINDOW rate_window as (PARTITION BY fingerprint ORDER BY fingerprint, ts) "
		subQuery = fmt.Sprintf(rateQueryTmpl, selectLabels, innerSubQuery)
	case v3.TemporalAggregationIncrease:
		op := "max(value)"
		innerSubQuery := fmt.Sprintf(queryTmpl, selectLabelsAny, step, op, timeSeriesSubQuery)
		rateQueryTmpl :=
			"SELECT %s ts, " + increaseWithoutNegative +
				" as per_series_value FROM(%s) WINDOW rate_window as (PARTITION BY fingerprint ORDER BY fingerprint, ts) "
		subQuery = fmt.Sprintf(rateQueryTmpl, selectLabels, innerSubQuery)
	}
	return subQuery, nil
}

// buildMetricQuery builds the query to be used for fetching metrics
func buildMetricQuery(start, end, step int64, mq *v3.BuilderQuery) (string, error) {

	var query string

	temporalAggSubQuery, err := buildTemporalAggregationSubQuery(start, end, step, mq)
	if err != nil {
		return "", err
	}

	groupBy := groupingSetsByAttributeKeyTags(mq.GroupBy...)
	orderBy := orderByAttributeKeyTags(mq.OrderBy, mq.GroupBy)
	selectLabels := groupByAttributeKeyTags(mq.GroupBy...)

	queryTmpl :=
		"SELECT %s," +
			" %s as value" +
			" FROM (%s)" +
			" WHERE isNaN(per_series_value) = 0" +
			" GROUP BY %s" +
			" ORDER BY %s"

	switch mq.SpatialAggregation {
	case v3.SpatialAggregationAvg:
		op := "avg(per_series_value)"
		query = fmt.Sprintf(queryTmpl, selectLabels, op, temporalAggSubQuery, groupBy, orderBy)
	case v3.SpatialAggregationSum:
		op := "sum(per_series_value)"
		query = fmt.Sprintf(queryTmpl, selectLabels, op, temporalAggSubQuery, groupBy, orderBy)
	case v3.SpatialAggregationMin:
		op := "min(per_series_value)"
		query = fmt.Sprintf(queryTmpl, selectLabels, op, temporalAggSubQuery, groupBy, orderBy)
	case v3.SpatialAggregationMax:
		op := "max(per_series_value)"
		query = fmt.Sprintf(queryTmpl, selectLabels, op, temporalAggSubQuery, groupBy, orderBy)
	case v3.SpatialAggregationCount:
		op := "count(per_series_value)"
		query = fmt.Sprintf(queryTmpl, selectLabels, op, temporalAggSubQuery, groupBy, orderBy)
	}

	return query, nil
}

// groupingSets returns a string of comma separated tags for group by clause
// `ts` is always added to the group by clause
func groupingSets(tags ...string) string {
	withTs := append(tags, "ts")
	return fmt.Sprintf(`GROUPING SETS ( (%s), (%s) )`, strings.Join(withTs, ", "), strings.Join(tags, ", "))
}

func groupingSetsByAttributeKeyTags(tags ...v3.AttributeKey) string {
	groupTags := []string{}
	for _, tag := range tags {
		groupTags = append(groupTags, tag.Key)
	}
	return groupingSets(groupTags...)
}

func groupByAttributeKeyTags(tags ...v3.AttributeKey) string {
	groupTags := []string{}
	for _, tag := range tags {
		groupTags = append(groupTags, tag.Key)
	}
	groupTags = append(groupTags, "ts")
	return strings.Join(groupTags, ", ")
}

// orderBy returns a string of comma separated tags for order by clause
// if the order is not specified, it defaults to ASC
func orderByAttributeKeyTags(items []v3.OrderBy, tags []v3.AttributeKey) string {
	var orderBy []string
	for _, tag := range tags {
		found := false
		for _, item := range items {
			if item.ColumnName == tag.Key {
				found = true
				orderBy = append(orderBy, fmt.Sprintf("%s %s", item.ColumnName, item.Order))
				break
			}
		}
		if !found {
			orderBy = append(orderBy, fmt.Sprintf("%s ASC", tag.Key))
		}
	}

	orderBy = append(orderBy, "ts ASC")

	return strings.Join(orderBy, ", ")
}

func having(items []v3.Having) string {
	var having []string
	for _, item := range items {
		having = append(having, fmt.Sprintf("%s %s %v", "value", item.Operator, utils.ClickHouseFormattedValue(item.Value)))
	}
	return strings.Join(having, " AND ")
}

func reduceQuery(query string, reduceTo v3.ReduceToOperator, aggregateOperator v3.AggregateOperator) (string, error) {
	var selectLabels string
	var groupBy string
	// NOOP and RATE can possibly return multiple time series and reduce should be applied
	// for each uniques series. When the final result contains more than one series we throw
	// an error post DB fetching. Otherwise just return the single data. This is not known until queried so the
	// the query is prepared accordingly.
	if aggregateOperator == v3.AggregateOperatorNoOp || aggregateOperator == v3.AggregateOperatorRate {
		selectLabels = ", any(fullLabels) as fullLabels"
		groupBy = "GROUP BY fingerprint"
	}
	// the timestamp picked is not relevant here since the final value used is show the single
	// chart with just the query value. For the quer
	switch reduceTo {
	case v3.ReduceToOperatorLast:
		query = fmt.Sprintf("SELECT *, timestamp AS ts FROM (SELECT anyLastIf(value, toUnixTimestamp(ts) != 0) as value, anyIf(ts, toUnixTimestamp(ts) != 0) AS timestamp %s FROM (%s) %s)", selectLabels, query, groupBy)
	case v3.ReduceToOperatorSum:
		query = fmt.Sprintf("SELECT *, timestamp AS ts FROM (SELECT sumIf(value, toUnixTimestamp(ts) != 0) as value, anyIf(ts, toUnixTimestamp(ts) != 0) AS timestamp %s FROM (%s) %s)", selectLabels, query, groupBy)
	case v3.ReduceToOperatorAvg:
		query = fmt.Sprintf("SELECT *, timestamp AS ts FROM (SELECT avgIf(value, toUnixTimestamp(ts) != 0) as value, anyIf(ts, toUnixTimestamp(ts) != 0) AS timestamp %s FROM (%s) %s)", selectLabels, query, groupBy)
	case v3.ReduceToOperatorMax:
		query = fmt.Sprintf("SELECT *, timestamp AS ts FROM (SELECT maxIf(value, toUnixTimestamp(ts) != 0) as value, anyIf(ts, toUnixTimestamp(ts) != 0) AS timestamp %s FROM (%s) %s)", selectLabels, query, groupBy)
	case v3.ReduceToOperatorMin:
		query = fmt.Sprintf("SELECT *, timestamp AS ts FROM (SELECT minIf(value, toUnixTimestamp(ts) != 0) as value, anyIf(ts, toUnixTimestamp(ts) != 0) AS timestamp %s FROM (%s) %s)", selectLabels, query, groupBy)
	default:
		return "", fmt.Errorf("unsupported reduce operator")
	}
	return query, nil
}

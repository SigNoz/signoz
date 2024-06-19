package helpers

import (
	"fmt"
	"strings"
	"time"

	"go.signoz.io/signoz/pkg/query-service/constants"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"go.signoz.io/signoz/pkg/query-service/utils"
)

var (
	sixHoursInMilliseconds = time.Hour.Milliseconds() * 6
	oneDayInMilliseconds   = time.Hour.Milliseconds() * 24
)

// start and end are in milliseconds
func which(start, end int64) (int64, int64, string) {
	// If time range is less than 6 hours, we need to use the `time_series_v4` table
	// else if time range is less than 1 day and greater than 6 hours, we need to use the `time_series_v4_6hrs` table
	// else we need to use the `time_series_v4_1day` table
	var tableName string
	if end-start <= sixHoursInMilliseconds {
		// adjust the start time to nearest 1 hour
		start = start - (start % (time.Hour.Milliseconds() * 1))
		tableName = constants.SIGNOZ_TIMESERIES_v4_LOCAL_TABLENAME
	} else if end-start <= oneDayInMilliseconds {
		// adjust the start time to nearest 6 hours
		start = start - (start % (time.Hour.Milliseconds() * 6))
		tableName = constants.SIGNOZ_TIMESERIES_v4_6HRS_LOCAL_TABLENAME
	} else {
		// adjust the start time to nearest 1 day
		start = start - (start % (time.Hour.Milliseconds() * 24))
		tableName = constants.SIGNOZ_TIMESERIES_v4_1DAY_LOCAL_TABLENAME
	}

	return start, end, tableName
}

// PrepareTimeseriesFilterQuery builds the sub-query to be used for filtering timeseries based on the search criteria
func PrepareTimeseriesFilterQuery(start, end int64, mq *v3.BuilderQuery) (string, error) {
	var conditions []string
	var fs *v3.FilterSet = mq.Filters
	var groupTags []v3.AttributeKey = mq.GroupBy

	conditions = append(conditions, fmt.Sprintf("metric_name = %s", utils.ClickHouseFormattedValue(mq.AggregateAttribute.Key)))
	conditions = append(conditions, fmt.Sprintf("temporality = '%s'", mq.Temporality))

	start, end, tableName := which(start, end)

	conditions = append(conditions, fmt.Sprintf("unix_milli >= %d AND unix_milli < %d", start, end))

	if fs != nil && len(fs.Items) != 0 {
		for _, item := range fs.Items {
			toFormat := item.Value
			op := v3.FilterOperator(strings.ToLower(strings.TrimSpace(string(item.Operator))))
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
				return "", fmt.Errorf("unsupported filter operator")
			}
		}
	}
	whereClause := strings.Join(conditions, " AND ")

	var selectLabels string
	for _, tag := range groupTags {
		selectLabels += fmt.Sprintf("JSONExtractString(labels, '%s') as %s, ", tag.Key, tag.Key)
	}

	// The table JOIN key always exists
	selectLabels += "fingerprint"

	filterSubQuery := fmt.Sprintf(
		"SELECT DISTINCT %s FROM %s.%s WHERE %s",
		selectLabels,
		constants.SIGNOZ_METRIC_DBNAME,
		tableName,
		whereClause,
	)

	return filterSubQuery, nil
}

// PrepareTimeseriesFilterQuery builds the sub-query to be used for filtering timeseries based on the search criteria
func PrepareTimeseriesFilterQueryV3(start, end int64, mq *v3.BuilderQuery) (string, error) {
	var conditions []string
	var fs *v3.FilterSet = mq.Filters
	var groupTags []v3.AttributeKey = mq.GroupBy

	conditions = append(conditions, fmt.Sprintf("metric_name = %s", utils.ClickHouseFormattedValue(mq.AggregateAttribute.Key)))
	conditions = append(conditions, fmt.Sprintf("temporality = '%s'", mq.Temporality))

	start, end, tableName := which(start, end)

	conditions = append(conditions, fmt.Sprintf("unix_milli >= %d AND unix_milli < %d", start, end))

	if fs != nil && len(fs.Items) != 0 {
		for _, item := range fs.Items {
			toFormat := item.Value
			op := v3.FilterOperator(strings.ToLower(strings.TrimSpace(string(item.Operator))))
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
				return "", fmt.Errorf("unsupported filter operator")
			}
		}
	}
	whereClause := strings.Join(conditions, " AND ")

	var selectLabels string

	if mq.AggregateOperator == v3.AggregateOperatorNoOp || mq.AggregateOperator == v3.AggregateOperatorRate {
		selectLabels += "labels, "
	} else {
		for _, tag := range groupTags {
			selectLabels += fmt.Sprintf("JSONExtractString(labels, '%s') as %s, ", tag.Key, tag.Key)
		}
	}

	// The table JOIN key always exists
	selectLabels += "fingerprint"

	filterSubQuery := fmt.Sprintf(
		"SELECT DISTINCT %s FROM %s.%s WHERE %s",
		selectLabels,
		constants.SIGNOZ_METRIC_DBNAME,
		tableName,
		whereClause,
	)

	return filterSubQuery, nil
}

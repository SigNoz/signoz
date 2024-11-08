package v3

import (
	"strconv"

	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"go.signoz.io/signoz/pkg/query-service/utils"
	"go.uber.org/zap"
)

var TracesListViewDefaultSelectedColumns = []v3.AttributeKey{
	{
		Key:      "serviceName",
		DataType: v3.AttributeKeyDataTypeString,
		Type:     v3.AttributeKeyTypeTag,
		IsColumn: true,
	},
	{
		Key:      "name",
		DataType: v3.AttributeKeyDataTypeString,
		Type:     v3.AttributeKeyTypeTag,
		IsColumn: true,
	},
	{
		Key:      "durationNano",
		DataType: v3.AttributeKeyDataTypeArrayFloat64,
		Type:     v3.AttributeKeyTypeTag,
		IsColumn: true,
	},
	{
		Key:      "httpMethod",
		DataType: v3.AttributeKeyDataTypeString,
		Type:     v3.AttributeKeyTypeTag,
		IsColumn: true,
	},
	{
		Key:      "responseStatusCode",
		DataType: v3.AttributeKeyDataTypeString,
		Type:     v3.AttributeKeyTypeTag,
		IsColumn: true,
	},
}

// check if traceId filter is used in traces query and return the list of traceIds
func TraceIdFilterUsedWithEqual(params *v3.QueryRangeParamsV3) (bool, []string) {
	compositeQuery := params.CompositeQuery
	if compositeQuery == nil {
		return false, []string{}
	}
	var traceIds []string
	var traceIdFilterUsed bool

	// Build queries for each builder query
	for queryName, query := range compositeQuery.BuilderQueries {
		if query.Expression != queryName && query.DataSource != v3.DataSourceTraces {
			continue
		}

		// check filter attribute
		if query.Filters != nil && len(query.Filters.Items) != 0 {
			for _, item := range query.Filters.Items {

				if item.Key.Key == "traceID" && (item.Operator == v3.FilterOperatorIn ||
					item.Operator == v3.FilterOperatorEqual) {
					traceIdFilterUsed = true
					// validate value
					var err error
					val := item.Value
					val, err = utils.ValidateAndCastValue(val, item.Key.DataType)
					if err != nil {
						zap.L().Error("invalid value for key", zap.String("key", item.Key.Key), zap.Error(err))
						return false, []string{}
					}
					if val != nil {
						fmtVal := extractFormattedStringValues(val)
						traceIds = append(traceIds, fmtVal...)
					}
				}
			}
		}

	}

	zap.L().Debug("traceIds", zap.Any("traceIds", traceIds))
	return traceIdFilterUsed, traceIds
}

func extractFormattedStringValues(v interface{}) []string {
	// if it's pointer convert it to a value
	v = getPointerValue(v)

	switch x := v.(type) {
	case string:
		return []string{x}

	case []interface{}:
		if len(x) == 0 {
			return []string{}
		}
		switch x[0].(type) {
		case string:
			values := []string{}
			for _, val := range x {
				values = append(values, val.(string))
			}
			return values
		default:
			return []string{}
		}
	default:
		return []string{}
	}
}

func getPointerValue(v interface{}) interface{} {
	switch x := v.(type) {
	case *uint8:
		return *x
	case *uint16:
		return *x
	case *uint32:
		return *x
	case *uint64:
		return *x
	case *int:
		return *x
	case *int8:
		return *x
	case *int16:
		return *x
	case *int32:
		return *x
	case *int64:
		return *x
	case *float32:
		return *x
	case *float64:
		return *x
	case *string:
		return *x
	case *bool:
		return *x
	case []interface{}:
		values := []interface{}{}
		for _, val := range x {
			values = append(values, getPointerValue(val))
		}
		return values
	default:
		return v
	}
}

func AddTimestampFilters(minTime int64, maxTime int64, params *v3.QueryRangeParamsV3) {
	if minTime == 0 && maxTime == 0 {
		return
	}

	compositeQuery := params.CompositeQuery
	if compositeQuery == nil {
		return
	}
	// Build queries for each builder query and apply timestamp filter only if TraceID is present
	for queryName, query := range compositeQuery.BuilderQueries {
		if query.Expression != queryName && query.DataSource != v3.DataSourceTraces {
			continue
		}

		addTimeStampFilter := false

		// check filter attribute
		if query.Filters != nil && len(query.Filters.Items) != 0 {
			for _, item := range query.Filters.Items {
				if item.Key.Key == "traceID" && (item.Operator == v3.FilterOperatorIn ||
					item.Operator == v3.FilterOperatorEqual) {
					addTimeStampFilter = true
				}
			}
		}

		// add timestamp filter to query only if traceID filter along with equal/similar operator is used
		if addTimeStampFilter {
			timeFilters := []v3.FilterItem{
				{
					Key: v3.AttributeKey{
						Key:      "timestamp",
						Type:     v3.AttributeKeyTypeTag,
						DataType: v3.AttributeKeyDataTypeString,
						IsColumn: true,
					},
					Value:    strconv.FormatUint(uint64(minTime), 10),
					Operator: v3.FilterOperatorGreaterThanOrEq,
				},
				{
					Key: v3.AttributeKey{
						Key:      "timestamp",
						Type:     v3.AttributeKeyTypeTag,
						DataType: v3.AttributeKeyDataTypeString,
						IsColumn: true,
					},
					Value:    strconv.FormatUint(uint64(maxTime), 10),
					Operator: v3.FilterOperatorLessThanOrEq,
				},
			}

			// add new timestamp filter to query
			if query.Filters == nil {
				query.Filters = &v3.FilterSet{
					Items: timeFilters,
				}
			} else {
				query.Filters.Items = append(query.Filters.Items, timeFilters...)
			}
		}
	}
}

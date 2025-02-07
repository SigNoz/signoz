package metrics

import (
	"fmt"
	"reflect"
	"strconv"
	"strings"

	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"go.uber.org/zap"
)

func AddMetricValueFilter(mq *v3.BuilderQuery) *v3.MetricValueFilter {

	var metricValueFilter *v3.MetricValueFilter = nil

	if mq != nil && mq.Filters != nil && mq.Filters.Items != nil {
		for _, item := range mq.Filters.Items {
			if item.Key.Key == "__value" {
				switch v := item.Value.(type) {
				case float64:
					metricValueFilter = &v3.MetricValueFilter{
						Value: v,
					}
				case float32:
					metricValueFilter = &v3.MetricValueFilter{
						Value: float64(v),
					}
				case int:
					metricValueFilter = &v3.MetricValueFilter{
						Value: float64(v),
					}
				case int8:
					metricValueFilter = &v3.MetricValueFilter{
						Value: float64(v),
					}
				case int16:
					metricValueFilter = &v3.MetricValueFilter{
						Value: float64(v),
					}
				case int32:
					metricValueFilter = &v3.MetricValueFilter{
						Value: float64(v),
					}
				case int64:
					metricValueFilter = &v3.MetricValueFilter{
						Value: float64(v),
					}
				case uint:
					metricValueFilter = &v3.MetricValueFilter{
						Value: float64(v),
					}
				case uint8:
					metricValueFilter = &v3.MetricValueFilter{
						Value: float64(v),
					}
				case uint16:
					metricValueFilter = &v3.MetricValueFilter{
						Value: float64(v),
					}
				case uint32:
					metricValueFilter = &v3.MetricValueFilter{
						Value: float64(v),
					}
				case uint64:
					metricValueFilter = &v3.MetricValueFilter{
						Value: float64(v),
					}
				case string:
					numericValue, err := strconv.ParseFloat(v, 64)
					if err != nil {
						zap.L().Warn("invalid type for metric value filter, ignoring", zap.Any("type", reflect.TypeOf(v)), zap.String("value", v))
						continue
					}
					metricValueFilter = &v3.MetricValueFilter{
						Value: numericValue,
					}
				}
			}
		}
	}
	return metricValueFilter
}

// FormattedValue formats the value to be used in clickhouse query
func FormattedValue(v interface{}) string {
	switch x := v.(type) {
	case int:
		return fmt.Sprintf("%d", x)
	case float32, float64:
		return fmt.Sprintf("%f", x)
	case string:
		return fmt.Sprintf("'%s'", x)
	case bool:
		return fmt.Sprintf("%v", x)
	case []interface{}:
		if len(x) == 0 {
			return ""
		}
		switch x[0].(type) {
		case string:
			str := "["
			for idx, sVal := range x {
				str += fmt.Sprintf("'%s'", sVal)
				if idx != len(x)-1 {
					str += ","
				}
			}
			str += "]"
			return str
		case int, float32, float64, bool:
			return strings.Join(strings.Fields(fmt.Sprint(x)), ",")
		default:
			zap.L().Error("invalid type for formatted value", zap.Any("type", reflect.TypeOf(x[0])))
			return ""
		}
	default:
		zap.L().Error("invalid type for formatted value", zap.Any("type", reflect.TypeOf(x)))
		return ""
	}
}

// PromFormattedValue formats the value to be used in promql
func PromFormattedValue(v interface{}) string {
	switch x := v.(type) {
	case int:
		return fmt.Sprintf("%d", x)
	case float32, float64:
		return fmt.Sprintf("%f", x)
	case string:
		return x
	case bool:
		return fmt.Sprintf("%v", x)
	case []interface{}:
		if len(x) == 0 {
			return ""
		}
		switch x[0].(type) {
		case string, int, float32, float64, bool:
			// list of values joined by | for promql - a value can contain whitespace
			var str []string
			for _, sVal := range x {
				str = append(str, fmt.Sprintf("%v", sVal))
			}
			return strings.Join(str, "|")
		default:
			zap.L().Error("invalid type for prom formatted value", zap.Any("type", reflect.TypeOf(x[0])))
			return ""
		}
	default:
		zap.L().Error("invalid type for prom formatted value", zap.Any("type", reflect.TypeOf(x)))
		return ""
	}
}

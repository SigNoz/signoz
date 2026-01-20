package querybuildertypesv5

import (
	"math"
	"slices"
	"strconv"
	"strings"

	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

const (
	DefaultOrderByKey = "__result"
)

// ApplyLimit applies limit and ordering to a list of time series
// This function sorts the series based on the provided order criteria and applies the limit
func ApplySeriesLimit(series []*TimeSeries, orderBy []OrderBy, limit int) []*TimeSeries {
	if len(series) == 0 {
		return series
	}

	// If no orderBy is specified, sort by value in descending order
	effectiveOrderBy := orderBy
	if len(effectiveOrderBy) == 0 {
		effectiveOrderBy = []OrderBy{
			{
				Key: OrderByKey{
					TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
						Name:          DefaultOrderByKey,
						FieldDataType: telemetrytypes.FieldDataTypeFloat64,
					},
				},
				Direction: OrderDirectionDesc,
			},
		}
	}

	// Cache series values and labels
	seriesValues := make(map[*TimeSeries]float64, len(series))
	seriesLabels := make(map[*TimeSeries]map[string]string, len(series))

	for _, s := range series {
		seriesValues[s] = calculateSeriesValue(s)
		// Cache all labels for this series
		labelMap := make(map[string]string)
		for _, label := range s.Labels {
			if strVal, ok := label.Value.(string); ok {
				labelMap[label.Key.Name] = strVal
			} else {
				labelMap[label.Key.Name] = convertValueToString(label.Value)
			}
		}
		seriesLabels[s] = labelMap
	}

	// Sort the series based on the order criteria
	slices.SortStableFunc(series, func(i, j *TimeSeries) int {
		if compareSeries(i, j, effectiveOrderBy, seriesValues, seriesLabels) {
			return -1
		}
		if compareSeries(j, i, effectiveOrderBy, seriesValues, seriesLabels) {
			return 1
		}
		return 0
	})

	// Apply limit if specified
	if limit > 0 && len(series) > limit {
		return series[:limit]
	}

	return series
}

// compareSeries compares two time series based on the order criteria
// Returns true if series i should come before series j
func compareSeries(seriesI, seriesJ *TimeSeries, orderBy []OrderBy, seriesValues map[*TimeSeries]float64, seriesLabels map[*TimeSeries]map[string]string) bool {
	for _, order := range orderBy {
		columnName := order.Key.Name
		direction := order.Direction

		if columnName == DefaultOrderByKey {
			valueI := seriesValues[seriesI]
			valueJ := seriesValues[seriesJ]

			if valueI != valueJ {
				if direction == OrderDirectionAsc {
					return valueI < valueJ
				} else { // desc
					return valueI > valueJ
				}
			}
		} else {
			labelI, existsI := seriesLabels[seriesI][columnName]
			labelJ, existsJ := seriesLabels[seriesJ][columnName]

			if existsI != existsJ {
				// Handle missing labels - non-existent labels come first
				return !existsI
			}

			if existsI && existsJ {
				comparison := strings.Compare(labelI, labelJ)
				if comparison != 0 {
					if direction == OrderDirectionAsc {
						return comparison < 0
					} else { // desc
						return comparison > 0
					}
				}
			}
		}
	}

	// If all order criteria are equal, preserve original order
	return false
}

// calculateSeriesValue calculates the representative value for a time series
// For single-point series (like table queries), returns that value
// For multi-point series, returns the average of non-NaN/non-Inf values
func calculateSeriesValue(series *TimeSeries) float64 {
	if len(series.Values) == 0 {
		return 0.0
	}

	// For single-point series, return that value directly
	if len(series.Values) == 1 {
		value := series.Values[0].Value
		if math.IsNaN(value) || math.IsInf(value, 0) {
			return 0.0
		}
		return value
	}

	// For multi-point series, calculate average of valid values
	var sum float64
	var count float64

	for _, point := range series.Values {
		if math.IsNaN(point.Value) || math.IsInf(point.Value, 0) {
			continue
		}
		sum += point.Value
		count++
	}

	// Avoid division by zero
	if count == 0 {
		return 0.0
	}

	return sum / count
}

// convertValueToString converts various types to string for comparison
func convertValueToString(value any) string {
	switch v := value.(type) {
	case string:
		return v
	case int:
		return strconv.FormatInt(int64(v), 10)
	case int64:
		return strconv.FormatInt(v, 10)
	case float64:
		return strconv.FormatFloat(v, 'f', -1, 64)
	case bool:
		if v {
			return "true"
		}
		return "false"
	default:
		return ""
	}
}

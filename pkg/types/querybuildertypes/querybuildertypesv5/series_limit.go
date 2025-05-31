package querybuildertypesv5

import (
	"math"
	"sort"
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

	// Sort the series based on the order criteria
	sort.SliceStable(series, func(i, j int) bool {
		return compareSeries(series[i], series[j], effectiveOrderBy)
	})

	// Apply limit if specified
	if limit > 0 && len(series) > limit {
		return series[:limit]
	}

	return series
}

// compareSeries compares two time series based on the order criteria
// Returns true if series i should come before series j
func compareSeries(seriesI, seriesJ *TimeSeries, orderBy []OrderBy) bool {
	for _, order := range orderBy {
		columnName := order.Key.Name
		direction := order.Direction

		if columnName == DefaultOrderByKey {
			// Sort based on aggregated values
			valueI := calculateSeriesValue(seriesI)
			valueJ := calculateSeriesValue(seriesJ)

			if valueI != valueJ {
				if direction == OrderDirectionAsc {
					return valueI < valueJ
				} else { // desc
					return valueI > valueJ
				}
			}
		} else {
			// Sort based on labels
			labelI, existsI := findLabelValue(seriesI, columnName)
			labelJ, existsJ := findLabelValue(seriesJ, columnName)

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

// findLabelValue finds the value of a label with the given key in a time series
// Returns the label value and whether it was found
func findLabelValue(series *TimeSeries, key string) (string, bool) {
	for _, label := range series.Labels {
		if label.Key.Name == key {
			// Convert label value to string
			if strVal, ok := label.Value.(string); ok {
				return strVal, true
			}
			// Handle non-string values by converting to string
			return convertValueToString(label.Value), true
		}
	}
	return "", false
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

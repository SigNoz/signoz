package querybuildertypesv5

import (
	"math"
	"sort"
	"strconv"

	"github.com/SigNoz/signoz/pkg/valuer"
)

type FunctionName struct {
	valuer.String
}

var (
	FunctionNameCutOffMin     = FunctionName{valuer.NewString("cutoff_min")}
	FunctionNameCutOffMax     = FunctionName{valuer.NewString("cutoff_max")}
	FunctionNameClampMin      = FunctionName{valuer.NewString("clamp_min")}
	FunctionNameClampMax      = FunctionName{valuer.NewString("clamp_max")}
	FunctionNameAbsolute      = FunctionName{valuer.NewString("absolute")}
	FunctionNameRunningDiff   = FunctionName{valuer.NewString("running_diff")}
	FunctionNameLog2          = FunctionName{valuer.NewString("log2")}
	FunctionNameLog10         = FunctionName{valuer.NewString("log10")}
	FunctionNameCumulativeSum = FunctionName{valuer.NewString("cumulative_sum")}
	FunctionNameEWMA3         = FunctionName{valuer.NewString("ewma3")}
	FunctionNameEWMA5         = FunctionName{valuer.NewString("ewma5")}
	FunctionNameEWMA7         = FunctionName{valuer.NewString("ewma7")}
	FunctionNameMedian3       = FunctionName{valuer.NewString("median3")}
	FunctionNameMedian5       = FunctionName{valuer.NewString("median5")}
	FunctionNameMedian7       = FunctionName{valuer.NewString("median7")}
	FunctionNameTimeShift     = FunctionName{valuer.NewString("time_shift")}
	FunctionNameAnomaly       = FunctionName{valuer.NewString("anomaly")}
)

// ApplyFunction applies the given function to the result data
func ApplyFunction(fn Function, result *Result) *Result {
	// Extract the function name and arguments
	name := fn.Name
	args := fn.Args

	switch name {
	case FunctionNameCutOffMin, FunctionNameCutOffMax, FunctionNameClampMin, FunctionNameClampMax:
		if len(args) == 0 {
			return result
		}
		threshold, err := parseFloat64Arg(args[0].Value)
		if err != nil {
			return result
		}
		switch name {
		case FunctionNameCutOffMin:
			return funcCutOffMin(result, threshold)
		case FunctionNameCutOffMax:
			return funcCutOffMax(result, threshold)
		case FunctionNameClampMin:
			return funcClampMin(result, threshold)
		case FunctionNameClampMax:
			return funcClampMax(result, threshold)
		}
	case FunctionNameAbsolute:
		return funcAbsolute(result)
	case FunctionNameRunningDiff:
		return funcRunningDiff(result)
	case FunctionNameLog2:
		return funcLog2(result)
	case FunctionNameLog10:
		return funcLog10(result)
	case FunctionNameCumulativeSum:
		return funcCumulativeSum(result)
	case FunctionNameEWMA3, FunctionNameEWMA5, FunctionNameEWMA7:
		alpha := getEWMAAlpha(name, args)
		return funcEWMA(result, alpha)
	case FunctionNameMedian3:
		return funcMedian3(result)
	case FunctionNameMedian5:
		return funcMedian5(result)
	case FunctionNameMedian7:
		return funcMedian7(result)
	case FunctionNameTimeShift:
		if len(args) == 0 {
			return result
		}
		shift, err := parseFloat64Arg(args[0].Value)
		if err != nil {
			return result
		}
		return funcTimeShift(result, shift)
	case FunctionNameAnomaly:
		// Placeholder for anomaly detection - would need more sophisticated implementation
		return result
	}
	return result
}

// parseFloat64Arg parses a string argument to float64
func parseFloat64Arg(value string) (float64, error) {
	return strconv.ParseFloat(value, 64)
}

// getEWMAAlpha calculates the alpha value for EWMA functions
func getEWMAAlpha(name FunctionName, args []struct {
	Name  string `json:"name,omitempty"`
	Value string `json:"value"`
}) float64 {
	// Try to get alpha from arguments first
	if len(args) > 0 {
		if alpha, err := parseFloat64Arg(args[0].Value); err == nil {
			return alpha
		}
	}

	// Default alpha values: alpha = 2 / (n + 1) where n is the window size
	switch name {
	case FunctionNameEWMA3:
		return 0.5 // 2 / (3 + 1)
	case FunctionNameEWMA5:
		return 1.0 / 3.0 // 2 / (5 + 1)
	case FunctionNameEWMA7:
		return 0.25 // 2 / (7 + 1)
	}
	return 0.5 // default
}

// funcCutOffMin cuts off values below the threshold and replaces them with NaN
func funcCutOffMin(result *Result, threshold float64) *Result {
	if result.Type != RequestTypeTimeSeries {
		return result
	}

	timeSeriesData, ok := result.Value.(*TimeSeriesData)
	if !ok {
		return result
	}

	for _, aggregation := range timeSeriesData.Aggregations {
		for _, series := range aggregation.Series {
			for idx, point := range series.Values {
				if point.Value < threshold {
					point.Value = math.NaN()
				}
				series.Values[idx] = point
			}
		}
	}
	return result
}

// funcCutOffMax cuts off values above the threshold and replaces them with NaN
func funcCutOffMax(result *Result, threshold float64) *Result {
	if result.Type != RequestTypeTimeSeries {
		return result
	}

	timeSeriesData, ok := result.Value.(*TimeSeriesData)
	if !ok {
		return result
	}

	for _, aggregation := range timeSeriesData.Aggregations {
		for _, series := range aggregation.Series {
			for idx, point := range series.Values {
				if point.Value > threshold {
					point.Value = math.NaN()
				}
				series.Values[idx] = point
			}
		}
	}
	return result
}

// funcClampMin cuts off values below the threshold and replaces them with the threshold
func funcClampMin(result *Result, threshold float64) *Result {
	if result.Type != RequestTypeTimeSeries {
		return result
	}

	timeSeriesData, ok := result.Value.(*TimeSeriesData)
	if !ok {
		return result
	}

	for _, aggregation := range timeSeriesData.Aggregations {
		for _, series := range aggregation.Series {
			for idx, point := range series.Values {
				if point.Value < threshold {
					point.Value = threshold
				}
				series.Values[idx] = point
			}
		}
	}
	return result
}

// funcClampMax cuts off values above the threshold and replaces them with the threshold
func funcClampMax(result *Result, threshold float64) *Result {
	if result.Type != RequestTypeTimeSeries {
		return result
	}

	timeSeriesData, ok := result.Value.(*TimeSeriesData)
	if !ok {
		return result
	}

	for _, aggregation := range timeSeriesData.Aggregations {
		for _, series := range aggregation.Series {
			for idx, point := range series.Values {
				if point.Value > threshold {
					point.Value = threshold
				}
				series.Values[idx] = point
			}
		}
	}
	return result
}

// funcAbsolute returns the absolute value of each point
func funcAbsolute(result *Result) *Result {
	if result.Type != RequestTypeTimeSeries {
		return result
	}

	timeSeriesData, ok := result.Value.(*TimeSeriesData)
	if !ok {
		return result
	}

	for _, aggregation := range timeSeriesData.Aggregations {
		for _, series := range aggregation.Series {
			for idx, point := range series.Values {
				point.Value = math.Abs(point.Value)
				series.Values[idx] = point
			}
		}
	}
	return result
}

// funcRunningDiff returns the running difference of each point
func funcRunningDiff(result *Result) *Result {
	if result.Type != RequestTypeTimeSeries {
		return result
	}

	timeSeriesData, ok := result.Value.(*TimeSeriesData)
	if !ok {
		return result
	}

	for _, aggregation := range timeSeriesData.Aggregations {
		for _, series := range aggregation.Series {
			// iterate over the points in reverse order
			for idx := len(series.Values) - 1; idx >= 0; idx-- {
				if idx > 0 {
					series.Values[idx].Value = series.Values[idx].Value - series.Values[idx-1].Value
				}
			}
			// remove the first point
			if len(series.Values) > 0 {
				series.Values = series.Values[1:]
			}
		}
	}
	return result
}

// funcLog2 returns the log2 of each point
func funcLog2(result *Result) *Result {
	if result.Type != RequestTypeTimeSeries {
		return result
	}

	timeSeriesData, ok := result.Value.(*TimeSeriesData)
	if !ok {
		return result
	}

	for _, aggregation := range timeSeriesData.Aggregations {
		for _, series := range aggregation.Series {
			for idx, point := range series.Values {
				point.Value = math.Log2(point.Value)
				series.Values[idx] = point
			}
		}
	}
	return result
}

// funcLog10 returns the log10 of each point
func funcLog10(result *Result) *Result {
	if result.Type != RequestTypeTimeSeries {
		return result
	}

	timeSeriesData, ok := result.Value.(*TimeSeriesData)
	if !ok {
		return result
	}

	for _, aggregation := range timeSeriesData.Aggregations {
		for _, series := range aggregation.Series {
			for idx, point := range series.Values {
				point.Value = math.Log10(point.Value)
				series.Values[idx] = point
			}
		}
	}
	return result
}

// funcCumulativeSum returns the cumulative sum for each point in a series
func funcCumulativeSum(result *Result) *Result {
	if result.Type != RequestTypeTimeSeries {
		return result
	}

	timeSeriesData, ok := result.Value.(*TimeSeriesData)
	if !ok {
		return result
	}

	for _, aggregation := range timeSeriesData.Aggregations {
		for _, series := range aggregation.Series {
			var sum float64
			for idx, point := range series.Values {
				if !math.IsNaN(point.Value) {
					sum += point.Value
				}
				point.Value = sum
				series.Values[idx] = point
			}
		}
	}
	return result
}

// funcEWMA calculates the Exponentially Weighted Moving Average
func funcEWMA(result *Result, alpha float64) *Result {
	if result.Type != RequestTypeTimeSeries {
		return result
	}

	timeSeriesData, ok := result.Value.(*TimeSeriesData)
	if !ok {
		return result
	}

	for _, aggregation := range timeSeriesData.Aggregations {
		for _, series := range aggregation.Series {
			var ewma float64
			var initialized bool

			for i, point := range series.Values {
				if !initialized {
					if !math.IsNaN(point.Value) {
						// Initialize EWMA with the first non-NaN value
						ewma = point.Value
						initialized = true
					}
					// Continue until the EWMA is initialized
					continue
				}

				if !math.IsNaN(point.Value) {
					// Update EWMA with the current value
					ewma = alpha*point.Value + (1-alpha)*ewma
				}
				// Set the EWMA value for the current point
				series.Values[i].Value = ewma
			}
		}
	}
	return result
}

// funcMedian3 returns the median of 3 points for each point in a series
func funcMedian3(result *Result) *Result {
	return funcMedianN(result, 3)
}

// funcMedian5 returns the median of 5 points for each point in a series
func funcMedian5(result *Result) *Result {
	return funcMedianN(result, 5)
}

// funcMedian7 returns the median of 7 points for each point in a series
func funcMedian7(result *Result) *Result {
	return funcMedianN(result, 7)
}

// funcMedianN returns the median of N points for each point in a series
func funcMedianN(result *Result, n int) *Result {
	if result.Type != RequestTypeTimeSeries {
		return result
	}

	timeSeriesData, ok := result.Value.(*TimeSeriesData)
	if !ok {
		return result
	}

	halfWindow := n / 2

	for _, aggregation := range timeSeriesData.Aggregations {
		for _, series := range aggregation.Series {
			medianValues := make([]*TimeSeriesValue, 0)

			for i := halfWindow; i < len(series.Values)-halfWindow; i++ {
				values := make([]float64, 0, n)

				// Add non-NaN values to the slice
				for j := -halfWindow; j <= halfWindow; j++ {
					if !math.IsNaN(series.Values[i+j].Value) {
						values = append(values, series.Values[i+j].Value)
					}
				}

				// Create a new point with median value
				newPoint := &TimeSeriesValue{
					Timestamp: series.Values[i].Timestamp,
				}

				// Handle the case where there are not enough values to calculate a median
				if len(values) == 0 {
					newPoint.Value = math.NaN()
				} else {
					newPoint.Value = median(values)
				}

				medianValues = append(medianValues, newPoint)
			}

			// Replace the series values with median values
			// Keep the original edge points unchanged
			for i := halfWindow; i < len(series.Values)-halfWindow; i++ {
				series.Values[i] = medianValues[i-halfWindow]
			}
		}
	}
	return result
}

// median calculates the median of a slice of float64 values
func median(values []float64) float64 {
	if len(values) == 0 {
		return math.NaN()
	}

	sort.Float64s(values)
	medianIndex := len(values) / 2
	if len(values)%2 == 0 {
		return (values[medianIndex-1] + values[medianIndex]) / 2
	}
	return values[medianIndex]
}

// funcTimeShift shifts all timestamps by the given amount (in seconds)
func funcTimeShift(result *Result, shift float64) *Result {
	if result.Type != RequestTypeTimeSeries {
		return result
	}

	timeSeriesData, ok := result.Value.(*TimeSeriesData)
	if !ok {
		return result
	}

	shiftMs := int64(shift * 1000) // Convert seconds to milliseconds

	for _, aggregation := range timeSeriesData.Aggregations {
		for _, series := range aggregation.Series {
			for idx, point := range series.Values {
				series.Values[idx].Timestamp = point.Timestamp + shiftMs
			}
		}
	}
	return result
}

// ApplyFunctions applies a list of functions sequentially to the result
func ApplyFunctions(functions []Function, result *Result) *Result {
	for _, fn := range functions {
		result = ApplyFunction(fn, result)
	}
	return result
}

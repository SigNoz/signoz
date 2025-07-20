package querybuildertypesv5

import (
	"math"
	"slices"
	"strconv"

	"github.com/SigNoz/signoz/pkg/valuer"
)

type FunctionName struct {
	valuer.String
}

var (
	FunctionNameCutOffMin     = FunctionName{valuer.NewString("cutOffMin")}
	FunctionNameCutOffMax     = FunctionName{valuer.NewString("cutOffMax")}
	FunctionNameClampMin      = FunctionName{valuer.NewString("clampMin")}
	FunctionNameClampMax      = FunctionName{valuer.NewString("clampMax")}
	FunctionNameAbsolute      = FunctionName{valuer.NewString("absolute")}
	FunctionNameRunningDiff   = FunctionName{valuer.NewString("runningDiff")}
	FunctionNameLog2          = FunctionName{valuer.NewString("log2")}
	FunctionNameLog10         = FunctionName{valuer.NewString("log10")}
	FunctionNameCumulativeSum = FunctionName{valuer.NewString("cumulativeSum")}
	FunctionNameEWMA3         = FunctionName{valuer.NewString("ewma3")}
	FunctionNameEWMA5         = FunctionName{valuer.NewString("ewma5")}
	FunctionNameEWMA7         = FunctionName{valuer.NewString("ewma7")}
	FunctionNameMedian3       = FunctionName{valuer.NewString("median3")}
	FunctionNameMedian5       = FunctionName{valuer.NewString("median5")}
	FunctionNameMedian7       = FunctionName{valuer.NewString("median7")}
	FunctionNameTimeShift     = FunctionName{valuer.NewString("timeShift")}
	FunctionNameAnomaly       = FunctionName{valuer.NewString("anomaly")}
	FunctionNameFillZero      = FunctionName{valuer.NewString("fillZero")}
)

// ApplyFunction applies the given function to the result data
func ApplyFunction(fn Function, result *TimeSeries) *TimeSeries {
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
		// Placeholder for anomaly detection as function that can be used in dashboards other than
		// the anomaly alert
		return result
	case FunctionNameFillZero:
		// fillZero expects 3 arguments: start, end, step (all in milliseconds)
		if len(args) < 3 {
			return result
		}
		start, err := parseFloat64Arg(args[0].Value)
		if err != nil {
			return result
		}
		end, err := parseFloat64Arg(args[1].Value)
		if err != nil {
			return result
		}
		step, err := parseFloat64Arg(args[2].Value)
		if err != nil || step <= 0 {
			return result
		}
		return funcFillZero(result, int64(start), int64(end), int64(step))
	}
	return result
}

// parseFloat64Arg parses an argument to float64
func parseFloat64Arg(value any) (float64, error) {
	switch v := value.(type) {
	case float64:
		return v, nil
	case int64:
		return float64(v), nil
	case int:
		return float64(v), nil
	case string:
		return strconv.ParseFloat(v, 64)
	default:
		return 0, strconv.ErrSyntax
	}
}

// getEWMAAlpha calculates the alpha value for EWMA functions
func getEWMAAlpha(name FunctionName, args []FunctionArg) float64 {
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
func funcCutOffMin(result *TimeSeries, threshold float64) *TimeSeries {
	for idx, point := range result.Values {
		if point.Value < threshold {
			point.Value = math.NaN()
		}
		result.Values[idx] = point
	}
	return result
}

// funcCutOffMax cuts off values above the threshold and replaces them with NaN
func funcCutOffMax(result *TimeSeries, threshold float64) *TimeSeries {
	for idx, point := range result.Values {
		if point.Value > threshold {
			point.Value = math.NaN()
		}
		result.Values[idx] = point
	}
	return result
}

// funcClampMin cuts off values below the threshold and replaces them with the threshold
func funcClampMin(result *TimeSeries, threshold float64) *TimeSeries {
	for idx, point := range result.Values {
		if point.Value < threshold {
			point.Value = threshold
		}
		result.Values[idx] = point
	}
	return result
}

// funcClampMax cuts off values above the threshold and replaces them with the threshold
func funcClampMax(result *TimeSeries, threshold float64) *TimeSeries {
	for idx, point := range result.Values {
		if point.Value > threshold {
			point.Value = threshold
		}
		result.Values[idx] = point
	}
	return result
}

// funcAbsolute returns the absolute value of each point
func funcAbsolute(result *TimeSeries) *TimeSeries {
	for idx, point := range result.Values {
		point.Value = math.Abs(point.Value)
		result.Values[idx] = point
	}
	return result
}

// funcRunningDiff returns the running difference of each point
func funcRunningDiff(result *TimeSeries) *TimeSeries {
	// iterate over the points in reverse order
	for idx := len(result.Values) - 1; idx >= 0; idx-- {
		if idx > 0 {
			result.Values[idx].Value = result.Values[idx].Value - result.Values[idx-1].Value
		}
	}
	// remove the first point
	result.Values = result.Values[1:]
	return result
}

// funcLog2 returns the log2 of each point
func funcLog2(result *TimeSeries) *TimeSeries {
	for idx, point := range result.Values {
		point.Value = math.Log2(point.Value)
		result.Values[idx] = point
	}
	return result
}

// funcLog10 returns the log10 of each point
func funcLog10(result *TimeSeries) *TimeSeries {
	for idx, point := range result.Values {
		point.Value = math.Log10(point.Value)
		result.Values[idx] = point
	}
	return result
}

// funcCumulativeSum returns the cumulative sum for each point in a series
func funcCumulativeSum(result *TimeSeries) *TimeSeries {
	var sum float64
	for idx, point := range result.Values {
		if !math.IsNaN(point.Value) {
			sum += point.Value
		}
		point.Value = sum
		result.Values[idx] = point
	}

	return result
}

// funcEWMA calculates the Exponentially Weighted Moving Average
func funcEWMA(result *TimeSeries, alpha float64) *TimeSeries {
	var ewma float64
	var initialized bool

	for i, point := range result.Values {
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
		result.Values[i].Value = ewma
	}
	return result
}

// funcMedian3 returns the median of 3 points for each point in a series
func funcMedian3(result *TimeSeries) *TimeSeries {
	return funcMedianN(result, 3)
}

// funcMedian5 returns the median of 5 points for each point in a series
func funcMedian5(result *TimeSeries) *TimeSeries {
	return funcMedianN(result, 5)
}

// funcMedian7 returns the median of 7 points for each point in a series
func funcMedian7(result *TimeSeries) *TimeSeries {
	return funcMedianN(result, 7)
}

// funcMedianN returns the median of N points for each point in a series
func funcMedianN(result *TimeSeries, n int) *TimeSeries {
	if len(result.Values) == 0 {
		return result
	}

	// For series shorter than window size, return original values
	if len(result.Values) < n {
		return result
	}

	halfWindow := n / 2
	newValues := make([]*TimeSeriesValue, len(result.Values))

	// Copy edge values that can't have a full window
	for i := 0; i < halfWindow; i++ {
		newValues[i] = &TimeSeriesValue{
			Timestamp: result.Values[i].Timestamp,
			Value:     result.Values[i].Value,
		}
	}
	for i := len(result.Values) - halfWindow; i < len(result.Values); i++ {
		newValues[i] = &TimeSeriesValue{
			Timestamp: result.Values[i].Timestamp,
			Value:     result.Values[i].Value,
		}
	}

	// Calculate median for points that have a full window
	for i := halfWindow; i < len(result.Values)-halfWindow; i++ {
		values := make([]float64, 0, n)

		// Add non-NaN values to the slice
		for j := -halfWindow; j <= halfWindow; j++ {
			if !math.IsNaN(result.Values[i+j].Value) {
				values = append(values, result.Values[i+j].Value)
			}
		}

		newValues[i] = &TimeSeriesValue{
			Timestamp: result.Values[i].Timestamp,
		}

		// Handle the case where there are not enough values to calculate a median
		if len(values) == 0 {
			newValues[i].Value = math.NaN()
		} else {
			newValues[i].Value = median(values)
		}
	}

	result.Values = newValues
	return result
}

// median calculates the median of a slice of float64 values
func median(values []float64) float64 {
	if len(values) == 0 {
		return math.NaN()
	}

	slices.Sort(values)
	medianIndex := len(values) / 2
	if len(values)%2 == 0 {
		return (values[medianIndex-1] + values[medianIndex]) / 2
	}
	return values[medianIndex]
}

// funcTimeShift shifts all timestamps by the given amount (in seconds)
func funcTimeShift(result *TimeSeries, shift float64) *TimeSeries {
	shiftMs := int64(shift * 1000) // Convert seconds to milliseconds

	for idx, point := range result.Values {
		point.Timestamp = point.Timestamp + shiftMs
		result.Values[idx] = point
	}

	return result
}

// funcFillZero fills gaps in time series with zeros at regular step intervals
// It takes start, end, and step parameters (all in milliseconds) to ensure consistent filling
func funcFillZero(result *TimeSeries, start, end, step int64) *TimeSeries {
	if step <= 0 {
		return result
	}

	alignedStart := start - (start % (step * 1000))
	alignedEnd := end

	existingValues := make(map[int64]*TimeSeriesValue)
	for _, v := range result.Values {
		existingValues[v.Timestamp] = v
	}

	filledValues := make([]*TimeSeriesValue, 0)

	for ts := alignedStart; ts <= alignedEnd; ts += step * 1000 {
		if val, exists := existingValues[ts]; exists {
			filledValues = append(filledValues, val)
		} else {
			filledValues = append(filledValues, &TimeSeriesValue{
				Timestamp: ts,
				Value:     0,
				Partial:   false,
			})
		}
	}

	result.Values = filledValues
	return result
}

// ApplyFunctions applies a list of functions sequentially to the result
func ApplyFunctions(functions []Function, result *TimeSeries) *TimeSeries {
	for _, fn := range functions {
		result = ApplyFunction(fn, result)
	}
	return result
}

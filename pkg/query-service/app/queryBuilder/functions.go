package queryBuilder

import (
	"math"
	"sort"

	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

// funcCutOffMin cuts off values below the threshold and replaces them with NaN
func funcCutOffMin(result *v3.Result, threshold float64) *v3.Result {
	for _, series := range result.Series {
		for idx, point := range series.Points {
			if point.Value < threshold {
				point.Value = math.NaN()
			}
			series.Points[idx] = point
		}
	}
	return result
}

// funcCutOffMax cuts off values above the threshold and replaces them with NaN
func funcCutOffMax(result *v3.Result, threshold float64) *v3.Result {
	for _, series := range result.Series {
		for idx, point := range series.Points {
			if point.Value > threshold {
				point.Value = math.NaN()
			}
			series.Points[idx] = point
		}
	}
	return result
}

// funcClampMin cuts off values below the threshold and replaces them with the threshold
func funcClampMin(result *v3.Result, threshold float64) *v3.Result {
	for _, series := range result.Series {
		for idx, point := range series.Points {
			if point.Value < threshold {
				point.Value = threshold
			}
			series.Points[idx] = point
		}
	}
	return result
}

// funcClampMax cuts off values above the threshold and replaces them with the threshold
func funcClampMax(result *v3.Result, threshold float64) *v3.Result {
	for _, series := range result.Series {
		for idx, point := range series.Points {
			if point.Value > threshold {
				point.Value = threshold
			}
			series.Points[idx] = point
		}
	}
	return result
}

// funcAbsolute returns the absolute value of each point
func funcAbsolute(result *v3.Result) *v3.Result {
	for _, series := range result.Series {
		for idx, point := range series.Points {
			point.Value = math.Abs(point.Value)
			series.Points[idx] = point
		}
	}
	return result
}

// funcRunningDiff returns the running difference of each point
func funcRunningDiff(result *v3.Result) *v3.Result {
	for _, series := range result.Series {
		// iterate over the point in reverse order
		for idx := len(series.Points) - 1; idx >= 0; idx-- {
			if idx > 0 {
				series.Points[idx].Value = series.Points[idx].Value - series.Points[idx-1].Value
			}
		}
		// remove the first point
		// the timerange is already adjusted in the query range
		series.Points = series.Points[1:]
	}
	return result
}

// funcLog2 returns the log2 of each point
func funcLog2(result *v3.Result) *v3.Result {
	for _, series := range result.Series {
		for idx, point := range series.Points {
			point.Value = math.Log2(point.Value)
			series.Points[idx] = point
		}
	}
	return result
}

// funcLog10 returns the log10 of each point
func funcLog10(result *v3.Result) *v3.Result {
	for _, series := range result.Series {
		for idx, point := range series.Points {
			point.Value = math.Log10(point.Value)
			series.Points[idx] = point
		}
	}
	return result
}

// funcCumSum returns the cumulative sum for each point in a series
func funcCumSum(result *v3.Result) *v3.Result {
	for _, series := range result.Series {
		var sum float64
		for idx, point := range series.Points {
			if !math.IsNaN(point.Value) {
				sum += point.Value
			}
			point.Value = sum
			series.Points[idx] = point
		}
	}
	return result
}

func funcEWMA(result *v3.Result, alpha float64) *v3.Result {
	for _, series := range result.Series {
		var ewma float64
		var initialized bool

		for i, point := range series.Points {
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
			series.Points[i].Value = ewma
		}
	}
	return result
}

// funcMedian3 returns the median of 3 points for each point in a series
func funcMedian3(result *v3.Result) *v3.Result {
	for _, series := range result.Series {
		median3 := make([]float64, 0)
		for i := 1; i < len(series.Points)-1; i++ {
			values := make([]float64, 0, 3)

			// Add non-NaN values to the slice
			for j := -1; j <= 1; j++ {
				if !math.IsNaN(series.Points[i+j].Value) {
					values = append(values, series.Points[i+j].Value)
				}
			}

			// Handle the case where there are not enough values to calculate a median
			if len(values) == 0 {
				median3 = append(median3, math.NaN())
				continue
			}

			median3 = append(median3, median(values))
		}

		// Set the median3 values for the series
		for i := 1; i < len(series.Points)-1; i++ {
			series.Points[i].Value = median3[i-1]
		}
	}
	return result
}

// funcMedian5 returns the median of 5 points for each point in a series
func funcMedian5(result *v3.Result) *v3.Result {
	for _, series := range result.Series {
		median5 := make([]float64, 0)
		for i := 2; i < len(series.Points)-2; i++ {
			values := make([]float64, 0, 5)

			// Add non-NaN values to the slice
			for j := -2; j <= 2; j++ {
				if !math.IsNaN(series.Points[i+j].Value) {
					values = append(values, series.Points[i+j].Value)
				}
			}

			// Handle the case where there are not enough values to calculate a median
			if len(values) == 0 {
				median5 = append(median5, math.NaN())
				continue
			}

			median5 = append(median5, median(values))
		}

		// Set the median5 values for the series
		for i := 2; i < len(series.Points)-2; i++ {
			series.Points[i].Value = median5[i-2]
		}
	}
	return result
}

// funcMedian7 returns the median of 7 points for each point in a series
func funcMedian7(result *v3.Result) *v3.Result {
	for _, series := range result.Series {
		median7 := make([]float64, 0)
		for i := 3; i < len(series.Points)-3; i++ {
			values := make([]float64, 0, 7)

			// Add non-NaN values to the slice
			for j := -3; j <= 3; j++ {
				if !math.IsNaN(series.Points[i+j].Value) {
					values = append(values, series.Points[i+j].Value)
				}
			}

			// Handle the case where there are not enough values to calculate a median
			if len(values) == 0 {
				median7 = append(median7, math.NaN())
				continue
			}

			median7 = append(median7, median(values))
		}

		// Set the median7 values for the series
		for i := 3; i < len(series.Points)-3; i++ {
			series.Points[i].Value = median7[i-3]
		}
	}
	return result
}

func median(values []float64) float64 {
	sort.Float64s(values)
	medianIndex := len(values) / 2
	if len(values)%2 == 0 {
		return (values[medianIndex-1] + values[medianIndex]) / 2
	}
	return values[medianIndex]
}

func ApplyFunction(fn v3.Function, result *v3.Result) *v3.Result {

	switch fn.Name {
	case v3.FunctionNameCutOffMin, v3.FunctionNameCutOffMax, v3.FunctionNameClampMin, v3.FunctionNameClampMax:
		threshold, ok := fn.Args[0].(float64)
		if !ok {
			return result
		}
		switch fn.Name {
		case v3.FunctionNameCutOffMin:
			return funcCutOffMin(result, threshold)
		case v3.FunctionNameCutOffMax:
			return funcCutOffMax(result, threshold)
		case v3.FunctionNameClampMin:
			return funcClampMin(result, threshold)
		case v3.FunctionNameClampMax:
			return funcClampMax(result, threshold)
		}
	case v3.FunctionNameAbsolute:
		return funcAbsolute(result)
	case v3.FunctionNameRunningDiff:
		return funcRunningDiff(result)
	case v3.FunctionNameLog2:
		return funcLog2(result)
	case v3.FunctionNameLog10:
		return funcLog10(result)
	case v3.FunctionNameCumSum:
		return funcCumSum(result)
	case v3.FunctionNameEWMA3, v3.FunctionNameEWMA5, v3.FunctionNameEWMA7:
		alpha, ok := fn.Args[0].(float64)
		if !ok {
			// alpha = 2 / (n + 1) where n is the window size
			if fn.Name == v3.FunctionNameEWMA3 {
				alpha = 0.5 // 2 / (3 + 1)
			} else if fn.Name == v3.FunctionNameEWMA5 {
				alpha = 1 / float64(3) // 2 / (5 + 1)
			} else if fn.Name == v3.FunctionNameEWMA7 {
				alpha = 0.25 // 2 / (7 + 1)
			}
		}
		return funcEWMA(result, alpha)
	case v3.FunctionNameMedian3:
		return funcMedian3(result)
	case v3.FunctionNameMedian5:
		return funcMedian5(result)
	case v3.FunctionNameMedian7:
		return funcMedian7(result)
	case v3.FunctionNameTimeShift:
		shift, ok := fn.Args[0].(float64)
		if !ok {
			return result
		}
		return funcTimeShift(result, shift)
	}
	return result
}

func funcTimeShift(result *v3.Result, shift float64) *v3.Result {
	for _, series := range result.Series {
		for idx, point := range series.Points {
			series.Points[idx].Timestamp = point.Timestamp + int64(shift)*1000
		}
	}
	return result
}

package queryBuilder

import (
	"math"

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

func funcAbsolute(result *v3.Result) *v3.Result {
	for _, series := range result.Series {
		for idx, point := range series.Points {
			point.Value = math.Abs(point.Value)
			series.Points[idx] = point
		}
	}
	return result
}

func funcLog2(result *v3.Result) *v3.Result {
	for _, series := range result.Series {
		for idx, point := range series.Points {
			point.Value = math.Log2(point.Value)
			series.Points[idx] = point
		}
	}
	return result
}

func funcLog10(result *v3.Result) *v3.Result {
	for _, series := range result.Series {
		for idx, point := range series.Points {
			point.Value = math.Log10(point.Value)
			series.Points[idx] = point
		}
	}
	return result
}

func funcCumSum(result *v3.Result) *v3.Result {
	for _, series := range result.Series {
		var sum float64
		for idx, point := range series.Points {
			sum += point.Value
			point.Value = sum
			series.Points[idx] = point
		}
	}
	return result
}

func funcEWMA3(result *v3.Result, alpha float64) *v3.Result {
	for _, series := range result.Series {
		var prev float64
		for _, point := range series.Points {
			if math.IsNaN(prev) {
				point.Value = point.Value
			} else {
				point.Value = alpha*point.Value + (1-alpha)*prev
			}
			prev = point.Value
		}
	}
	return result
}

func funcEWMA5(result *v3.Result, alpha float64) *v3.Result {
	for _, series := range result.Series {
		var prev float64
		var prevprev float64
		for _, point := range series.Points {
			if math.IsNaN(prev) {
				point.Value = point.Value
			} else {
				point.Value = alpha*point.Value + (1-alpha)*prev + (1-alpha)*(1-alpha)*prevprev
			}
			prevprev = prev
			prev = point.Value
		}
	}
	return result
}

func funcEWMA7(result *v3.Result, alpha float64) *v3.Result {

	for _, series := range result.Series {
		var prev float64
		var prevprev float64
		var prevprevprev float64
		for _, point := range series.Points {
			if math.IsNaN(prev) {
				point.Value = point.Value
			} else {
				point.Value = alpha*point.Value + (1-alpha)*prev + (1-alpha)*(1-alpha)*prevprev + (1-alpha)*(1-alpha)*(1-alpha)*prevprevprev
			}
			prevprevprev = prevprev
			prevprev = prev
			prev = point.Value
		}
	}
	return result
}

func funcMedian3(result *v3.Result) *v3.Result {
	for _, series := range result.Series {
		for i := 1; i < len(series.Points)-1; i++ {
			point := series.Points[i]
			point.Value = (series.Points[i-1].Value + series.Points[i].Value + series.Points[i+1].Value) / 3
		}
	}
	return result
}

func funcMedian5(result *v3.Result) *v3.Result {
	for _, series := range result.Series {
		for i := 2; i < len(series.Points)-2; i++ {
			point := series.Points[i]
			point.Value = (series.Points[i-2].Value + series.Points[i-1].Value + series.Points[i].Value + series.Points[i+1].Value + series.Points[i+2].Value) / 5
		}
	}
	return result
}

func funcMedian7(result *v3.Result) *v3.Result {
	for _, series := range result.Series {
		for i := 3; i < len(series.Points)-3; i++ {
			point := series.Points[i]
			point.Value = (series.Points[i-3].Value + series.Points[i-2].Value + series.Points[i-1].Value + series.Points[i].Value + series.Points[i+1].Value + series.Points[i+2].Value + series.Points[i+3].Value) / 7
		}
	}
	return result
}

func ApplyFunction(fn v3.Function, result *v3.Result) *v3.Result {

	switch fn.Name {
	case "cutOffMin", "cutOffMax", "clampMin", "clampMax":
		threshold, ok := fn.Args[0].(float64)
		if !ok {
			return result
		}
		switch fn.Name {
		case "cutOffMin":
			return funcCutOffMin(result, threshold)
		case "cutOffMax":
			return funcCutOffMax(result, threshold)
		case "clampMin":
			return funcClampMin(result, threshold)
		case "clampMax":
			return funcClampMax(result, threshold)
		}
	case "absolute":
		return funcAbsolute(result)
	case "log2":
		return funcLog2(result)
	case "log10":
		return funcLog10(result)
	case "cumSum":
		return funcCumSum(result)
	case "ewma3", "ewma5", "ewma7":
		alpha, ok := fn.Args[0].(float64)
		if !ok {
			alpha = 0.5
		}
		switch fn.Name {
		case "ewma3":
			return funcEWMA3(result, alpha)
		case "ewma5":
			return funcEWMA5(result, alpha)
		case "ewma7":
			return funcEWMA7(result, alpha)
		}
	case "median3":
		return funcMedian3(result)
	case "median5":
		return funcMedian5(result)
	case "median7":
		return funcMedian7(result)
	}
	return result
}

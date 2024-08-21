package postprocess

import (
	"fmt"
	"math"
	"sort"
	"time"

	"github.com/SigNoz/govaluate"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

// Define the ExpressionEvalFunc type
type ExpressionEvalFunc func(*govaluate.EvaluableExpression, map[string]float64) float64

// Helper function to check if one label set is a subset of another
func isSubset(super, sub map[string]string) bool {
	for k, v := range sub {
		if val, ok := super[k]; !ok || val != v {
			return false
		}
	}
	return true
}

// Function to find unique label sets
func findUniqueLabelSets(results []*v3.Result, queriesInExpression map[string]struct{}) []map[string]string {
	allLabelSets := make([]map[string]string, 0)
	// The size of the `results` small, It is the number of queries in the request
	for _, result := range results {
		if _, ok := queriesInExpression[result.QueryName]; !ok {
			continue
		}
		// The size of the `result.Series` slice is usually small, It is the number of series in the query result.
		// We will limit the number of series in the query result to order of 100-1000.
		for _, series := range result.Series {
			allLabelSets = append(allLabelSets, series.Labels)
		}
	}

	// sort the label sets by the number of labels in descending order
	sort.Slice(allLabelSets, func(i, j int) bool {
		return len(allLabelSets[i]) > len(allLabelSets[j])
	})

	uniqueSets := make([]map[string]string, 0)

	for _, labelSet := range allLabelSets {
		// If the label set is not a subset of any of the unique label sets, add it to the unique label sets
		isUnique := true
		for _, uniqueLabelSet := range uniqueSets {
			if isSubset(uniqueLabelSet, labelSet) {
				isUnique = false
				break
			}
		}
		if isUnique {
			uniqueSets = append(uniqueSets, labelSet)
		}
	}

	return uniqueSets
}

// Function to join series on timestamp and calculate new values
func joinAndCalculate(
	results []*v3.Result,
	uniqueLabelSet map[string]string,
	expression *govaluate.EvaluableExpression,
	canDefaultZero map[string]bool,
) (*v3.Series, error) {

	uniqueTimestamps := make(map[int64]struct{})
	// map[queryName]map[timestamp]value
	seriesMap := make(map[string]map[int64]float64)
	for _, result := range results {
		var matchingSeries *v3.Series
		// We try to find a series that matches the label set from the current query result
		for _, series := range result.Series {
			if isSubset(uniqueLabelSet, series.Labels) {
				matchingSeries = series
				break
			}
		}

		// Prepare the seriesMap for quick lookup during evaluation
		// seriesMap[queryName][timestamp]value contains the value of the series with the given queryName at the given timestamp
		if matchingSeries != nil {
			for _, point := range matchingSeries.Points {
				if _, ok := seriesMap[result.QueryName]; !ok {
					seriesMap[result.QueryName] = make(map[int64]float64)
				}
				seriesMap[result.QueryName][point.Timestamp] = point.Value
				uniqueTimestamps[point.Timestamp] = struct{}{}
			}
		}
	}

	resultSeries := &v3.Series{
		Labels: uniqueLabelSet,
		Points: make([]v3.Point, 0),
	}
	timestamps := make([]int64, 0)
	for timestamp := range uniqueTimestamps {
		timestamps = append(timestamps, timestamp)
	}
	sort.Slice(timestamps, func(i, j int) bool {
		return timestamps[i] < timestamps[j]
	})

	for _, timestamp := range timestamps {
		values := make(map[string]interface{})
		for queryName, series := range seriesMap {
			if _, ok := series[timestamp]; ok {
				values[queryName] = series[timestamp]
			}
		}

		// If the value is not present in the values map, set it to 0
		for _, v := range expression.Vars() {
			if _, ok := values[v]; !ok && canDefaultZero[v] {
				values[v] = 0
			}
		}

		canEval := true

		for _, v := range expression.Vars() {
			if _, ok := values[v]; !ok {
				canEval = false
			}
		}

		if !canEval {
			// not enough values for expression evaluation
			continue
		}

		newValue, err := expression.Evaluate(values)
		if err != nil {
			return nil, err
		}

		val, ok := newValue.(float64)
		if !ok {
			return nil, fmt.Errorf("expected float64, got %T", newValue)
		}

		if math.IsNaN(val) || math.IsInf(val, 0) {
			continue
		}

		resultSeries.Points = append(resultSeries.Points, v3.Point{
			Timestamp: timestamp,
			Value:     val,
		})
	}
	return resultSeries, nil
}

// Main function to process the Results
// A series can be "join"ed with other series if they have the same label set or one is a subset of the other.
// 1. Find all unique label sets
// 2. For each unique label set, find a series that matches the label set from each query result
// 3. Join the series on timestamp and calculate the new values
// 4. Return the new series
func processResults(
	results []*v3.Result,
	expression *govaluate.EvaluableExpression,
	canDefaultZero map[string]bool,
) (*v3.Result, error) {

	queriesInExpression := make(map[string]struct{})
	for _, v := range expression.Vars() {
		queriesInExpression[v] = struct{}{}
	}
	uniqueLabelSets := findUniqueLabelSets(results, queriesInExpression)
	newSeries := make([]*v3.Series, 0)

	for _, labelSet := range uniqueLabelSets {
		series, err := joinAndCalculate(results, labelSet, expression, canDefaultZero)
		if err != nil {
			return nil, err
		}
		if series != nil && len(series.Points) != 0 {
			labelsArray := make([]map[string]string, 0)
			for k, v := range series.Labels {
				labelsArray = append(labelsArray, map[string]string{k: v})
			}
			series.LabelsArray = labelsArray
			newSeries = append(newSeries, series)
		}
	}

	return &v3.Result{
		Series: newSeries,
	}, nil
}

var SupportedFunctions = []string{"exp", "log", "ln", "exp2", "log2", "exp10", "log10", "sqrt", "cbrt", "erf", "erfc", "lgamma", "tgamma", "sin", "cos", "tan", "asin", "acos", "atan", "degrees", "radians", "now", "toUnixTimestamp"}

func EvalFuncs() map[string]govaluate.ExpressionFunction {
	GoValuateFuncs := make(map[string]govaluate.ExpressionFunction)
	// Returns e to the power of the given argument.
	GoValuateFuncs["exp"] = func(args ...interface{}) (interface{}, error) {
		return math.Exp(args[0].(float64)), nil
	}
	// Returns the natural logarithm of the given argument.
	GoValuateFuncs["log"] = func(args ...interface{}) (interface{}, error) {
		return math.Log(args[0].(float64)), nil
	}
	// Returns the natural logarithm of the given argument.
	GoValuateFuncs["ln"] = func(args ...interface{}) (interface{}, error) {
		return math.Log(args[0].(float64)), nil
	}
	// Returns the base 2 exponential of the given argument.
	GoValuateFuncs["exp2"] = func(args ...interface{}) (interface{}, error) {
		return math.Exp2(args[0].(float64)), nil
	}
	// Returns the base 2 logarithm of the given argument.
	GoValuateFuncs["log2"] = func(args ...interface{}) (interface{}, error) {
		return math.Log2(args[0].(float64)), nil
	}
	// Returns the base 10 exponential of the given argument.
	GoValuateFuncs["exp10"] = func(args ...interface{}) (interface{}, error) {
		return math.Pow10(int(args[0].(float64))), nil
	}
	// Returns the base 10 logarithm of the given argument.
	GoValuateFuncs["log10"] = func(args ...interface{}) (interface{}, error) {
		return math.Log10(args[0].(float64)), nil
	}
	// Returns the square root of the given argument.
	GoValuateFuncs["sqrt"] = func(args ...interface{}) (interface{}, error) {
		return math.Sqrt(args[0].(float64)), nil
	}
	// Returns the cube root of the given argument.
	GoValuateFuncs["cbrt"] = func(args ...interface{}) (interface{}, error) {
		return math.Cbrt(args[0].(float64)), nil
	}
	// Returns the error function of the given argument.
	GoValuateFuncs["erf"] = func(args ...interface{}) (interface{}, error) {
		return math.Erf(args[0].(float64)), nil
	}
	// Returns the complementary error function of the given argument.
	GoValuateFuncs["erfc"] = func(args ...interface{}) (interface{}, error) {
		return math.Erfc(args[0].(float64)), nil
	}
	// Returns the natural logarithm of the absolute value of the gamma function of the given argument.
	GoValuateFuncs["lgamma"] = func(args ...interface{}) (interface{}, error) {
		v, _ := math.Lgamma(args[0].(float64))
		return v, nil
	}
	// Returns the gamma function of the given argument.
	GoValuateFuncs["tgamma"] = func(args ...interface{}) (interface{}, error) {
		return math.Gamma(args[0].(float64)), nil
	}
	// Returns the sine of the given argument.
	GoValuateFuncs["sin"] = func(args ...interface{}) (interface{}, error) {
		return math.Sin(args[0].(float64)), nil
	}
	// Returns the cosine of the given argument.
	GoValuateFuncs["cos"] = func(args ...interface{}) (interface{}, error) {
		return math.Cos(args[0].(float64)), nil
	}
	// Returns the tangent of the given argument.
	GoValuateFuncs["tan"] = func(args ...interface{}) (interface{}, error) {
		return math.Tan(args[0].(float64)), nil
	}
	// Returns the arcsine of the given argument.
	GoValuateFuncs["asin"] = func(args ...interface{}) (interface{}, error) {
		return math.Asin(args[0].(float64)), nil
	}
	// Returns the arccosine of the given argument.
	GoValuateFuncs["acos"] = func(args ...interface{}) (interface{}, error) {
		return math.Acos(args[0].(float64)), nil
	}
	// Returns the arctangent of the given argument.
	GoValuateFuncs["atan"] = func(args ...interface{}) (interface{}, error) {
		return math.Atan(args[0].(float64)), nil
	}
	// Returns the argument converted from radians to degrees.
	GoValuateFuncs["degrees"] = func(args ...interface{}) (interface{}, error) {
		return args[0].(float64) * 180 / math.Pi, nil
	}
	// Returns the argument converted from degrees to radians.
	GoValuateFuncs["radians"] = func(args ...interface{}) (interface{}, error) {
		return args[0].(float64) * math.Pi / 180, nil
	}
	// Returns the current Unix timestamp in seconds.
	GoValuateFuncs["now"] = func(args ...interface{}) (interface{}, error) {
		return float64(time.Now().Unix()), nil
	}

	return GoValuateFuncs
}

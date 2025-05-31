package querybuildertypesv5

import (
	"fmt"
	"math"
	"sort"
	"time"

	"github.com/SigNoz/govaluate"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

type QueryBuilderFormula struct {
	// name of the formula
	Name string `json:"name"`
	// expression to apply to the query
	Expression string `json:"expression"`

	// functions to apply to the formula result
	Functions []Function `json:"functions,omitempty"`
}

// FormulaEvaluator handles formula evaluation for QBv5 types
type FormulaEvaluator struct {
	expression     *govaluate.EvaluableExpression
	canDefaultZero map[string]bool
	functions      map[string]govaluate.ExpressionFunction
}

// NewFormulaEvaluator creates a new formula evaluator
func NewFormulaEvaluator(expressionStr string, canDefaultZero map[string]bool) (*FormulaEvaluator, error) {
	functions := EvalFuncs()
	expression, err := govaluate.NewEvaluableExpressionWithFunctions(expressionStr, functions)
	if err != nil {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "failed to parse expression: %s, error: %s", expressionStr, err.Error())
	}

	return &FormulaEvaluator{
		expression:     expression,
		canDefaultZero: canDefaultZero,
		functions:      functions,
	}, nil
}

// EvaluateFormula processes multiple time series data and evaluates the formula
func (fe *FormulaEvaluator) EvaluateFormula(timeSeriesData map[string]*TimeSeriesData) (*TimeSeriesData, error) {
	// Convert TimeSeriesData to a flattened series map for processing
	allSeries := fe.flattenTimeSeriesData(timeSeriesData)

	// Find unique label sets for formula evaluation
	uniqueLabelSets := fe.findUniqueLabelSets(allSeries)

	// Process each unique label set
	var resultSeries []*TimeSeries
	for _, labelSet := range uniqueLabelSets {
		series, err := fe.joinAndCalculate(allSeries, labelSet)
		if err != nil {
			return nil, err
		}
		if series != nil && len(series.Values) > 0 {
			resultSeries = append(resultSeries, series)
		}
	}

	return &TimeSeriesData{
		QueryName: "formula",
		Aggregations: []*AggregationBucket{
			{
				Index:  0,
				Alias:  "formula_result",
				Series: resultSeries,
			},
		},
	}, nil
}

// flattenTimeSeriesData converts map of TimeSeriesData to a flat map of series by query name
func (fe *FormulaEvaluator) flattenTimeSeriesData(timeSeriesData map[string]*TimeSeriesData) map[string][]*TimeSeries {
	result := make(map[string][]*TimeSeries)

	for queryName, data := range timeSeriesData {
		var allSeries []*TimeSeries
		for _, bucket := range data.Aggregations {
			allSeries = append(allSeries, bucket.Series...)
		}
		result[queryName] = allSeries
	}

	return result
}

// findUniqueLabelSets finds all unique label combinations across series that are referenced in the expression
func (fe *FormulaEvaluator) findUniqueLabelSets(allSeries map[string][]*TimeSeries) []map[string]string {
	queriesInExpression := make(map[string]struct{})
	for _, v := range fe.expression.Vars() {
		queriesInExpression[v] = struct{}{}
	}

	var allLabelSets []map[string]string

	// Collect all label sets from series that are referenced in the expression
	for queryName, series := range allSeries {
		if _, ok := queriesInExpression[queryName]; !ok {
			continue
		}

		for _, s := range series {
			labelMap := fe.labelsToMap(s.Labels)
			allLabelSets = append(allLabelSets, labelMap)
		}
	}

	// Sort by number of labels (descending) for subset detection optimization
	sort.Slice(allLabelSets, func(i, j int) bool {
		return len(allLabelSets[i]) > len(allLabelSets[j])
	})

	// Find unique label sets (remove subsets)
	var uniqueSets []map[string]string
	for _, labelSet := range allLabelSets {
		isUnique := true
		for _, uniqueLabelSet := range uniqueSets {
			if fe.isSubset(uniqueLabelSet, labelSet) {
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

// joinAndCalculate joins series with matching labels and evaluates the formula at each timestamp
func (fe *FormulaEvaluator) joinAndCalculate(allSeries map[string][]*TimeSeries, uniqueLabelSet map[string]string) (*TimeSeries, error) {
	// Map to store values: queryName -> timestamp -> value
	seriesMap := make(map[string]map[int64]float64)
	uniqueTimestamps := make(map[int64]struct{})

	// Find matching series for each query and build lookup maps
	for queryName, seriesList := range allSeries {
		var matchingSeries *TimeSeries

		// Find a series that matches the current label set
		for _, series := range seriesList {
			seriesLabelMap := fe.labelsToMap(series.Labels)
			if fe.isSubset(uniqueLabelSet, seriesLabelMap) {
				matchingSeries = series
				break
			}
		}

		// Build timestamp -> value mapping for quick lookup
		if matchingSeries != nil {
			if _, ok := seriesMap[queryName]; !ok {
				seriesMap[queryName] = make(map[int64]float64)
			}

			for _, point := range matchingSeries.Values {
				seriesMap[queryName][point.Timestamp] = point.Value
				uniqueTimestamps[point.Timestamp] = struct{}{}
			}
		}
	}

	// Convert unique timestamps to sorted slice
	timestamps := make([]int64, 0, len(uniqueTimestamps))
	for timestamp := range uniqueTimestamps {
		timestamps = append(timestamps, timestamp)
	}
	sort.Slice(timestamps, func(i, j int) bool {
		return timestamps[i] < timestamps[j]
	})

	// Evaluate formula at each timestamp
	var resultValues []*TimeSeriesValue
	for _, timestamp := range timestamps {
		values := make(map[string]interface{})

		// Collect values for this timestamp
		for queryName, series := range seriesMap {
			if value, ok := series[timestamp]; ok {
				values[queryName] = value
			}
		}

		// Set default zeros where allowed
		for _, variable := range fe.expression.Vars() {
			if _, ok := values[variable]; !ok && fe.canDefaultZero[variable] {
				values[variable] = 0.0
			}
		}

		// Check if we have all required variables
		canEvaluate := true
		for _, variable := range fe.expression.Vars() {
			if _, ok := values[variable]; !ok {
				canEvaluate = false
				break
			}
		}

		if !canEvaluate {
			continue
		}

		// Evaluate the expression
		result, err := fe.expression.Evaluate(values)
		if err != nil {
			return nil, fmt.Errorf("expression evaluation failed at timestamp %d: %w", timestamp, err)
		}

		value, ok := result.(float64)
		if !ok {
			return nil, fmt.Errorf("expression result is not float64: %T", result)
		}

		// Skip invalid values
		if math.IsNaN(value) || math.IsInf(value, 0) {
			continue
		}

		resultValues = append(resultValues, &TimeSeriesValue{
			Timestamp: timestamp,
			Value:     value,
		})
	}

	// Convert label map back to Label slice
	resultLabels := fe.mapToLabels(uniqueLabelSet)

	return &TimeSeries{
		Labels: resultLabels,
		Values: resultValues,
	}, nil
}

// Helper functions

// isSubset checks if 'sub' is a subset of 'super'
func (fe *FormulaEvaluator) isSubset(super, sub map[string]string) bool {
	for k, v := range sub {
		if val, ok := super[k]; !ok || val != v {
			return false
		}
	}
	return true
}

// labelsToMap converts Label slice to map for easier comparison
func (fe *FormulaEvaluator) labelsToMap(labels []*Label) map[string]string {
	result := make(map[string]string)
	for _, label := range labels {
		if strVal, ok := label.Value.(string); ok {
			result[label.Key.Name] = strVal
		} else {
			result[label.Key.Name] = convertValueToString(label.Value)
		}
	}
	return result
}

// mapToLabels converts map back to Label slice
func (fe *FormulaEvaluator) mapToLabels(labelMap map[string]string) []*Label {
	var labels []*Label
	for key, value := range labelMap {
		labels = append(labels, &Label{
			Key: telemetrytypes.TelemetryFieldKey{
				Name:          key,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
			Value: value,
		})
	}
	return labels
}

// EvalFuncs returns the supported mathematical functions for formula evaluation
func EvalFuncs() map[string]govaluate.ExpressionFunction {
	funcs := make(map[string]govaluate.ExpressionFunction)

	// Mathematical functions
	funcs["exp"] = func(args ...interface{}) (interface{}, error) {
		return math.Exp(args[0].(float64)), nil
	}
	funcs["log"] = func(args ...interface{}) (interface{}, error) {
		return math.Log(args[0].(float64)), nil
	}
	funcs["ln"] = func(args ...interface{}) (interface{}, error) {
		return math.Log(args[0].(float64)), nil
	}
	funcs["exp2"] = func(args ...interface{}) (interface{}, error) {
		return math.Exp2(args[0].(float64)), nil
	}
	funcs["log2"] = func(args ...interface{}) (interface{}, error) {
		return math.Log2(args[0].(float64)), nil
	}
	funcs["exp10"] = func(args ...interface{}) (interface{}, error) {
		return math.Pow10(int(args[0].(float64))), nil
	}
	funcs["log10"] = func(args ...interface{}) (interface{}, error) {
		return math.Log10(args[0].(float64)), nil
	}
	funcs["sqrt"] = func(args ...interface{}) (interface{}, error) {
		return math.Sqrt(args[0].(float64)), nil
	}
	funcs["cbrt"] = func(args ...interface{}) (interface{}, error) {
		return math.Cbrt(args[0].(float64)), nil
	}
	funcs["erf"] = func(args ...interface{}) (interface{}, error) {
		return math.Erf(args[0].(float64)), nil
	}
	funcs["erfc"] = func(args ...interface{}) (interface{}, error) {
		return math.Erfc(args[0].(float64)), nil
	}
	funcs["lgamma"] = func(args ...interface{}) (interface{}, error) {
		v, _ := math.Lgamma(args[0].(float64))
		return v, nil
	}
	funcs["tgamma"] = func(args ...interface{}) (interface{}, error) {
		return math.Gamma(args[0].(float64)), nil
	}

	// Trigonometric functions
	funcs["sin"] = func(args ...interface{}) (interface{}, error) {
		return math.Sin(args[0].(float64)), nil
	}
	funcs["cos"] = func(args ...interface{}) (interface{}, error) {
		return math.Cos(args[0].(float64)), nil
	}
	funcs["tan"] = func(args ...interface{}) (interface{}, error) {
		return math.Tan(args[0].(float64)), nil
	}
	funcs["asin"] = func(args ...interface{}) (interface{}, error) {
		return math.Asin(args[0].(float64)), nil
	}
	funcs["acos"] = func(args ...interface{}) (interface{}, error) {
		return math.Acos(args[0].(float64)), nil
	}
	funcs["atan"] = func(args ...interface{}) (interface{}, error) {
		return math.Atan(args[0].(float64)), nil
	}

	// Utility functions
	funcs["degrees"] = func(args ...interface{}) (interface{}, error) {
		return args[0].(float64) * 180 / math.Pi, nil
	}
	funcs["radians"] = func(args ...interface{}) (interface{}, error) {
		return args[0].(float64) * math.Pi / 180, nil
	}
	funcs["now"] = func(args ...interface{}) (interface{}, error) {
		return float64(time.Now().Unix()), nil
	}

	return funcs
}

// GetSupportedFunctions returns the list of supported function names
func GetSupportedFunctions() []string {
	return []string{
		"exp", "log", "ln", "exp2", "log2", "exp10", "log10",
		"sqrt", "cbrt", "erf", "erfc", "lgamma", "tgamma",
		"sin", "cos", "tan", "asin", "acos", "atan",
		"degrees", "radians", "now",
	}
}

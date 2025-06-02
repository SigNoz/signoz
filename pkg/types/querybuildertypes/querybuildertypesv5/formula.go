package querybuildertypesv5

import (
	"fmt"
	"math"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"slices"

	"github.com/SigNoz/govaluate"
	"github.com/SigNoz/signoz/pkg/errors"
)

type QueryBuilderFormula struct {
	// name of the formula
	Name string `json:"name"`
	// expression to apply to the query
	Expression string `json:"expression"`

	// functions to apply to the formula result
	Functions []Function `json:"functions,omitempty"`
}

type aggregationRef struct {
	QueryName string
	Index     *int    // Index-based reference (e.g., A.0)
	Alias     *string // Alias-based reference (e.g., A.my_alias)
}

// seriesLookup provides lookup for series data
type seriesLookup struct {
	// seriesKey -> timestamp -> value
	data map[string]map[int64]float64
	// seriesKey -> original series for metadata preservation
	seriesMetadata map[string]*TimeSeries
}

// FormulaEvaluator handles formula evaluation b/w time series from different aggregations
type FormulaEvaluator struct {
	expression     *govaluate.EvaluableExpression
	variables      []string
	canDefaultZero map[string]bool

	// Parsed aggregation references from variables
	aggRefs map[string]aggregationRef

	timestampPool sync.Pool
	valuesPool    sync.Pool
}

// NewFormulaEvaluator creates a formula evaluator
func NewFormulaEvaluator(expressionStr string, canDefaultZero map[string]bool) (*FormulaEvaluator, error) {
	functions := EvalFuncs()
	expression, err := govaluate.NewEvaluableExpressionWithFunctions(expressionStr, functions)
	if err != nil {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "failed to parse expression")
	}

	evaluator := &FormulaEvaluator{
		expression:     expression,
		variables:      expression.Vars(),
		canDefaultZero: canDefaultZero,
		aggRefs:        make(map[string]aggregationRef),
	}

	// Parse aggregation references from variables
	for _, variable := range evaluator.variables {
		aggRef, err := parseAggregationReference(variable)
		if err != nil {
			return nil, err
		}
		evaluator.aggRefs[variable] = aggRef
	}

	evaluator.timestampPool.New = func() any {
		return make([]int64, 0, 1000)
	}
	evaluator.valuesPool.New = func() any {
		return make(map[string]any, len(evaluator.variables))
	}

	return evaluator, nil
}

// parseAggregationReference parses variable names like "A", "A.0", "A.my_alias"
func parseAggregationReference(variable string) (aggregationRef, error) {
	parts := strings.Split(variable, ".")

	if len(parts) == 1 {
		// Simple query reference like "A" - defaults to first aggregation (index 0)
		defaultIndex := 0
		return aggregationRef{
			QueryName: parts[0],
			Index:     &defaultIndex,
		}, nil
	}

	if len(parts) == 2 {
		queryName := parts[0]
		reference := parts[1]

		// Try to parse as index
		if index, err := strconv.Atoi(reference); err == nil {
			return aggregationRef{
				QueryName: queryName,
				Index:     &index,
			}, nil
		}

		// Otherwise treat as alias
		return aggregationRef{
			QueryName: queryName,
			Alias:     &reference,
		}, nil
	}

	return aggregationRef{}, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid aggregation reference %q", variable)
}

// EvaluateFormula processes multiple time series with proper aggregation handling
func (fe *FormulaEvaluator) EvaluateFormula(timeSeriesData map[string]*TimeSeriesData) ([]*TimeSeries, error) {
	// Build lookup structures for all referenced aggregations
	lookup := fe.buildSeriesLookup(timeSeriesData)

	// Find all unique label combinations across referenced series
	uniqueLabelSets := fe.findUniqueLabelSets(lookup)

	// Process each unique label set
	var resultSeries []*TimeSeries
	var wg sync.WaitGroup
	resultChan := make(chan *TimeSeries, len(uniqueLabelSets))
	semaphore := make(chan struct{}, 4) // Limit concurrency

	for _, labelSet := range uniqueLabelSets {
		wg.Add(1)
		go func(labels []*Label) {
			defer wg.Done()
			semaphore <- struct{}{}
			defer func() { <-semaphore }()

			series := fe.evaluateForLabelSet(labels, lookup)
			if series != nil && len(series.Values) > 0 {
				resultChan <- series
			}
		}(labelSet)
	}

	go func() {
		wg.Wait()
		close(resultChan)
	}()

	for series := range resultChan {
		resultSeries = append(resultSeries, series)
	}

	return resultSeries, nil
}

// buildSeriesLookup creates lookup structure for all referenced aggregations
func (fe *FormulaEvaluator) buildSeriesLookup(timeSeriesData map[string]*TimeSeriesData) *seriesLookup {
	lookup := &seriesLookup{
		data:           make(map[string]map[int64]float64),
		seriesMetadata: make(map[string]*TimeSeries),
	}

	for variable, aggRef := range fe.aggRefs {
		data, exists := timeSeriesData[aggRef.QueryName]
		if !exists {
			continue
		}

		// Find the specific aggregation bucket
		var targetBucket *AggregationBucket
		for _, bucket := range data.Aggregations {
			if aggRef.Index != nil && bucket.Index == *aggRef.Index {
				targetBucket = bucket
				break
			}
			if aggRef.Alias != nil && bucket.Alias == *aggRef.Alias {
				targetBucket = bucket
				break
			}
		}

		if targetBucket == nil {
			continue
		}

		// Process all series in the target bucket
		for seriesIdx, series := range targetBucket.Series {
			seriesKey := fe.buildSeriesKey(variable, seriesIdx, series.Labels)

			// Initialize timestamp map
			if _, exists := lookup.data[seriesKey]; !exists {
				lookup.data[seriesKey] = make(map[int64]float64, len(series.Values))
				lookup.seriesMetadata[seriesKey] = series
			}

			// Store all timestamp-value pairs
			for _, value := range series.Values {
				lookup.data[seriesKey][value.Timestamp] = value.Value
			}
		}
	}

	return lookup
}

// buildSeriesKey creates a unique key for a series within a specific aggregation
func (fe *FormulaEvaluator) buildSeriesKey(variable string, seriesIndex int, labels []*Label) string {
	// Create a deterministic key that includes variable and label information
	var keyParts []string
	keyParts = append(keyParts, variable)
	keyParts = append(keyParts, strconv.Itoa(seriesIndex))

	// Sort labels by key name for consistent ordering
	sortedLabels := make([]*Label, len(labels))
	copy(sortedLabels, labels)
	sort.Slice(sortedLabels, func(i, j int) bool {
		return sortedLabels[i].Key.Name < sortedLabels[j].Key.Name
	})

	for _, label := range sortedLabels {
		keyParts = append(keyParts, fmt.Sprintf("%s=%v", label.Key.Name, label.Value))
	}

	return strings.Join(keyParts, "|")
}

// findUniqueLabelSets finds all unique label combinations across all referenced series
func (fe *FormulaEvaluator) findUniqueLabelSets(lookup *seriesLookup) [][]*Label {
	var allLabelSets [][]*Label

	// Collect all label sets from series metadata
	for _, series := range lookup.seriesMetadata {
		allLabelSets = append(allLabelSets, series.Labels)
	}

	// sort the label sets by the number of labels in descending order
	sort.Slice(allLabelSets, func(i, j int) bool {
		return len(allLabelSets[i]) > len(allLabelSets[j])
	})

	// Find unique label sets using proper label comparison
	var uniqueSets [][]*Label
	for _, labelSet := range allLabelSets {
		isUnique := true
		for _, uniqueSet := range uniqueSets {
			if fe.isSubset(uniqueSet, labelSet) {
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

func (fe *FormulaEvaluator) isSubset(labels1, labels2 []*Label) bool {
	labelMap1 := make(map[string]any)
	labelMap2 := make(map[string]any)

	for _, label := range labels1 {
		labelMap1[label.Key.Name] = label.Value
	}
	for _, label := range labels2 {
		labelMap2[label.Key.Name] = label.Value
	}

	for k, v := range labelMap2 {
		if val, ok := labelMap1[k]; !ok || val != v {
			return false
		}
	}
	return true
}

// labelsEqual compares two label sets for equality
func (fe *FormulaEvaluator) labelsEqual(labels1, labels2 []*Label) bool {
	if len(labels1) != len(labels2) {
		return false
	}

	// Create maps for comparison
	map1 := make(map[string]any)
	map2 := make(map[string]any)

	for _, label := range labels1 {
		map1[label.Key.Name] = label.Value
	}
	for _, label := range labels2 {
		map2[label.Key.Name] = label.Value
	}

	if len(map1) != len(map2) {
		return false
	}

	for k, v1 := range map1 {
		if v2, exists := map2[k]; !exists || v1 != v2 {
			return false
		}
	}

	return true
}

// evaluateForLabelSet performs formula evaluation for a specific label set
func (fe *FormulaEvaluator) evaluateForLabelSet(targetLabels []*Label, lookup *seriesLookup) *TimeSeries {
	// Find matching series for each variable
	variableData := make(map[string]map[int64]float64)
	var allTimestamps map[int64]struct{} = make(map[int64]struct{})

	for variable := range fe.aggRefs {
		// Find series with matching labels for this variable
		for seriesKey, series := range lookup.seriesMetadata {
			if strings.HasPrefix(seriesKey, variable+"|") && fe.isSubset(targetLabels, series.Labels) {
				if timestampData, exists := lookup.data[seriesKey]; exists {
					variableData[variable] = timestampData
					// Collect all timestamps
					for ts := range timestampData {
						allTimestamps[ts] = struct{}{}
					}
					break // Found matching series for this variable
				}
			}
		}
	}

	// Convert timestamps to sorted slice
	timestamps := fe.timestampPool.Get().([]int64)
	timestamps = timestamps[:0]
	defer fe.timestampPool.Put(timestamps)

	for ts := range allTimestamps {
		timestamps = append(timestamps, ts)
	}
	slices.Sort(timestamps)

	// Evaluate formula at each timestamp
	var resultValues []*TimeSeriesValue
	values := fe.valuesPool.Get().(map[string]any)
	defer fe.valuesPool.Put(values)

	for _, timestamp := range timestamps {
		// Clear previous values
		for k := range values {
			delete(values, k)
		}

		// Collect values for this timestamp
		validCount := 0
		for _, variable := range fe.variables {
			if varData, exists := variableData[variable]; exists {
				if value, exists := varData[timestamp]; exists {
					values[variable] = value
					validCount++
				}
			}
		}

		// Apply default zeros where allowed
		for _, variable := range fe.variables {
			if _, exists := values[variable]; !exists && fe.canDefaultZero[variable] {
				values[variable] = 0.0
				validCount++
			}
		}

		// Skip if we don't have all required variables
		if validCount != len(fe.variables) {
			continue
		}

		// Evaluate expression
		result, err := fe.expression.Evaluate(values)
		if err != nil {
			continue
		}

		value, ok := result.(float64)
		if !ok || math.IsNaN(value) || math.IsInf(value, 0) {
			continue
		}

		resultValues = append(resultValues, &TimeSeriesValue{
			Timestamp: timestamp,
			Value:     value,
		})
	}

	if len(resultValues) == 0 {
		return nil
	}

	// Preserve original label structure and metadata
	resultLabels := make([]*Label, len(targetLabels))
	copy(resultLabels, targetLabels)

	return &TimeSeries{
		Labels: resultLabels,
		Values: resultValues,
	}
}

// EvalFuncs returns mathematical functions
func EvalFuncs() map[string]govaluate.ExpressionFunction {
	funcs := make(map[string]govaluate.ExpressionFunction)

	pi180 := math.Pi / 180
	rad180 := 180 / math.Pi

	// Mathematical functions
	funcs["exp"] = func(args ...any) (any, error) {
		return math.Exp(args[0].(float64)), nil
	}
	funcs["log"] = func(args ...any) (any, error) {
		return math.Log(args[0].(float64)), nil
	}
	funcs["ln"] = func(args ...any) (any, error) {
		return math.Log(args[0].(float64)), nil
	}
	funcs["exp2"] = func(args ...any) (any, error) {
		return math.Exp2(args[0].(float64)), nil
	}
	funcs["log2"] = func(args ...any) (any, error) {
		return math.Log2(args[0].(float64)), nil
	}
	funcs["exp10"] = func(args ...any) (any, error) {
		return math.Pow10(int(args[0].(float64))), nil
	}
	funcs["log10"] = func(args ...any) (any, error) {
		return math.Log10(args[0].(float64)), nil
	}
	funcs["sqrt"] = func(args ...any) (any, error) {
		return math.Sqrt(args[0].(float64)), nil
	}
	funcs["cbrt"] = func(args ...any) (any, error) {
		return math.Cbrt(args[0].(float64)), nil
	}
	funcs["erf"] = func(args ...any) (any, error) {
		return math.Erf(args[0].(float64)), nil
	}
	funcs["erfc"] = func(args ...any) (any, error) {
		return math.Erfc(args[0].(float64)), nil
	}
	funcs["lgamma"] = func(args ...any) (any, error) {
		v, _ := math.Lgamma(args[0].(float64))
		return v, nil
	}
	funcs["tgamma"] = func(args ...any) (any, error) {
		return math.Gamma(args[0].(float64)), nil
	}

	// Trigonometric functions
	funcs["sin"] = func(args ...any) (any, error) {
		return math.Sin(args[0].(float64)), nil
	}
	funcs["cos"] = func(args ...any) (any, error) {
		return math.Cos(args[0].(float64)), nil
	}
	funcs["tan"] = func(args ...any) (any, error) {
		return math.Tan(args[0].(float64)), nil
	}
	funcs["asin"] = func(args ...any) (any, error) {
		return math.Asin(args[0].(float64)), nil
	}
	funcs["acos"] = func(args ...any) (any, error) {
		return math.Acos(args[0].(float64)), nil
	}
	funcs["atan"] = func(args ...any) (any, error) {
		return math.Atan(args[0].(float64)), nil
	}

	// Utility functions (optimized with pre-computed constants)
	funcs["degrees"] = func(args ...any) (any, error) {
		return args[0].(float64) * rad180, nil
	}
	funcs["radians"] = func(args ...any) (any, error) {
		return args[0].(float64) * pi180, nil
	}
	funcs["now"] = func(args ...any) (any, error) {
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

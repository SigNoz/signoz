package querybuildertypesv5

import (
	"fmt"
	"math"
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

	Disabled bool `json:"disabled,omitempty"`

	// order by keys and directions
	Order []OrderBy `json:"order,omitempty"`

	// limit the maximum number of rows to return
	Limit int `json:"limit,omitempty"`

	// having clause to apply to the formula result
	Having *Having `json:"having,omitempty"`

	// functions to apply to the formula result
	Functions []Function `json:"functions,omitempty"`

	Legend string `json:"legend,omitempty"`
}

// Copy creates a deep copy of the QueryBuilderFormula
func (f QueryBuilderFormula) Copy() QueryBuilderFormula {
	c := f

	if f.Order != nil {
		c.Order = make([]OrderBy, len(f.Order))
		for i, o := range f.Order {
			c.Order[i] = o.Copy()
		}
	}

	if f.Functions != nil {
		c.Functions = make([]Function, len(f.Functions))
		for i, fn := range f.Functions {
			c.Functions[i] = fn.Copy()
		}
	}

	if f.Having != nil {
		c.Having = f.Having.Copy()
	}

	return c
}

// UnmarshalJSON implements custom JSON unmarshaling to disallow unknown fields
func (f *QueryBuilderFormula) UnmarshalJSON(data []byte) error {
	type Alias QueryBuilderFormula
	var temp Alias
	if err := UnmarshalJSONWithContext(data, &temp, "formula spec"); err != nil {
		return err
	}
	*f = QueryBuilderFormula(temp)
	return nil
}

// small container to store the query name and index or alias reference
// for a variable in the formula expression
// read below for more details on aggregation references
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
// Why do we evaluate the formula expression in query-service?
// In the initial iteration, we let the CH take care of the formula evaluation.
// Look at the query here https://github.com/SigNoz/signoz/blob/ad2d4ed56cf8457a0feee2b6947aed95c355c957/pkg/query-service/app/queryBuilder/query_builder_test.go#L459
// This was achieved using the INNER JOIN between the query results.
//
// What are the issues with this approach?
// The way CH handles the join evaluation is not the best suited for us in this scenario.
// It runs the right most side of the join before running anything else and progressively
// completes the join from right to left. This becomes inefficient for simple cases like apdex (A+B/2)/C.
// There is no need to wait for the right most side to complete before starting the evaluation for A and B.
// They could be run independently and results could be computed faster.
// To address this, we now evaluate the formula expression in query-service.
// The queries are run in parallel to fetch the results and then on the
// result series, we evaluate the formula expression.
// This also makes use of any application caching to avoid recomputing on same data
type FormulaEvaluator struct {
	// expression to evaluate, prepared from the expression string with list of
	// supported functions https://github.com/SigNoz/govaluate?tab=readme-ov-file#what-operators-and-types-does-this-support
	expression *govaluate.EvaluableExpression
	// list of variables in the expression
	// For example, in sqrt(A*A + B*B), variables are A and B
	variables []string
	// canDefaultZero is a map of variables that can be defaulted to zero
	// when a value is not present for a variable at a timestamp
	//
	// Why is this needed?
	// If you are counting things, and use a expression like A/B, the non-existent
	// values can be defaulted to zero.
	// Let's take an example of error rate, say, the expression is A/B, and B represents
	// total requests, and A represents error requests. If for a timestamp t1, value for
	// A is not present, i.e there are no error requests for interval t1, then the error rate
	// is effectively 0. It's different to not show any value for that timestamp vs showing a value of 0.
	// for cases where we can deterministically say non-existent values are safe to be defaulted to 0,
	// we can set canDefaultZero to true
	canDefaultZero map[string]bool

	// Parsed aggregation references from variables
	// As a part of the new query builder, we allow more than one aggregation in the same query
	// for logs and traces. This introduces a new concept of aggregation references.
	// For example, let's a query A has two aggregations `count()`, `sum(quantity)`.
	// In this case, there are two aggregations, each with their own series.
	// When they are referenced in the formula, they either need to be index referenced
	// or alias referenced.
	// For example, if the A has two aggregations, `count`, `sum(quantity)`,
	// the A.0 references to series from the first aggregation, and A.1 references to series from the second aggregation.
	// However, if the A has two aggregations with aliases, `count as cnt`, `sum(quantity) as total`,
	// then they can also be referenced as `A.cnt` and `A.total`
	// this is a map of variable name to aggregation reference
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
	// for each variable, parse the reference and store it in the aggRefs map
	for _, variable := range evaluator.variables {
		aggRef, err := parseAggregationReference(variable)
		if err != nil {
			return nil, err
		}
		evaluator.aggRefs[variable] = aggRef
	}

	// 1k timestamps is very generous, we don't expect to have more than 300
	evaluator.timestampPool.New = func() any {
		s := make([]int64, 0, 1000)
		return &s
	}
	evaluator.valuesPool.New = func() any {
		return make(map[string]any, len(evaluator.variables))
	}

	return evaluator, nil
}

// parseAggregationReference parses variable names like "A", "A.0", "A.my_alias"
// into a aggregationRef container for later use
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
	maxSeries := make(chan struct{}, 4)

	// For each candidate label set, evaluate the formula expression
	// and store the result in the resultChan
	for _, labelSet := range uniqueLabelSets {
		wg.Add(1)
		go func(labels []*Label) {
			defer wg.Done()
			maxSeries <- struct{}{}
			defer func() { <-maxSeries }()

			// main workhorse of the formula evaluation
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
		// data is a map of series key to timestamp to value
		// series key is a unique identifier for a series
		// timestamp is the timestamp of the value
		// value is the value of the series at the timestamp
		data: make(map[string]map[int64]float64),
		// seriesMetadata is a map of series key to series metadata
		// series metadata is the metadata of the series
		// this is used to preserve the original label structure and metadata
		// when the series is returned to the caller
		// It's also used for finding matching series for a variable
		seriesMetadata: make(map[string]*TimeSeries),
	}

	for variable, aggRef := range fe.aggRefs {
		// We are only interested in the time series data for the queries that are
		// involved in the formula expression.
		data, exists := timeSeriesData[aggRef.QueryName]
		if !exists {
			continue
		}

		// Find the specific aggregation bucket
		// Now, that we have the data for the query, we look for the specific aggregation bucket
		// referenced in the formula expression.
		// For example, if the formula expression is `B.2`, the above `data` would be the
		// time series data for the query B.
		// The following code will find the aggregation at the index 2
		// so we can build the series key -> timestamp -> value map for the expr evaluation
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
	// Why is variable name needed?
	// Because we need to maintain if a certain series belongs to a query.
	// The variable name here is the name of the query.
	// Why is series index needed?
	// Since we support multiple aggregations in the same query, we need to
	// make use the series index to differentiate between series from different aggregations.

	// Perhaps, we can reduce the allocations here and use the hash of the variable and series index
	// to create a unique key.
	// However, the number of labels and series from query result should be small,
	// and not be a bottleneck.
	// So, we can keep it simple for now.
	var keyParts []string
	keyParts = append(keyParts, variable)
	keyParts = append(keyParts, strconv.Itoa(seriesIndex))

	// Sort labels by key name for consistent ordering
	sortedLabels := make([]*Label, len(labels))
	copy(sortedLabels, labels)
	slices.SortFunc(sortedLabels, func(i, j *Label) int {
		if i.Key.Name < j.Key.Name {
			return -1
		}
		if i.Key.Name > j.Key.Name {
			return 1
		}
		return 0
	})

	for _, label := range sortedLabels {
		keyParts = append(keyParts, fmt.Sprintf("%s=%v", label.Key.Name, label.Value))
	}

	return strings.Join(keyParts, "|")
}

// perhaps this could be named better. The job of this function is to find all unique and supersets
// of label sets from the series metadata.
// For example, if the series metadata has the following label sets:
// [{"service": "frontend", "operation": "GET /api"}, {"service": "frontend"}]
// then the function should return the following label sets:
// [{"service": "frontend", "operation": "GET /api"}]
// Why? because `{"service": "frontend"}` is a subset of `{"service": "frontend", "operation": "GET /api"}`
// The result of any expression that uses the series with `{"service": "frontend", "operation": "GET /api"}`
// and `{"service": "frontend"}` would be the series with `{"service": "frontend", "operation": "GET /api"}`
// So, we create a set of labels sets that can be termed as candidates for the final result.
func (fe *FormulaEvaluator) findUniqueLabelSets(lookup *seriesLookup) [][]*Label {
	var allLabelSets [][]*Label

	// Collect all label sets from series metadata
	for _, series := range lookup.seriesMetadata {
		allLabelSets = append(allLabelSets, series.Labels)
	}

	// sort the label sets by the number of labels in descending order
	slices.SortFunc(allLabelSets, func(i, j []*Label) int {
		if len(i) > len(j) {
			return -1
		}
		if len(i) < len(j) {
			return 1
		}
		return 0
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

// evaluateForLabelSet performs formula evaluation for a specific label set
func (fe *FormulaEvaluator) evaluateForLabelSet(targetLabels []*Label, lookup *seriesLookup) *TimeSeries {
	// Find matching series for each variable
	variableData := make(map[string]map[int64]float64)
	// not every series would have a value for every timestamp
	// so we need to collect all timestamps from the series that have a value
	// for the variable
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
	tsPtr := fe.timestampPool.Get().(*[]int64)
	timestamps := (*tsPtr)[:0]
	defer func() {
		*tsPtr = timestamps[:0]
		fe.timestampPool.Put(tsPtr)
	}()

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
	funcs["abs"] = func(args ...any) (any, error) {
		return math.Abs(args[0].(float64)), nil
	}
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
		"abs", "exp", "log", "ln", "exp2", "log2", "exp10", "log10",
		"sqrt", "cbrt", "erf", "erfc", "lgamma", "tgamma",
		"sin", "cos", "tan", "asin", "acos", "atan",
		"degrees", "radians", "now",
	}
}

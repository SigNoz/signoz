package querybuildertypesv5

import (
	"bytes"
	"context"
	"fmt"
	"math"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"slices"

	"github.com/SigNoz/govaluate"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/binding"
)

type QueryBuilderFormula struct {
	Name       string `json:"name" description:"The unique name of the formula, such as F1, used by selectedQueryName and by panels. Referencing a formula from another formula is not reliable."`
	Expression string `json:"expression" description:"An arithmetic expression over builder query names, for example A / B * 100. Reference queries, not other formulas."`

	Disabled bool `json:"disabled" description:"When true, the result is excluded from the response; the formula may still be evaluated. Defaults to false."`

	Order []OrderBy `json:"order,omitzero" description:"The sort order of the formula result."`

	Limit int `json:"limit,omitempty" description:"The maximum number of series or rows to return. Unlimited when 0."`

	Offset int `json:"offset,omitempty" description:"The number of ordered series or rows to skip before the page starts. Requires limit."`

	Having *Having `json:"having,omitempty" description:"A filter on the formula values, referencing the formula by its name or as __result, for example F1 > 0. A time series keeps only the points that match and drops a series with none left; a scalar result keeps only the rows that match."`

	Functions []Function `json:"functions,omitzero" description:"Post-processing functions applied in order to each result series."`

	BucketOptions *BucketOptions `json:"bucketOptions,omitempty" description:"The value axis to count the formula result into, as a kind-discriminated linear or log bucket spec. Read only by heatmap requests, and only from the query they draw."`

	Legend string `json:"legend" description:"The display name template for each series; {{field}} placeholders are replaced by label values."`
}

// Copy creates a deep copy of the QueryBuilderFormula.
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

	if f.BucketOptions != nil {
		bucketOptionsCopy := *f.BucketOptions
		c.BucketOptions = &bucketOptionsCopy
	}

	return c
}

// UnmarshalJSON implements custom JSON unmarshaling to disallow unknown fields.
func (f *QueryBuilderFormula) UnmarshalJSON(data []byte) error {
	type Alias QueryBuilderFormula
	var temp Alias
	if err := binding.JSON.BindBody(bytes.NewReader(data), &temp, binding.WithDisallowUnknownFields(true), binding.WithUnknownFieldContext("formula spec")); err != nil {
		return err
	}
	*f = QueryBuilderFormula(temp)
	return nil
}

// Validate checks if the QueryBuilderFormula fields are valid.
func (f QueryBuilderFormula) Validate() error {
	// Validate name is not blank
	if strings.TrimSpace(f.Name) == "" {
		return errors.NewInvalidInputf(
			errors.CodeInvalidInput,
			"formula name cannot be blank",
		)
	}

	// Validate expression is not blank
	if strings.TrimSpace(f.Expression) == "" {
		return errors.NewInvalidInputf(
			errors.CodeInvalidInput,
			"formula expression cannot be blank",
		)
	}

	if f.Offset < 0 {
		return errors.NewInvalidInputf(
			errors.CodeInvalidInput,
			"offset must be non-negative, got %d",
			f.Offset,
		)
	}

	if f.Offset > 0 && f.Limit == 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "offset requires a limit")
	}

	// Validate expression is parseable
	if _, err := govaluate.NewEvaluableExpressionWithFunctions(f.Expression, EvalFuncs()); err != nil {
		return errors.NewInvalidInputf(
			errors.CodeInvalidInput,
			"failed to parse expression for formula query %q: %s",
			f.Name,
			err.Error(),
		)
	}

	if f.Limit < 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "limit must be non-negative, got %d", f.Limit)
	}

	// Validate functions if present
	for i, fn := range f.Functions {
		if err := fn.Validate(); err != nil {
			fnId := fmt.Sprintf("function #%d", i+1)
			if f.Name != "" {
				fnId = fmt.Sprintf("function #%d in formula '%s'", i+1, f.Name)
			}
			return errors.NewInvalidInputf(
				errors.CodeInvalidInput,
				"invalid %s: %s",
				fnId,
				err.Error(),
			)
		}
	}

	return nil
}

func (f QueryBuilderFormula) ExtractReferencedQueryNames() ([]string, error) {
	// parsed the way the evaluator parses it, so the names match what it resolves
	expression, err := govaluate.NewEvaluableExpressionWithFunctions(f.Expression, EvalFuncs())
	if err != nil {
		return nil, errors.WrapInvalidInputf(err, errors.CodeInvalidInput, "failed to parse expression for formula query %q", f.Name)
	}

	var names []string
	for _, variable := range expression.Vars() {
		if !slices.Contains(names, variable) {
			names = append(names, variable)
		}
	}
	return names, nil
}

// small container to store the query name and index or alias reference
// for a variable in the formula expression
// read below for more details on aggregation references.
type aggregationRef struct {
	QueryName string
	Index     *int    // Index-based reference (e.g., A.0)
	Alias     *string // Alias-based reference (e.g., A.my_alias)
}

// seriesEntry is one series of a variable.
type seriesEntry struct {
	labels []*Label
	// index of the series in its aggregation bucket
	position int
	data     map[int64]float64 // timestamp -> value
}

// keySetIndex holds the series of a variable that share one set of label keys.
type keySetIndex struct {
	keys []string // sorted label key names
	// value signature (see valueSignature) -> the first series in the bucket
	// with those values
	series map[string]*seriesEntry
}

// seriesLookup provides lookup for series data, grouped by variable. A variable
// has one keySetIndex for each set of label keys among its series. A group by
// gives every series the same keys, so there is usually one.
type seriesLookup struct {
	byVariable map[string][]*keySetIndex
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
// This also makes use of any application caching to avoid recomputing on same data.
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
	// tsSetPool holds map[int64]struct{} scratch maps used to build the union of
	// timestamps for a label set.
	tsSetPool sync.Pool
	// matchedPool holds []map[int64]float64 scratch slices indexed by variable
	// position, holding each variable's matched series data for a label set.
	matchedPool sync.Pool
}

// NewFormulaEvaluator creates a formula evaluator.
func NewFormulaEvaluator(expressionStr string, canDefaultZero map[string]bool) (*FormulaEvaluator, error) {
	functions := EvalFuncs()
	expression, err := govaluate.NewEvaluableExpressionWithFunctions(expressionStr, functions)
	if err != nil {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "failed to parse expression")
	}

	// Normalize canDefaultZero keys to match variable casing from expression
	normalizedCanDefaultZero := make(map[string]bool)
	vars := expression.Vars()
	for _, variable := range vars {
		// If exact match exists, use it
		if val, ok := canDefaultZero[variable]; ok {
			normalizedCanDefaultZero[variable] = val
			continue
		}
		// Otherwise try case-insensitive lookup
		for k, v := range canDefaultZero {
			if strings.EqualFold(k, variable) {
				normalizedCanDefaultZero[variable] = v
				break
			}
		}
	}

	evaluator := &FormulaEvaluator{
		expression:     expression,
		variables:      vars,
		canDefaultZero: normalizedCanDefaultZero,
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
	evaluator.tsSetPool.New = func() any {
		return make(map[int64]struct{}, 512)
	}
	nVars := len(evaluator.variables)
	evaluator.matchedPool.New = func() any {
		s := make([]map[int64]float64, 0, nVars)
		return &s
	}

	return evaluator, nil
}

// parseAggregationReference parses variable names like "A", "A.0", "A.my_alias"
// into a aggregationRef container for later use.
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

// EvaluateFormula processes multiple time series with proper aggregation handling.
// When ctx is done it stops between two label sets of the result and returns
// the error of ctx. Building the lookup is not interrupted.
func (fe *FormulaEvaluator) EvaluateFormula(ctx context.Context, timeSeriesData map[string]*TimeSeriesData) ([]*TimeSeries, error) {
	if err := ctx.Err(); err != nil {
		return nil, err
	}

	// Build lookup structures for all referenced aggregations
	lookup := fe.buildSeriesLookup(timeSeriesData)

	// Find all unique label combinations across referenced series
	uniqueLabelSets := fe.findUniqueLabelSets(lookup)

	n := len(uniqueLabelSets)
	if n == 0 {
		return nil, nil
	}

	// Each label set is evaluated independently into its own slot, so we can write
	// results without any synchronization and compact afterwards. This avoids the
	// per-label-set goroutine + semaphore + channel churn that previously
	// dominated the profile (runtime.pthread_cond_signal).
	results := make([]*TimeSeries, n)

	// For small inputs the goroutine machinery costs more than it saves.
	const parallelThreshold = 8
	if n < parallelThreshold {
		for i, labelSet := range uniqueLabelSets {
			results[i] = fe.evaluateForLabelSet(labelSet, lookup)
		}
	} else {
		workers := min(runtime.GOMAXPROCS(0), n)
		// A shared cursor hands out label-set indices to a fixed pool of workers,
		// balancing load (series sizes vary) with a single atomic add per item.
		var next atomic.Int64
		var wg sync.WaitGroup
		wg.Add(workers)
		for range workers {
			go func() {
				defer wg.Done()
				for {
					i := int(next.Add(1)) - 1
					if i >= n || ctx.Err() != nil {
						return
					}
					results[i] = fe.evaluateForLabelSet(uniqueLabelSets[i], lookup)
				}
			}()
		}
		wg.Wait()
	}

	if err := ctx.Err(); err != nil {
		return nil, err
	}

	// Compact non-empty results in place (results[j] is read before it is
	// overwritten, since j <= i throughout).
	resultSeries := results[:0]
	for _, series := range results {
		if series != nil && len(series.Values) > 0 {
			resultSeries = append(resultSeries, series)
		}
	}

	return resultSeries, nil
}

// buildSeriesLookup creates the per-variable matching index for all referenced
// aggregations.
func (fe *FormulaEvaluator) buildSeriesLookup(timeSeriesData map[string]*TimeSeriesData) *seriesLookup {
	lookup := &seriesLookup{
		byVariable: make(map[string][]*keySetIndex, len(fe.aggRefs)),
	}

	for variable, aggRef := range fe.aggRefs {
		// We are only interested in the time series data for the queries that are
		// involved in the formula expression.
		data, exists := timeSeriesData[aggRef.QueryName]
		if !exists {
			// try case-insensitive lookup
			for k, v := range timeSeriesData {
				if strings.EqualFold(k, aggRef.QueryName) {
					data = v
					exists = true
					break
				}
			}
		}
		if !exists {
			continue
		}

		// Find the specific aggregation bucket referenced in the formula
		// expression. For example, if the expression is `B.2`, the above `data`
		// is the time series data for query B and we pick the aggregation at
		// index 2.
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

		var indexes []*keySetIndex
		byKeys := make(map[string]*keySetIndex)
		var index *keySetIndex

		// Process all series in the target bucket.
		for position, series := range targetBucket.Series {
			// Consecutive series almost always have the same keys.
			if index == nil || !hasExactKeys(series.Labels, index.keys) {
				keys := make([]string, len(series.Labels))
				for i, label := range series.Labels {
					keys[i] = label.Key.Name
				}
				slices.Sort(keys)

				keysSig := keysSignature(keys)
				index = byKeys[keysSig]
				if index == nil {
					sizeHint := 0
					if len(indexes) == 0 {
						// A group by gives every series the same keys, so the
						// first key set usually holds all of them.
						sizeHint = len(targetBucket.Series)
					}
					index = &keySetIndex{keys: keys, series: make(map[string]*seriesEntry, sizeHint)}
					byKeys[keysSig] = index
					indexes = append(indexes, index)
				}
			}

			signature, _ := valueSignature(series.Labels, index.keys)
			if _, exists := index.series[signature]; exists {
				// The first series with a label set wins, matching the original
				// "first match" behaviour; a later duplicate's points are ignored.
				continue
			}

			data := make(map[int64]float64, len(series.Values))
			for _, value := range series.Values {
				data[value.Timestamp] = value.Value
			}
			index.series[signature] = &seriesEntry{labels: series.Labels, position: position, data: data}
		}

		lookup.byVariable[variable] = indexes
	}

	return lookup
}

// hasExactKeys reports whether the key names of labels are exactly keys.
func hasExactKeys(labels []*Label, keys []string) bool {
	if len(labels) != len(keys) {
		return false
	}
	for _, key := range keys {
		if _, ok := findLabelValue(labels, key); !ok {
			return false
		}
	}
	return true
}

// writeSized writes s with its length first, so that the end of s is known
// without a separator, which s could contain.
func writeSized(sb *strings.Builder, s string) {
	sb.WriteString(strconv.Itoa(len(s)))
	sb.WriteByte(':')
	sb.WriteString(s)
}

// keysSignature is the same for two sorted lists of key names exactly when the
// names are the same.
func keysSignature(keys []string) string {
	var sb strings.Builder
	for _, key := range keys {
		writeSized(&sb, key)
	}
	return sb.String()
}

// valueSignature returns the values of labels for keys, in the order of keys.
// It is the same for two label sets exactly when each value has the same type
// and the same value, so the string "200" and the number 200 differ. It returns
// false when labels has no value for one of the keys.
func valueSignature(labels []*Label, keys []string) (string, bool) {
	// Checked first, so that a label set without the keys costs no allocation.
	for _, key := range keys {
		if _, ok := findLabelValue(labels, key); !ok {
			return "", false
		}
	}

	var sb strings.Builder
	sb.Grow(len(keys) * 24)
	for _, key := range keys {
		value, _ := findLabelValue(labels, key)
		switch v := value.(type) {
		case string:
			sb.WriteByte('s')
			writeSized(&sb, v)
			continue
		// -0 and 0 are equal values with a different text.
		case float64:
			value = v + 0
		case float32:
			value = v + 0
		}
		sb.WriteByte('o')
		writeSized(&sb, fmt.Sprintf("%T:%v", value, value))
	}
	return sb.String(), true
}

// findLabelValue returns the value for key in labels, scanning linearly since
// label sets are small.
func findLabelValue(labels []*Label, key string) (any, bool) {
	for _, label := range labels {
		if label.Key.Name == key {
			return label.Value, true
		}
	}
	return nil, false
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
	type candidates struct {
		keys []string
		// value signature -> labels
		labelSets map[string][]*Label
	}

	// Merge the label sets of all variables by key set. Two variables with the
	// same label set (e.g. A and B grouped identically) give one candidate.
	byKeys := make(map[string]*candidates)
	for _, indexes := range lookup.byVariable {
		for _, index := range indexes {
			keysSig := keysSignature(index.keys)
			group := byKeys[keysSig]
			if group == nil {
				group = &candidates{keys: index.keys, labelSets: make(map[string][]*Label, len(index.series))}
				byKeys[keysSig] = group
			}
			for signature, entry := range index.series {
				if _, exists := group.labelSets[signature]; !exists {
					group.labelSets[signature] = entry.labels
				}
			}
		}
	}

	// A label set is a subset of another one only when its keys are a subset of
	// the other's keys, so only a label set with more keys can remove it. A label
	// set that is removed here still removes its own subsets, because the label
	// set that removed it has them as subsets too.
	for _, larger := range byKeys {
		for _, smaller := range byKeys {
			if smaller == larger || !keysSubset(smaller.keys, larger.keys) {
				continue
			}
			for _, labels := range larger.labelSets {
				if signature, ok := valueSignature(labels, smaller.keys); ok {
					delete(smaller.labelSets, signature)
				}
			}
		}
	}

	count := 0
	for _, group := range byKeys {
		count += len(group.labelSets)
	}
	if count == 0 {
		return nil
	}
	uniqueSets := make([][]*Label, 0, count)
	for _, group := range byKeys {
		for _, labels := range group.labelSets {
			uniqueSets = append(uniqueSets, labels)
		}
	}
	return uniqueSets
}

// keysSubset reports whether the sorted key set a is a subset of the sorted key
// set b.
func keysSubset(a, b []string) bool {
	if len(a) > len(b) {
		return false
	}
	i := 0
	for _, x := range a {
		for i < len(b) && b[i] < x {
			i++
		}
		if i >= len(b) || b[i] != x {
			return false
		}
		i++
	}
	return true
}

// evaluateForLabelSet performs formula evaluation for a specific label set.
func (fe *FormulaEvaluator) evaluateForLabelSet(targetLabels []*Label, lookup *seriesLookup) *TimeSeries {
	nVars := len(fe.variables)

	// matched[i] holds the timestamp->value data for fe.variables[i], or nil if
	// no series matched. Indexed by position to avoid a per-call map.
	mptr := fe.matchedPool.Get().(*[]map[int64]float64)
	matched := *mptr
	if cap(matched) < nVars {
		matched = make([]map[int64]float64, nVars)
	} else {
		matched = matched[:nVars]
		for i := range matched {
			matched[i] = nil
		}
	}
	defer func() {
		*mptr = matched[:0]
		fe.matchedPool.Put(mptr)
	}()

	// not every series has a value for every timestamp, so collect the union of
	// timestamps across the matched series.
	allTimestamps := fe.tsSetPool.Get().(map[int64]struct{})
	clear(allTimestamps)
	defer fe.tsSetPool.Put(allTimestamps)

	for i, variable := range fe.variables {
		// The series of a variable to use is the first one in its bucket whose
		// labels are a subset of the target. Each key set has at most one such
		// series: the one with the target's values for those keys.
		var match *seriesEntry
		for _, index := range lookup.byVariable[variable] {
			signature, ok := valueSignature(targetLabels, index.keys)
			if !ok {
				continue
			}
			if entry, exists := index.series[signature]; exists && (match == nil || entry.position < match.position) {
				match = entry
			}
		}

		if match != nil {
			matched[i] = match.data
			for ts := range match.data {
				allTimestamps[ts] = struct{}{}
			}
		}
	}

	// Convert timestamps to a sorted slice.
	tsPtr := fe.timestampPool.Get().(*[]int64)
	timestamps := (*tsPtr)[:0]
	for ts := range allTimestamps {
		timestamps = append(timestamps, ts)
	}
	slices.Sort(timestamps)
	defer func() {
		*tsPtr = timestamps[:0]
		fe.timestampPool.Put(tsPtr)
	}()

	if len(timestamps) == 0 {
		return nil
	}

	values := fe.valuesPool.Get().(map[string]any)
	defer fe.valuesPool.Put(values)

	// Allocate the values backing array once (cap = number of timestamps); the
	// returned pointers reference into it, so no per-point allocation is needed.
	backing := make([]TimeSeriesValue, 0, len(timestamps))

	for _, timestamp := range timestamps {
		clear(values)

		// Collect values for this timestamp. fe.variables may contain a variable
		// more than once (e.g. "A * B - A"); values is keyed by name, but each
		// data-present occurrence still increments validCount, matching the target
		// count of len(fe.variables) below.
		validCount := 0
		for i, variable := range fe.variables {
			if data := matched[i]; data != nil {
				if value, exists := data[timestamp]; exists {
					values[variable] = value
					validCount++
				}
			}
		}

		// Apply default zeros where allowed. A defaulted variable is only counted
		// once even if it appears multiple times, since the second occurrence finds
		// the value already set.
		for _, variable := range fe.variables {
			if _, exists := values[variable]; !exists && fe.canDefaultZero[variable] {
				values[variable] = 0.0
				validCount++
			}
		}

		// Skip if we don't have all required variables.
		if validCount != nVars {
			continue
		}

		result, err := fe.expression.Evaluate(values)
		if err != nil {
			continue
		}

		value, ok := result.(float64)
		if !ok || math.IsNaN(value) || math.IsInf(value, 0) {
			continue
		}

		backing = append(backing, TimeSeriesValue{
			Timestamp: timestamp,
			Value:     value,
		})
	}

	if len(backing) == 0 {
		return nil
	}

	resultValues := make([]*TimeSeriesValue, len(backing))
	for i := range backing {
		resultValues[i] = &backing[i]
	}

	// Preserve the original label structure for the result series.
	resultLabels := make([]*Label, len(targetLabels))
	copy(resultLabels, targetLabels)

	return &TimeSeries{
		Labels: resultLabels,
		Values: resultValues,
	}
}

// EvalFuncs returns mathematical functions.
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

// GetSupportedFunctions returns the list of supported function names.
func GetSupportedFunctions() []string {
	return []string{
		"abs", "exp", "log", "ln", "exp2", "log2", "exp10", "log10",
		"sqrt", "cbrt", "erf", "erfc", "lgamma", "tgamma",
		"sin", "cos", "tan", "asin", "acos", "atan",
		"degrees", "radians", "now",
	}
}

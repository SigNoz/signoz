package querybuildertypesv5

import (
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

	return c
}

// UnmarshalJSON implements custom JSON unmarshaling to disallow unknown fields.
func (f *QueryBuilderFormula) UnmarshalJSON(data []byte) error {
	type Alias QueryBuilderFormula
	var temp Alias
	if err := UnmarshalJSONWithContext(data, &temp, "formula spec"); err != nil {
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

	// Validate expression is parseable
	if _, err := govaluate.NewEvaluableExpressionWithFunctions(f.Expression, EvalFuncs()); err != nil {
		return errors.NewInvalidInputf(
			errors.CodeInvalidInput,
			"failed to parse expression for formula query %q: %s",
			f.Name,
			err.Error(),
		)
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

// small container to store the query name and index or alias reference
// for a variable in the formula expression
// read below for more details on aggregation references.
type aggregationRef struct {
	QueryName string
	Index     *int    // Index-based reference (e.g., A.0)
	Alias     *string // Alias-based reference (e.g., A.my_alias)
}

// seriesEntry holds one series' values and its canonical label signature so that
// matching can be a map lookup instead of rebuilding maps for every comparison.
type seriesEntry struct {
	labels []*Label
	keys   []string          // sorted label key names
	sig    string            // canonical value signature over keys
	data   map[int64]float64 // timestamp -> value
}

// variableLookup indexes a single variable's (one aggregation's) series.
type variableLookup struct {
	// keys is the sorted set of label key names shared by this variable's series
	// (taken from the first series). Only meaningful when regular is true.
	keys []string
	// regular is true when every series shares the same set of label keys, which
	// is the normal case for a group-by. It lets matching be an O(1) signature
	// lookup instead of an O(n) subset scan.
	regular bool
	// entries holds the series in bucket order; used for the irregular fallback.
	entries []*seriesEntry
	// bySig maps a value signature to the first series (in bucket order) carrying
	// it. It both drives regular-case matching and enumerates the variable's
	// distinct label sets for findUniqueLabelSets.
	bySig map[string]*seriesEntry
}

// seriesLookup provides lookup for series data, grouped by variable.
type seriesLookup struct {
	byVariable map[string]*variableLookup
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
func (fe *FormulaEvaluator) EvaluateFormula(timeSeriesData map[string]*TimeSeriesData) ([]*TimeSeries, error) {
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
					if i >= n {
						return
					}
					results[i] = fe.evaluateForLabelSet(uniqueLabelSets[i], lookup)
				}
			}()
		}
		wg.Wait()
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
		byVariable: make(map[string]*variableLookup, len(fe.aggRefs)),
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

		vl := &variableLookup{
			regular: true,
			entries: make([]*seriesEntry, 0, len(targetBucket.Series)),
			bySig:   make(map[string]*seriesEntry, len(targetBucket.Series)),
		}

		// Process all series in the target bucket.
		for seriesIdx, series := range targetBucket.Series {
			keys, sig := labelKeysAndSig(series.Labels)

			if seriesIdx == 0 {
				vl.keys = keys
			} else if vl.regular && !slices.Equal(keys, vl.keys) {
				// A series with a different key set means we can no longer rely on
				// the signature index for subset matching and must fall back to a
				// scan for this variable.
				vl.regular = false
			}

			entry, seen := vl.bySig[sig]
			if !seen {
				entry = &seriesEntry{
					labels: series.Labels,
					keys:   keys,
					sig:    sig,
					data:   make(map[int64]float64, len(series.Values)),
				}
				vl.bySig[sig] = entry
				vl.entries = append(vl.entries, entry)
			}

			// Store all timestamp-value pairs. The first series carrying a given
			// signature wins, matching the original "first match" behaviour; a
			// later duplicate's points are ignored.
			if !seen {
				for _, value := range series.Values {
					entry.data[value.Timestamp] = value.Value
				}
			}
		}

		lookup.byVariable[variable] = vl
	}

	return lookup
}

// labelKeysAndSig returns the sorted label key names and a canonical value
// signature for a label set. The signature is built so that two label sets with
// the same keys and values produce identical strings, and so that projecting a
// superset onto these keys (see projectSig) yields the same string.
func labelKeysAndSig(labels []*Label) ([]string, string) {
	n := len(labels)
	if n == 0 {
		return nil, ""
	}
	sorted := make([]*Label, n)
	copy(sorted, labels)
	slices.SortFunc(sorted, func(i, j *Label) int {
		return strings.Compare(i.Key.Name, j.Key.Name)
	})

	keys := make([]string, n)
	var sb strings.Builder
	sb.Grow(n * 16)
	for i, label := range sorted {
		keys[i] = label.Key.Name
		appendKVSig(&sb, label.Key.Name, label.Value)
	}
	return keys, sb.String()
}

// projectSig builds the signature of labels projected onto keys (which must be
// sorted). It returns false if labels is missing any of the keys, meaning labels
// cannot match a target that requires those keys.
func projectSig(labels []*Label, keys []string) (string, bool) {
	if len(keys) == 0 {
		return "", true
	}
	var sb strings.Builder
	sb.Grow(len(keys) * 16)
	for _, key := range keys {
		value, ok := findLabelValue(labels, key)
		if !ok {
			return "", false
		}
		appendKVSig(&sb, key, value)
	}
	return sb.String(), true
}

// appendKVSig appends a single key/value pair to a signature builder using NUL
// separators, which do not occur in practical label names or values.
func appendKVSig(sb *strings.Builder, key string, value any) {
	sb.WriteString(key)
	sb.WriteByte(0)
	writeLabelValue(sb, value)
	sb.WriteByte(0)
}

// writeLabelValue writes the canonical string form of a label value. Strings are
// written directly (the common case for telemetry labels); other types fall back
// to fmt, matching how series are keyed elsewhere (see GetUniqueSeriesKey).
func writeLabelValue(sb *strings.Builder, value any) {
	if s, ok := value.(string); ok {
		sb.WriteString(s)
		return
	}
	fmt.Fprintf(sb, "%v", value)
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
	// Collect the distinct label sets across all variables, keyed by their full
	// canonical signature. bySig already deduplicates within a variable, so this
	// merges duplicates across variables (e.g. A and B grouped identically).
	distinct := make(map[string]*seriesEntry)
	for _, vl := range lookup.byVariable {
		for sig, entry := range vl.bySig {
			if _, ok := distinct[sig]; !ok {
				distinct[sig] = entry
			}
		}
	}

	if len(distinct) == 0 {
		return nil
	}

	// Group the distinct sets by their key set. A label set can only be a subset
	// of another when its keys are a subset of the other's keys, so subset
	// relationships only ever cross groups. Within a group all sets share the same
	// keys and distinct values, so none is a subset of another.
	groups := make(map[string]*keyGroup)
	for _, entry := range distinct {
		ksig := strings.Join(entry.keys, "\x00")
		g := groups[ksig]
		if g == nil {
			g = &keyGroup{keys: entry.keys}
			groups[ksig] = g
		}
		g.entries = append(g.entries, entry)
	}

	// In the overwhelmingly common case every series shares one key set, so there
	// is exactly one group and nothing can be a subset of anything else.
	if len(groups) == 1 {
		result := make([][]*Label, 0, len(distinct))
		for _, entry := range distinct {
			result = append(result, entry.labels)
		}
		return result
	}

	// Otherwise, mark as "covered" every signature that is dominated by a set from
	// a group with a strictly larger key set: project the larger set's labels onto
	// the smaller key set and that projection covers any equal set there. A set is
	// kept iff it is not covered (i.e. it is maximal).
	groupList := make([]*keyGroup, 0, len(groups))
	for _, g := range groups {
		groupList = append(groupList, g)
	}

	covered := make(map[string]bool)
	for _, gy := range groupList { // provider of supersets
		for _, gx := range groupList { // smaller key set being dominated
			if gx == gy || !keysSubset(gx.keys, gy.keys) {
				continue
			}
			for _, y := range gy.entries {
				if sig, ok := projectSig(y.labels, gx.keys); ok {
					covered[sig] = true
				}
			}
		}
	}

	result := make([][]*Label, 0, len(distinct))
	for sig, entry := range distinct {
		if !covered[sig] {
			result = append(result, entry.labels)
		}
	}
	return result
}

// keyGroup holds the distinct label sets that share a key set.
type keyGroup struct {
	keys    []string
	entries []*seriesEntry
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

func labelsToMap(labels []*Label) map[string]any {
	m := make(map[string]any, len(labels))
	for _, label := range labels {
		m[label.Key.Name] = label.Value
	}
	return m
}

// isSubset reports whether every label in subset is present with the same value in
// supersetMap (i.e. subset ⊆ superset).
func isSubset(supersetMap map[string]any, subset []*Label) bool {
	for _, label := range subset {
		if val, ok := supersetMap[label.Key.Name]; !ok || val != label.Value {
			return false
		}
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

	// targetMap is only needed for the irregular fallback; built lazily.
	var targetMap map[string]any

	for i, variable := range fe.variables {
		vl := lookup.byVariable[variable]
		if vl == nil {
			continue
		}

		var data map[int64]float64
		if vl.regular {
			// Fast path: the matching series (labels ⊆ target) is exactly the one
			// whose signature equals the target projected onto this variable's keys.
			if sig, ok := projectSig(targetLabels, vl.keys); ok {
				if e := vl.bySig[sig]; e != nil {
					data = e.data
				}
			}
		} else {
			// Fallback: series have mixed key sets, so scan for the first subset.
			if targetMap == nil {
				targetMap = labelsToMap(targetLabels)
			}
			for _, e := range vl.entries {
				if isSubset(targetMap, e.labels) {
					data = e.data
					break
				}
			}
		}

		if data != nil {
			matched[i] = data
			for ts := range data {
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

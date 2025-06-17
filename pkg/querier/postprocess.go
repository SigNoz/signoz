package querier

import (
	"context"
	"fmt"
	"sort"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

// queryInfo holds common query properties
type queryInfo struct {
	Name     string
	Disabled bool
	Step     qbtypes.Step
}

// getqueryInfo extracts common info from any query type
func getqueryInfo(spec any) queryInfo {
	switch s := spec.(type) {
	case qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]:
		return queryInfo{Name: s.Name, Disabled: s.Disabled, Step: s.StepInterval}
	case qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]:
		return queryInfo{Name: s.Name, Disabled: s.Disabled, Step: s.StepInterval}
	case qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]:
		return queryInfo{Name: s.Name, Disabled: s.Disabled, Step: s.StepInterval}
	case qbtypes.QueryBuilderFormula:
		return queryInfo{Name: s.Name, Disabled: false}
	case qbtypes.PromQuery:
		return queryInfo{Name: s.Name, Disabled: s.Disabled, Step: s.Step}
	case qbtypes.ClickHouseQuery:
		return queryInfo{Name: s.Name, Disabled: s.Disabled}
	}
	return queryInfo{}
}

// getQueryName is a convenience function when only name is needed
func getQueryName(spec any) string {
	return getqueryInfo(spec).Name
}

func (q *querier) postProcessResults(ctx context.Context, results map[string]any, req *qbtypes.QueryRangeRequest) (map[string]any, error) {
	// Convert results to typed format for processing
	typedResults := make(map[string]*qbtypes.Result)
	for name, result := range results {
		typedResults[name] = &qbtypes.Result{
			Value: result,
		}
	}

	for _, query := range req.CompositeQuery.Queries {
		switch spec := query.Spec.(type) {
		case qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]:
			if result, ok := typedResults[spec.Name]; ok {
				result = postProcessBuilderQuery(q, result, spec, req)
				typedResults[spec.Name] = result
			}
		case qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]:
			if result, ok := typedResults[spec.Name]; ok {
				result = postProcessBuilderQuery(q, result, spec, req)
				typedResults[spec.Name] = result
			}
		case qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]:
			if result, ok := typedResults[spec.Name]; ok {
				result = postProcessMetricQuery(q, result, spec, req)
				typedResults[spec.Name] = result
			}
		}
	}

	// Apply formula calculations
	typedResults = q.applyFormulas(ctx, typedResults, req)

	// Filter out disabled queries
	typedResults = q.filterDisabledQueries(typedResults, req)

	// Apply table formatting for UI if requested
	if req.FormatOptions != nil && req.FormatOptions.FormatTableResultForUI && req.RequestType == qbtypes.RequestTypeScalar {
		// Format results as a table - this merges all queries into a single table
		tableResult := q.formatScalarResultsAsTable(typedResults, req)

		// Return the table under the first query's name so it gets included in results
		if len(req.CompositeQuery.Queries) > 0 {
			firstQueryName := getQueryName(req.CompositeQuery.Queries[0].Spec)
			if firstQueryName != "" && tableResult["table"] != nil {
				// Return table under first query name
				return map[string]any{firstQueryName: tableResult["table"]}, nil
			}
		}

		return tableResult, nil
	}

	// Convert back to map[string]any
	finalResults := make(map[string]any)
	for name, result := range typedResults {
		finalResults[name] = result.Value
	}

	return finalResults, nil
}

// postProcessBuilderQuery applies postprocessing to a single builder query result
func postProcessBuilderQuery[T any](
	q *querier,
	result *qbtypes.Result,
	query qbtypes.QueryBuilderQuery[T],
	_ *qbtypes.QueryRangeRequest,
) *qbtypes.Result {

	// Apply functions
	if len(query.Functions) > 0 {
		result = q.applyFunctions(result, query.Functions)
	}

	return result
}

// postProcessMetricQuery applies postprocessing to a metric query result
func postProcessMetricQuery(
	q *querier,
	result *qbtypes.Result,
	query qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation],
	req *qbtypes.QueryRangeRequest,
) *qbtypes.Result {

	if query.Limit > 0 {
		result = q.applySeriesLimit(result, query.Limit, query.Order)
	}

	if len(query.Functions) > 0 {
		result = q.applyFunctions(result, query.Functions)
	}

	// Apply reduce to for scalar request type
	if req.RequestType == qbtypes.RequestTypeScalar {
		if len(query.Aggregations) > 0 && query.Aggregations[0].ReduceTo != qbtypes.ReduceToUnknown {
			result = q.applyMetricReduceTo(result, query.Aggregations[0].ReduceTo)
		}
	}

	return result
}

// applyMetricReduceTo applies reduce to operation using the metric's ReduceTo field
func (q *querier) applyMetricReduceTo(result *qbtypes.Result, reduceOp qbtypes.ReduceTo) *qbtypes.Result {
	tsData, ok := result.Value.(*qbtypes.TimeSeriesData)
	if !ok {
		return result
	}

	if tsData != nil {
		for _, agg := range tsData.Aggregations {
			for i, series := range agg.Series {
				// Use the FunctionReduceTo helper
				reducedSeries := qbtypes.FunctionReduceTo(series, reduceOp)
				agg.Series[i] = reducedSeries
			}
		}
	}

	scalarData := convertTimeSeriesDataToScalar(tsData, tsData.QueryName)
	result.Value = scalarData

	return result
}

// applySeriesLimit limits the number of series in the result
func (q *querier) applySeriesLimit(result *qbtypes.Result, limit int, orderBy []qbtypes.OrderBy) *qbtypes.Result {
	tsData, ok := result.Value.(*qbtypes.TimeSeriesData)
	if !ok {
		return result
	}

	if tsData != nil {
		for _, agg := range tsData.Aggregations {
			// Use the ApplySeriesLimit function from querybuildertypes
			agg.Series = qbtypes.ApplySeriesLimit(agg.Series, orderBy, limit)
		}
	}

	return result
}

// applyFunctions applies functions to time series data
func (q *querier) applyFunctions(result *qbtypes.Result, functions []qbtypes.Function) *qbtypes.Result {
	tsData, ok := result.Value.(*qbtypes.TimeSeriesData)
	if !ok {
		return result
	}

	if tsData != nil {
		for _, agg := range tsData.Aggregations {
			for i, series := range agg.Series {
				agg.Series[i] = qbtypes.ApplyFunctions(functions, series)
			}
		}
	}

	return result
}

// applyFormulas processes formula queries in the composite query
func (q *querier) applyFormulas(ctx context.Context, results map[string]*qbtypes.Result, req *qbtypes.QueryRangeRequest) map[string]*qbtypes.Result {
	// Collect formula queries
	formulaQueries := make(map[string]qbtypes.QueryBuilderFormula)

	for _, query := range req.CompositeQuery.Queries {
		if query.Type == qbtypes.QueryTypeFormula {
			if formula, ok := query.Spec.(qbtypes.QueryBuilderFormula); ok {
				formulaQueries[formula.Name] = formula
			}
		}
	}

	// Process each formula
	for name, formula := range formulaQueries {
		// Check if we're dealing with time series or scalar data
		if req.RequestType == qbtypes.RequestTypeTimeSeries {
			result := q.processTimeSeriesFormula(ctx, results, formula, req)
			if result != nil {
				results[name] = result
			}
		}
	}

	return results
}

// processTimeSeriesFormula handles formula evaluation for time series data
func (q *querier) processTimeSeriesFormula(
	ctx context.Context,
	results map[string]*qbtypes.Result,
	formula qbtypes.QueryBuilderFormula,
	_ *qbtypes.QueryRangeRequest,
) *qbtypes.Result {
	// Prepare time series data for formula evaluation
	timeSeriesData := make(map[string]*qbtypes.TimeSeriesData)

	// Extract time series data from results
	for queryName, result := range results {
		if tsData, ok := result.Value.(*qbtypes.TimeSeriesData); ok {
			timeSeriesData[queryName] = tsData
		}
	}

	// Create formula evaluator
	// TODO(srikanthccv): add conditional default zero
	canDefaultZero := make(map[string]bool)
	evaluator, err := qbtypes.NewFormulaEvaluator(formula.Expression, canDefaultZero)
	if err != nil {
		q.logger.ErrorContext(ctx, "failed to create formula evaluator", "error", err, "formula", formula.Name)
		return nil
	}

	// Evaluate the formula
	formulaSeries, err := evaluator.EvaluateFormula(timeSeriesData)
	if err != nil {
		q.logger.ErrorContext(ctx, "failed to evaluate formula", "error", err, "formula", formula.Name)
		return nil
	}

	// Create result for formula
	formulaResult := &qbtypes.TimeSeriesData{
		QueryName: formula.Name,
		Aggregations: []*qbtypes.AggregationBucket{
			{
				Index:  0,
				Series: formulaSeries,
			},
		},
	}

	// Apply functions if any
	result := &qbtypes.Result{
		Value: formulaResult,
	}

	if len(formula.Functions) > 0 {
		result = q.applyFunctions(result, formula.Functions)
	}

	return result
}

// filterDisabledQueries removes results for disabled queries
func (q *querier) filterDisabledQueries(results map[string]*qbtypes.Result, req *qbtypes.QueryRangeRequest) map[string]*qbtypes.Result {
	filtered := make(map[string]*qbtypes.Result)

	for _, query := range req.CompositeQuery.Queries {
		info := getqueryInfo(query.Spec)
		if !info.Disabled {
			if result, ok := results[info.Name]; ok {
				filtered[info.Name] = result
			}
		}
	}

	return filtered
}

// formatScalarResultsAsTable formats scalar results as a unified table for UI display
func (q *querier) formatScalarResultsAsTable(results map[string]*qbtypes.Result, _ *qbtypes.QueryRangeRequest) map[string]any {
	if len(results) == 0 {
		return map[string]any{"table": &qbtypes.ScalarData{}}
	}

	// Convert all results to ScalarData first
	scalarResults := make(map[string]*qbtypes.ScalarData)
	for name, result := range results {
		if sd, ok := result.Value.(*qbtypes.ScalarData); ok {
			scalarResults[name] = sd
		} else if tsData, ok := result.Value.(*qbtypes.TimeSeriesData); ok {
			scalarResults[name] = convertTimeSeriesDataToScalar(tsData, name)
		}
	}

	// If single result already has multiple queries, just deduplicate
	if len(scalarResults) == 1 {
		for _, sd := range scalarResults {
			if hasMultipleQueries(sd) {
				return map[string]any{"table": deduplicateRows(sd)}
			}
		}
	}

	// Otherwise merge all results
	merged := mergeScalarData(scalarResults)
	return map[string]any{"table": merged}
}

// convertTimeSeriesDataToScalar converts time series to scalar format
func convertTimeSeriesDataToScalar(tsData *qbtypes.TimeSeriesData, queryName string) *qbtypes.ScalarData {
	if tsData == nil || len(tsData.Aggregations) == 0 {
		return &qbtypes.ScalarData{QueryName: queryName}
	}

	columns := []*qbtypes.ColumnDescriptor{}

	// Add group columns from first series
	if len(tsData.Aggregations[0].Series) > 0 {
		for _, label := range tsData.Aggregations[0].Series[0].Labels {
			columns = append(columns, &qbtypes.ColumnDescriptor{
				TelemetryFieldKey: label.Key,
				QueryName:         queryName,
				Type:              qbtypes.ColumnTypeGroup,
			})
		}
	}

	// Add aggregation columns
	for _, agg := range tsData.Aggregations {
		name := agg.Alias
		if name == "" {
			name = fmt.Sprintf("__result_%d", agg.Index)
		}
		columns = append(columns, &qbtypes.ColumnDescriptor{
			TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: name},
			QueryName:         queryName,
			AggregationIndex:  int64(agg.Index),
			Meta:              agg.Meta,
			Type:              qbtypes.ColumnTypeAggregation,
		})
	}

	// Build rows
	data := [][]any{}
	for seriesIdx, series := range tsData.Aggregations[0].Series {
		row := make([]any, len(columns))

		// Add group values
		for i, label := range series.Labels {
			row[i] = label.Value
		}

		// Add aggregation values (last value)
		groupColCount := len(series.Labels)
		for aggIdx, agg := range tsData.Aggregations {
			if seriesIdx < len(agg.Series) && len(agg.Series[seriesIdx].Values) > 0 {
				lastValue := agg.Series[seriesIdx].Values[len(agg.Series[seriesIdx].Values)-1].Value
				row[groupColCount+aggIdx] = lastValue
			} else {
				row[groupColCount+aggIdx] = "n/a"
			}
		}

		data = append(data, row)
	}

	return &qbtypes.ScalarData{
		QueryName: queryName,
		Columns:   columns,
		Data:      data,
	}
}

// hasMultipleQueries checks if ScalarData contains columns from multiple queries
func hasMultipleQueries(sd *qbtypes.ScalarData) bool {
	queries := make(map[string]bool)
	for _, col := range sd.Columns {
		if col.Type == qbtypes.ColumnTypeAggregation && col.QueryName != "" {
			queries[col.QueryName] = true
		}
	}
	return len(queries) > 1
}

// deduplicateRows removes duplicate rows based on group columns
func deduplicateRows(sd *qbtypes.ScalarData) *qbtypes.ScalarData {
	// Find group column indices
	groupIndices := []int{}
	for i, col := range sd.Columns {
		if col.Type == qbtypes.ColumnTypeGroup {
			groupIndices = append(groupIndices, i)
		}
	}

	// Build unique rows map
	uniqueRows := make(map[string][]any)
	for _, row := range sd.Data {
		key := buildRowKey(row, groupIndices)
		if existing, found := uniqueRows[key]; found {
			// Merge non-n/a values
			for i, val := range row {
				if existing[i] == "n/a" && val != "n/a" {
					existing[i] = val
				}
			}
		} else {
			rowCopy := make([]any, len(row))
			copy(rowCopy, row)
			uniqueRows[key] = rowCopy
		}
	}

	// Convert back to slice
	data := make([][]any, 0, len(uniqueRows))
	for _, row := range uniqueRows {
		data = append(data, row)
	}

	// Sort by first aggregation column
	sortByFirstAggregation(data, sd.Columns)

	return &qbtypes.ScalarData{
		Columns: sd.Columns,
		Data:    data,
	}
}

// mergeScalarData merges multiple scalar data results
func mergeScalarData(results map[string]*qbtypes.ScalarData) *qbtypes.ScalarData {
	// Collect unique group columns
	groupCols := []string{}
	groupColMap := make(map[string]*qbtypes.ColumnDescriptor)

	for _, sd := range results {
		for _, col := range sd.Columns {
			if col.Type == qbtypes.ColumnTypeGroup {
				if _, exists := groupColMap[col.Name]; !exists {
					groupColMap[col.Name] = col
					groupCols = append(groupCols, col.Name)
				}
			}
		}
	}

	// Build final columns
	columns := []*qbtypes.ColumnDescriptor{}

	// Add group columns
	for _, name := range groupCols {
		columns = append(columns, groupColMap[name])
	}

	// Add aggregation columns from each query (sorted by query name)
	queryNames := make([]string, 0, len(results))
	for name := range results {
		queryNames = append(queryNames, name)
	}
	sort.Strings(queryNames)

	for _, queryName := range queryNames {
		sd := results[queryName]
		for _, col := range sd.Columns {
			if col.Type == qbtypes.ColumnTypeAggregation {
				columns = append(columns, col)
			}
		}
	}

	// Merge rows
	rowMap := make(map[string][]any)

	for queryName, sd := range results {
		// Create index mappings
		groupMap := make(map[string]int)
		for i, col := range sd.Columns {
			if col.Type == qbtypes.ColumnTypeGroup {
				groupMap[col.Name] = i
			}
		}

		// Process each row
		for _, row := range sd.Data {
			key := buildKeyFromGroupCols(row, groupMap, groupCols)

			if _, exists := rowMap[key]; !exists {
				// Initialize new row
				newRow := make([]any, len(columns))
				// Set group values
				for i, colName := range groupCols {
					if idx, ok := groupMap[colName]; ok && idx < len(row) {
						newRow[i] = row[idx]
					} else {
						newRow[i] = "n/a"
					}
				}
				// Initialize all aggregations to n/a
				for i := len(groupCols); i < len(columns); i++ {
					newRow[i] = "n/a"
				}
				rowMap[key] = newRow
			}

			// Set aggregation values for this query
			mergedRow := rowMap[key]
			colIdx := len(groupCols)
			for _, col := range columns[len(groupCols):] {
				if col.QueryName == queryName {
					// Find the value in the original row
					for i, origCol := range sd.Columns {
						if origCol.Type == qbtypes.ColumnTypeAggregation &&
							origCol.AggregationIndex == col.AggregationIndex {
							if i < len(row) {
								mergedRow[colIdx] = row[i]
							}
							break
						}
					}
				}
				colIdx++
			}
		}
	}

	// Convert to slice
	data := make([][]any, 0, len(rowMap))
	for _, row := range rowMap {
		data = append(data, row)
	}

	// Sort by first aggregation column
	sortByFirstAggregation(data, columns)

	return &qbtypes.ScalarData{
		Columns: columns,
		Data:    data,
	}
}

// buildRowKey builds a unique key from row values at specified indices
func buildRowKey(row []any, indices []int) string {
	parts := make([]string, len(indices))
	for i, idx := range indices {
		if idx < len(row) {
			parts[i] = fmt.Sprintf("%v", row[idx])
		} else {
			parts[i] = "n/a"
		}
	}
	return fmt.Sprintf("%v", parts)
}

// buildKeyFromGroupCols builds a key from group column values
func buildKeyFromGroupCols(row []any, groupMap map[string]int, groupCols []string) string {
	parts := make([]string, len(groupCols))
	for i, colName := range groupCols {
		if idx, ok := groupMap[colName]; ok && idx < len(row) {
			parts[i] = fmt.Sprintf("%v", row[idx])
		} else {
			parts[i] = "n/a"
		}
	}
	return fmt.Sprintf("%v", parts)
}

// sortByFirstAggregation sorts data by the first aggregation column (descending)
func sortByFirstAggregation(data [][]any, columns []*qbtypes.ColumnDescriptor) {
	// Find first aggregation column
	aggIdx := -1
	for i, col := range columns {
		if col.Type == qbtypes.ColumnTypeAggregation {
			aggIdx = i
			break
		}
	}

	if aggIdx < 0 {
		return
	}

	sort.SliceStable(data, func(i, j int) bool {
		return compareValues(data[i][aggIdx], data[j][aggIdx]) > 0
	})
}

// compareValues compares two values for sorting (handles n/a and numeric types)
func compareValues(a, b any) int {
	// Handle n/a values
	if a == "n/a" && b == "n/a" {
		return 0
	}
	if a == "n/a" {
		return -1
	}
	if b == "n/a" {
		return 1
	}

	// Compare numeric values
	aFloat, aOk := toFloat64(a)
	bFloat, bOk := toFloat64(b)

	if aOk && bOk {
		if aFloat > bFloat {
			return 1
		} else if aFloat < bFloat {
			return -1
		}
		return 0
	}

	// Fallback to string comparison
	return 0
}

// toFloat64 attempts to convert a value to float64
func toFloat64(v any) (float64, bool) {
	switch val := v.(type) {
	case float64:
		return val, true
	case int64:
		return float64(val), true
	case int:
		return float64(val), true
	case int32:
		return float64(val), true
	}
	return 0, false
}

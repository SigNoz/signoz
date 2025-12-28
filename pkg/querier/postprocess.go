package querier

import (
	"context"
	"fmt"
	"math"
	"slices"
	"sort"
	"strings"

	"github.com/SigNoz/govaluate"
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
	case qbtypes.QueryBuilderTraceOperator:
		return queryInfo{Name: s.Name, Disabled: s.Disabled, Step: s.StepInterval}
	case qbtypes.QueryBuilderFormula:
		return queryInfo{Name: s.Name, Disabled: s.Disabled}
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
		case qbtypes.QueryBuilderTraceOperator:
			if result, ok := typedResults[spec.Name]; ok {
				result = postProcessTraceOperator(q, result, spec, req)
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

		// merge result only needed for non-CH query
		if len(req.CompositeQuery.Queries) == 1 {
			if req.CompositeQuery.Queries[0].Type == qbtypes.QueryTypeClickHouseSQL {
				retResult := map[string]any{}
				for name, v := range typedResults {
					retResult[name] = v.Value
				}
				return retResult, nil
			}
		}

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

	if req.RequestType == qbtypes.RequestTypeTimeSeries && req.FormatOptions != nil && req.FormatOptions.FillGaps {
		for name := range typedResults {
			if req.SkipFillGaps(name) {
				continue
			}

			funcs := []qbtypes.Function{{Name: qbtypes.FunctionNameFillZero}}
			funcs = q.prepareFillZeroArgsWithStep(funcs, req, req.StepIntervalForQuery(name))
			// empty time series if it doesn't exist
			tsData, ok := typedResults[name].Value.(*qbtypes.TimeSeriesData)
			if !ok {
				tsData = &qbtypes.TimeSeriesData{}
			}

			if len(tsData.Aggregations) == 0 {
				numAgg := req.NumAggregationForQuery(name)
				tsData.Aggregations = make([]*qbtypes.AggregationBucket, numAgg)
				for idx := range numAgg {
					tsData.Aggregations[idx] = &qbtypes.AggregationBucket{
						Index: int(idx),
						Series: []*qbtypes.TimeSeries{
							{
								Labels: make([]*qbtypes.Label, 0),
								Values: make([]*qbtypes.TimeSeriesValue, 0),
							},
						},
					}
				}
			}

			typedResults[name] = q.applyFunctions(typedResults[name], funcs)
		}
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
	req *qbtypes.QueryRangeRequest,
) *qbtypes.Result {

	result = q.applySeriesLimit(result, query.Limit, query.Order)

	// Apply functions
	if len(query.Functions) > 0 {
		step := query.StepInterval.Duration.Milliseconds()
		functions := q.prepareFillZeroArgsWithStep(query.Functions, req, step)
		result = q.applyFunctions(result, functions)
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

	config := query.Aggregations[0]
	spaceAggOrderBy := fmt.Sprintf("%s(%s)", config.SpaceAggregation.StringValue(), config.MetricName)
	timeAggOrderBy := fmt.Sprintf("%s(%s)", config.TimeAggregation.StringValue(), config.MetricName)
	timeSpaceAggOrderBy := fmt.Sprintf("%s(%s(%s))", config.SpaceAggregation.StringValue(), config.TimeAggregation.StringValue(), config.MetricName)

	for idx := range query.Order {
		if query.Order[idx].Key.Name == spaceAggOrderBy ||
			query.Order[idx].Key.Name == timeAggOrderBy ||
			query.Order[idx].Key.Name == timeSpaceAggOrderBy {
			query.Order[idx].Key.Name = qbtypes.DefaultOrderByKey
		}
	}

	result = q.applySeriesLimit(result, query.Limit, query.Order)

	if len(query.Functions) > 0 {
		step := query.StepInterval.Duration.Milliseconds()
		functions := q.prepareFillZeroArgsWithStep(query.Functions, req, step)
		result = q.applyFunctions(result, functions)
	}

	// Apply reduce to for scalar request type
	if req.RequestType == qbtypes.RequestTypeScalar {
		if len(query.Aggregations) > 0 && query.Aggregations[0].ReduceTo != qbtypes.ReduceToUnknown {
			result = q.applyMetricReduceTo(result, query.Aggregations[0].ReduceTo)
		}
	}

	return result
}

// postProcessTraceOperator applies postprocessing to a trace operator query result
func postProcessTraceOperator(
	q *querier,
	result *qbtypes.Result,
	query qbtypes.QueryBuilderTraceOperator,
	req *qbtypes.QueryRangeRequest,
) *qbtypes.Result {

	result = q.applySeriesLimit(result, query.Limit, query.Order)

	// Apply functions if any
	if len(query.Functions) > 0 {
		step := query.StepInterval.Duration.Milliseconds()
		functions := q.prepareFillZeroArgsWithStep(query.Functions, req, step)
		result = q.applyFunctions(result, functions)
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

		for idx := range formula.Order {
			if formula.Order[idx].Key.Name == formula.Name || formula.Order[idx].Key.Name == formula.Expression {
				formula.Order[idx].Key.Name = qbtypes.DefaultOrderByKey
			}
		}

		// Check if we're dealing with time series or scalar data
		if req.RequestType == qbtypes.RequestTypeTimeSeries {
			result := q.processTimeSeriesFormula(ctx, results, formula, req)
			if result != nil {
				result = q.applySeriesLimit(result, formula.Limit, formula.Order)
				results[name] = result
			}
		} else if req.RequestType == qbtypes.RequestTypeScalar {
			result := q.processScalarFormula(ctx, results, formula, req)
			if result != nil {
				result = q.applySeriesLimit(result, formula.Limit, formula.Order)
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
	req *qbtypes.QueryRangeRequest,
) *qbtypes.Result {
	// Prepare time series data for formula evaluation
	timeSeriesData := make(map[string]*qbtypes.TimeSeriesData)

	// Extract time series data from results
	for queryName, result := range results {
		if tsData, ok := result.Value.(*qbtypes.TimeSeriesData); ok {
			timeSeriesData[queryName] = tsData
		}
	}

	canDefaultZero := req.GetQueriesSupportingZeroDefault()
	// Create formula evaluator
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
		// For formulas, calculate GCD of steps from queries in the expression
		step := q.calculateFormulaStep(formula.Expression, req)
		functions := q.prepareFillZeroArgsWithStep(formula.Functions, req, step)
		result = q.applyFunctions(result, functions)
	}

	return result
}

func (q *querier) processScalarFormula(
	ctx context.Context,
	results map[string]*qbtypes.Result,
	formula qbtypes.QueryBuilderFormula,
	req *qbtypes.QueryRangeRequest,
) *qbtypes.Result {
	// conver scalar data to time series format with zero timestamp
	// so we can run it through formula evaluator
	timeSeriesData := make(map[string]*qbtypes.TimeSeriesData)

	for queryName, result := range results {
		if scalarData, ok := result.Value.(*qbtypes.ScalarData); ok {
			// the scalar results would have just one point so negligible cost
			tsData := &qbtypes.TimeSeriesData{
				QueryName:    scalarData.QueryName,
				Aggregations: make([]*qbtypes.AggregationBucket, 0),
			}

			aggColumns := make(map[int]int) // aggregation index -> column index
			for colIdx, col := range scalarData.Columns {
				if col.Type == qbtypes.ColumnTypeAggregation {
					aggColumns[int(col.AggregationIndex)] = colIdx
				}
			}

			type labeledRowData struct {
				labels []*qbtypes.Label
				values map[int]float64 // aggregation index -> value
			}

			rowsByLabels := make(map[string]*labeledRowData)
			for _, row := range scalarData.Data {
				labels := make([]*qbtypes.Label, 0)
				for i, col := range scalarData.Columns {
					if col.Type == qbtypes.ColumnTypeGroup && i < len(row) {
						l := &qbtypes.Label{
							Key:   col.TelemetryFieldKey,
							Value: getPointerValue(row[i]),
						}

						labels = append(labels, l)
					}
				}

				labelKey := qbtypes.GetUniqueSeriesKey(labels)

				rowData, exists := rowsByLabels[labelKey]
				if !exists {
					rowData = &labeledRowData{
						labels: labels,
						values: make(map[int]float64),
					}
					rowsByLabels[labelKey] = rowData
				}

				for aggIdx, colIdx := range aggColumns {
					if colIdx < len(row) {
						if val, ok := toFloat64(row[colIdx]); ok {
							rowData.values[aggIdx] = val
						} else {
							q.logger.WarnContext(ctx, "skipped adding unrecognized value")
						}
					}
				}
			}

			labelKeys := make([]string, 0, len(rowsByLabels))
			for key := range rowsByLabels {
				labelKeys = append(labelKeys, key)
			}
			slices.Sort(labelKeys)

			aggIndices := make([]int, 0, len(aggColumns))
			for aggIdx := range aggColumns {
				aggIndices = append(aggIndices, aggIdx)
			}
			slices.Sort(aggIndices)

			for _, aggIdx := range aggIndices {
				colIdx := aggColumns[aggIdx]

				bucket := &qbtypes.AggregationBucket{
					Index:  aggIdx,
					Alias:  scalarData.Columns[colIdx].Name,
					Meta:   scalarData.Columns[colIdx].Meta,
					Series: make([]*qbtypes.TimeSeries, 0),
				}

				for _, labelKey := range labelKeys {
					rowData := rowsByLabels[labelKey]

					if val, exists := rowData.values[aggIdx]; exists {
						series := &qbtypes.TimeSeries{
							Labels: rowData.labels,
							Values: []*qbtypes.TimeSeriesValue{{
								Timestamp: 0,
								Value:     val,
							}},
						}
						bucket.Series = append(bucket.Series, series)
					}
				}

				tsData.Aggregations = append(tsData.Aggregations, bucket)
			}

			timeSeriesData[queryName] = tsData
		}
	}

	canDefaultZero := req.GetQueriesSupportingZeroDefault()
	evaluator, err := qbtypes.NewFormulaEvaluator(formula.Expression, canDefaultZero)
	if err != nil {
		q.logger.ErrorContext(ctx, "failed to create formula evaluator", "error", err, "formula", formula.Name)
		return nil
	}

	formulaSeries, err := evaluator.EvaluateFormula(timeSeriesData)
	if err != nil {
		q.logger.ErrorContext(ctx, "failed to evaluate formula", "error", err, "formula", formula.Name)
		return nil
	}

	// Convert back to scalar format
	scalarResult := &qbtypes.ScalarData{
		QueryName: formula.Name,
		Columns:   make([]*qbtypes.ColumnDescriptor, 0),
		Data:      make([][]any, 0),
	}

	if len(formulaSeries) > 0 && len(formulaSeries[0].Labels) > 0 {
		for _, label := range formulaSeries[0].Labels {
			scalarResult.Columns = append(scalarResult.Columns, &qbtypes.ColumnDescriptor{
				TelemetryFieldKey: label.Key,
				QueryName:         formula.Name,
				Type:              qbtypes.ColumnTypeGroup,
			})
		}
	}

	scalarResult.Columns = append(scalarResult.Columns, &qbtypes.ColumnDescriptor{
		TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "__result"},
		QueryName:         formula.Name,
		AggregationIndex:  0,
		Type:              qbtypes.ColumnTypeAggregation,
	})

	for _, series := range formulaSeries {
		row := make([]any, len(scalarResult.Columns))

		for i, label := range series.Labels {
			if i < len(row)-1 {
				row[i] = label.Value
			}
		}

		if len(series.Values) > 0 {
			row[len(row)-1] = series.Values[0].Value
		} else {
			row[len(row)-1] = "n/a"
		}

		scalarResult.Data = append(scalarResult.Data, row)
	}

	return &qbtypes.Result{
		Value: scalarResult,
	}
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
	val := numericAsFloat(getPointerValue(v))
	if math.IsNaN(val) {
		return 0, false
	}
	return val, true
}

func gcd(a, b int64) int64 {
	if b == 0 {
		return a
	}
	return gcd(b, a%b)
}

// prepareFillZeroArgsWithStep prepares fillZero function arguments with a specific step
func (q *querier) prepareFillZeroArgsWithStep(functions []qbtypes.Function, req *qbtypes.QueryRangeRequest, step int64) []qbtypes.Function {
	needsCopy := false
	for _, fn := range functions {
		if fn.Name == qbtypes.FunctionNameFillZero && len(fn.Args) == 0 {
			needsCopy = true
			break
		}
	}

	if !needsCopy {
		return functions
	}

	updatedFunctions := make([]qbtypes.Function, len(functions))
	copy(updatedFunctions, functions)

	for i, fn := range updatedFunctions {
		if fn.Name == qbtypes.FunctionNameFillZero && len(fn.Args) == 0 {
			fn.Args = []qbtypes.FunctionArg{
				{Value: float64(req.Start)},
				{Value: float64(req.End)},
				{Value: float64(step)},
			}
			updatedFunctions[i] = fn
		}
	}

	return updatedFunctions
}

// calculateFormulaStep calculates the GCD of steps from queries referenced in the formula
func (q *querier) calculateFormulaStep(expression string, req *qbtypes.QueryRangeRequest) int64 {
	parsedExpr, err := govaluate.NewEvaluableExpression(expression)
	if err != nil {
		return 60000
	}

	variables := parsedExpr.Vars()

	// Extract base query names (e.g., "A" from "A.0" or "A.my_alias")
	queryNames := make(map[string]bool)
	for _, variable := range variables {
		// Split by "." to get the base query name
		parts := strings.Split(variable, ".")
		if len(parts) > 0 {
			queryNames[parts[0]] = true
		}
	}

	var steps []int64

	for _, query := range req.CompositeQuery.Queries {
		info := getqueryInfo(query.Spec)
		if queryNames[info.Name] && info.Step.Duration > 0 {
			stepMs := info.Step.Duration.Milliseconds()
			if stepMs > 0 {
				steps = append(steps, stepMs)
			}
		}
	}

	if len(steps) == 0 {
		return 60000
	}

	// Calculate GCD of all steps
	result := steps[0]
	for i := 1; i < len(steps); i++ {
		result = gcd(result, steps[i])
	}

	return result
}

package querier

import (
	"fmt"
	"math"
	"sort"
	"strings"
	"time"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

// fillGaps fills missing data points with zeros in time series data
func (q *querier) fillGaps(results map[string]*qbtypes.Result, req *qbtypes.QueryRangeRequest) map[string]*qbtypes.Result {
	// Only fill gaps for time series data
	if req.RequestType != qbtypes.RequestTypeTimeSeries {
		return results
	}

	// Get the step interval from the first query
	var step int64 = 60000 // Default to 1 minute in milliseconds
	for _, query := range req.CompositeQuery.Queries {
		switch spec := query.Spec.(type) {
		case qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]:
			if spec.StepInterval.Duration > 0 {
				step = int64(spec.StepInterval.Duration) / int64(time.Millisecond)
				break
			}
		case qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]:
			if spec.StepInterval.Duration > 0 {
				step = int64(spec.StepInterval.Duration) / int64(time.Millisecond)
				break
			}
		case qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]:
			if spec.StepInterval.Duration > 0 {
				step = int64(spec.StepInterval.Duration) / int64(time.Millisecond)
				break
			}
		}
	}

	startMs := int64(req.Start)
	endMs := int64(req.End)

	for name, result := range results {
		tsData, ok := result.Value.(*qbtypes.TimeSeriesData)
		if !ok || tsData == nil {
			continue
		}

		// If no aggregations, create an empty one
		if len(tsData.Aggregations) == 0 {
			tsData.Aggregations = []*qbtypes.AggregationBucket{
				{
					Index: 0,
					Series: []*qbtypes.TimeSeries{
						{
							Labels: []*qbtypes.Label{},
							Values: fillGapForSeries(nil, startMs, endMs, step),
						},
					},
				},
			}
			continue
		}

		// Fill gaps for each series
		for _, agg := range tsData.Aggregations {
			if len(agg.Series) == 0 {
				// Create empty series if none exist
				agg.Series = []*qbtypes.TimeSeries{
					{
						Labels: []*qbtypes.Label{},
						Values: fillGapForSeries(nil, startMs, endMs, step),
					},
				}
			} else {
				// Fill gaps for existing series
				for _, series := range agg.Series {
					series.Values = fillGapForSeries(series.Values, startMs, endMs, step)
				}
			}
		}

		results[name] = result
	}

	return results
}

// fillGapForSeries fills gaps in a single time series
func fillGapForSeries(values []*qbtypes.TimeSeriesValue, startMs, endMs, step int64) []*qbtypes.TimeSeriesValue {
	// Safeguard against invalid step
	if step <= 0 {
		step = 60000 // Default to 1 minute
	}

	// Create a map of existing values
	valueMap := make(map[int64]float64)
	for _, v := range values {
		if v != nil && !v.Partial {
			valueMap[v.Timestamp] = v.Value
		}
	}

	// Generate all expected timestamps
	var filledValues []*qbtypes.TimeSeriesValue
	for ts := startMs; ts <= endMs; ts += step {
		value := 0.0
		if v, ok := valueMap[ts]; ok {
			value = v
		}

		filledValues = append(filledValues, &qbtypes.TimeSeriesValue{
			Timestamp: ts,
			Value:     value,
		})
	}

	return filledValues
}

// formatScalarResultsAsTable formats scalar results as a table for UI display
func (q *querier) formatScalarResultsAsTable(results map[string]*qbtypes.Result, req *qbtypes.QueryRangeRequest) map[string]any {
	if len(results) == 0 {
		return map[string]any{"table": &qbtypes.ScalarData{}}
	}

	// Convert all results to ScalarData first
	for name, result := range results {
		if tsData, ok := result.Value.(*qbtypes.TimeSeriesData); ok {
			// Convert TimeSeriesData to ScalarData
			columns := []*qbtypes.ColumnDescriptor{}
			data := [][]any{}

			// Extract group columns from labels
			if len(tsData.Aggregations) > 0 && len(tsData.Aggregations[0].Series) > 0 {
				// Get group columns from the first series
				for _, label := range tsData.Aggregations[0].Series[0].Labels {
					col := &qbtypes.ColumnDescriptor{
						TelemetryFieldKey: label.Key,
						QueryName:         name,
						Type:              qbtypes.ColumnTypeGroup,
					}
					// Ensure Name is set
					if col.Name == "" {
						col.Name = label.Key.Name
					}
					columns = append(columns, col)
				}
			}

			// Add aggregation columns
			for _, agg := range tsData.Aggregations {
				col := &qbtypes.ColumnDescriptor{
					TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
						Name: agg.Alias,
					},
					QueryName:        name,
					AggregationIndex: int64(agg.Index),
					Meta:             agg.Meta,
					Type:             qbtypes.ColumnTypeAggregation,
				}
				if col.Name == "" {
					col.Name = fmt.Sprintf("__result_%d", agg.Index)
				}
				columns = append(columns, col)
			}

			// Convert series to rows
			for seriesIdx, series := range tsData.Aggregations[0].Series {
				row := make([]any, len(columns))
				colIdx := 0

				// Add group values
				for _, label := range series.Labels {
					row[colIdx] = label.Value
					colIdx++
				}

				// Add aggregation values (last value from each aggregation)
				for _, agg := range tsData.Aggregations {
					if seriesIdx < len(agg.Series) && len(agg.Series[seriesIdx].Values) > 0 {
						value := agg.Series[seriesIdx].Values[len(agg.Series[seriesIdx].Values)-1].Value
						row[colIdx] = roundToTwoDecimal(value)
					} else {
						row[colIdx] = 0.0
					}
					colIdx++
				}

				data = append(data, row)
			}

			results[name] = &qbtypes.Result{
				Value: &qbtypes.ScalarData{
					Columns: columns,
					Data:    data,
				},
			}
		}
	}

	// Check if we have a single result that already contains all columns from multiple queries
	// This happens when the SQL query already joins multiple queries
	if len(results) == 1 {
		for queryName, result := range results {
			if scalarData, ok := result.Value.(*qbtypes.ScalarData); ok {
				// Check if this result already has columns from multiple queries
				queryNamesInColumns := make(map[string]bool)
				for _, col := range scalarData.Columns {
					if col.Type == qbtypes.ColumnTypeAggregation && col.QueryName != "" {
						queryNamesInColumns[col.QueryName] = true
					}
				}

				// Debug: log what we found
				if q.logger != nil {
					q.logger.Debug("Single result analysis",
						"queryNamesInColumns", queryNamesInColumns,
						"num_columns", len(scalarData.Columns),
						"num_rows", len(scalarData.Data))
				}

				// If we have columns from multiple queries, we need to deduplicate rows
				if len(queryNamesInColumns) > 1 {
					if q.logger != nil {
						q.logger.Debug("Deduplicating scalar rows")
					}
					deduplicatedResult := q.deduplicateScalarRows(scalarData)
					// Return the deduplicated result under the original query name
					return map[string]any{queryName: deduplicatedResult["table"]}
				}
			}
		}
	}

	// Now merge all ScalarData results
	// First, collect all unique group columns
	groupColumnMap := make(map[string]*qbtypes.ColumnDescriptor)
	groupColumnOrder := []string{}

	for _, result := range results {
		if scalarData, ok := result.Value.(*qbtypes.ScalarData); ok {
			for _, col := range scalarData.Columns {
				if col.Type == qbtypes.ColumnTypeGroup {
					if _, exists := groupColumnMap[col.Name]; !exists {
						groupColumnMap[col.Name] = col
						groupColumnOrder = append(groupColumnOrder, col.Name)
						if q.logger != nil {
							q.logger.Debug("Found group column", "name", col.Name)
						}
					}
				}
			}
		}
	}

	// Debug: log the group columns we found
	if q.logger != nil {
		q.logger.Debug("Group columns collected",
			"groupColumnOrder", groupColumnOrder,
			"num_group_columns", len(groupColumnOrder))
	}

	// Build final columns
	mergedColumns := []*qbtypes.ColumnDescriptor{}

	// Add group columns
	for _, colName := range groupColumnOrder {
		mergedColumns = append(mergedColumns, groupColumnMap[colName])
	}

	// Add aggregation columns from each query
	queryNames := []string{}
	for name := range results {
		queryNames = append(queryNames, name)
	}
	sort.Strings(queryNames)

	for _, queryName := range queryNames {
		result := results[queryName]
		if scalarData, ok := result.Value.(*qbtypes.ScalarData); ok {
			for _, col := range scalarData.Columns {
				if col.Type == qbtypes.ColumnTypeAggregation {
					newCol := &qbtypes.ColumnDescriptor{
						TelemetryFieldKey: col.TelemetryFieldKey,
						QueryName:         queryName,
						AggregationIndex:  col.AggregationIndex,
						Meta:              col.Meta,
						Type:              qbtypes.ColumnTypeAggregation,
					}
					mergedColumns = append(mergedColumns, newCol)
				}
			}
		}
	}

	// Build a map of unique rows by group values
	type rowKey struct {
		values []string
	}
	rowMap := make(map[string][]any)

	// Debug: log the input data
	if q.logger != nil {
		for _, queryName := range queryNames {
			if scalarData, ok := results[queryName].Value.(*qbtypes.ScalarData); ok {
				q.logger.Debug("Processing query result",
					"query", queryName,
					"num_columns", len(scalarData.Columns),
					"num_rows", len(scalarData.Data),
					"columns", func() []string {
						names := []string{}
						for _, col := range scalarData.Columns {
							names = append(names, fmt.Sprintf("%s(%s)", col.Name, col.Type))
						}
						return names
					}())
			}
		}
	}

	// Process each query's results
	for _, queryName := range queryNames {
		result := results[queryName]
		if scalarData, ok := result.Value.(*qbtypes.ScalarData); ok {
			// Map column indices
			groupIndices := make(map[string]int)
			aggIndices := []int{}

			for i, col := range scalarData.Columns {
				if col.Type == qbtypes.ColumnTypeGroup {
					groupIndices[col.Name] = i
				} else if col.Type == qbtypes.ColumnTypeAggregation {
					aggIndices = append(aggIndices, i)
				}
			}

			// Process each row
			for rowIdx, row := range scalarData.Data {
				// Build key from group values in consistent order
				keyParts := make([]string, len(groupColumnOrder))
				for i, colName := range groupColumnOrder {
					if idx, ok := groupIndices[colName]; ok && idx < len(row) {
						// Convert the value to string properly
						switch v := row[idx].(type) {
						case string:
							keyParts[i] = v
						case *string:
							if v != nil {
								keyParts[i] = *v
							} else {
								keyParts[i] = "n/a"
							}
						default:
							keyParts[i] = fmt.Sprintf("%v", v)
						}
					} else {
						keyParts[i] = "n/a"
					}
				}

				// Debug first few rows
				if q.logger != nil && rowIdx < 3 {
					q.logger.Debug("Building key",
						"query", queryName,
						"rowIdx", rowIdx,
						"groupColumnOrder", groupColumnOrder,
						"groupIndices", groupIndices,
						"row", row,
						"keyParts", keyParts)
				}
				// Create a unique key by joining parts with a delimiter
				key := ""
				for i, part := range keyParts {
					if i > 0 {
						key += "|"
					}
					key += part
				}

				// Debug: log the key generation
				if q.logger != nil {
					q.logger.Debug("Generated row key",
						"query", queryName,
						"key", key,
						"keyParts", strings.Join(keyParts, ","),
						"numKeyParts", len(keyParts),
						"firstRowValue", func() string {
							if len(row) > 0 {
								return fmt.Sprintf("%v", row[0])
							}
							return "empty"
						}())
				}

				// Initialize row if needed
				if _, exists := rowMap[key]; !exists {
					rowMap[key] = make([]any, len(mergedColumns))
					// Set group values
					for i, colName := range groupColumnOrder {
						if idx, ok := groupIndices[colName]; ok && idx < len(row) {
							// Store the actual value, not a pointer
							switch v := row[idx].(type) {
							case *string:
								if v != nil {
									rowMap[key][i] = *v
								} else {
									rowMap[key][i] = "n/a"
								}
							default:
								rowMap[key][i] = v
							}
						} else {
							rowMap[key][i] = "n/a"
						}
					}
					// Initialize all aggregation values to "n/a"
					for i := len(groupColumnOrder); i < len(mergedColumns); i++ {
						rowMap[key][i] = "n/a"
					}
				}

				// Set aggregation values for this query
				aggStartIdx := len(groupColumnOrder)
				for _, queryName2 := range queryNames {
					if queryName2 == queryName {
						// Copy aggregation values
						for i, aggIdx := range aggIndices {
							if aggIdx < len(row) {
								rowMap[key][aggStartIdx+i] = row[aggIdx]
							}
						}
						break
					}
					// Skip columns for other queries
					result2 := results[queryName2]
					if scalarData2, ok := result2.Value.(*qbtypes.ScalarData); ok {
						aggCount := 0
						for _, col := range scalarData2.Columns {
							if col.Type == qbtypes.ColumnTypeAggregation {
								aggCount++
							}
						}
						aggStartIdx += aggCount
					}
				}
			}
		}
	}

	// Convert map to slice
	mergedData := [][]any{}
	for _, row := range rowMap {
		mergedData = append(mergedData, row)
	}

	// Sort rows by first aggregation column (descending)
	if len(mergedColumns) > len(groupColumnOrder) {
		sort.SliceStable(mergedData, func(i, j int) bool {
			valI := mergedData[i][len(groupColumnOrder)]
			valJ := mergedData[j][len(groupColumnOrder)]

			// Handle n/a values
			if valI == "n/a" {
				return false
			}
			if valJ == "n/a" {
				return true
			}

			// Compare numeric values
			switch vI := valI.(type) {
			case float64:
				if vJ, ok := valJ.(float64); ok {
					return vI > vJ
				}
			case int64:
				if vJ, ok := valJ.(int64); ok {
					return vI > vJ
				}
			case int:
				if vJ, ok := valJ.(int); ok {
					return vI > vJ
				}
			}

			return false
		})
	}

	return map[string]any{
		"table": &qbtypes.ScalarData{
			Columns: mergedColumns,
			Data:    mergedData,
		},
	}
}

// sortTableRows sorts the table rows based on the query order
func sortTableRows(rows [][]any, columns []*qbtypes.ColumnDescriptor, req *qbtypes.QueryRangeRequest) {
	// Get query names in order
	var queryNames []string
	for _, query := range req.CompositeQuery.Queries {
		switch spec := query.Spec.(type) {
		case qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]:
			queryNames = append(queryNames, spec.Name)
		case qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]:
			queryNames = append(queryNames, spec.Name)
		case qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]:
			queryNames = append(queryNames, spec.Name)
		}
	}

	// Create a map of column indices by query name
	columnIndices := make(map[string][]int)
	for i, col := range columns {
		if col.Type == qbtypes.ColumnTypeAggregation && col.QueryName != "" {
			columnIndices[col.QueryName] = append(columnIndices[col.QueryName], i)
		}
	}

	// Sort in reverse order of query names (stable sort)
	for i := len(queryNames) - 1; i >= 0; i-- {
		queryName := queryNames[i]
		indices, ok := columnIndices[queryName]
		if !ok || len(indices) == 0 {
			continue
		}

		// Use the first aggregation column for this query
		colIdx := indices[0]

		sort.SliceStable(rows, func(i, j int) bool {
			valI := rows[i][colIdx]
			valJ := rows[j][colIdx]

			// Handle n/a values
			if valI == "n/a" && valJ == "n/a" {
				return false
			}
			if valI == "n/a" {
				return false
			}
			if valJ == "n/a" {
				return true
			}

			// Compare numeric values (default descending)
			if numI, ok := valI.(float64); ok {
				if numJ, ok := valJ.(float64); ok {
					return numI > numJ
				}
			}

			// Compare int64 values
			if numI, ok := valI.(int64); ok {
				if numJ, ok := valJ.(int64); ok {
					return numI > numJ
				}
			}

			// Compare int values
			if numI, ok := valI.(int); ok {
				if numJ, ok := valJ.(int); ok {
					return numI > numJ
				}
			}

			return false
		})
	}
}

// deduplicateScalarRows deduplicates rows in a ScalarData that already contains columns from multiple queries
func (q *querier) deduplicateScalarRows(data *qbtypes.ScalarData) map[string]any {
	// First, identify group columns
	groupColumnIndices := []int{}
	for i, col := range data.Columns {
		if col.Type == qbtypes.ColumnTypeGroup {
			groupColumnIndices = append(groupColumnIndices, i)
		}
	}

	// Build a map to merge rows by group key
	rowMap := make(map[string][]any)

	for _, row := range data.Data {
		// Build key from group values
		keyParts := make([]string, len(groupColumnIndices))
		for i, colIdx := range groupColumnIndices {
			if colIdx < len(row) {
				// Convert the value to string properly
				switch v := row[colIdx].(type) {
				case string:
					keyParts[i] = v
				case *string:
					if v != nil {
						keyParts[i] = *v
					} else {
						keyParts[i] = "n/a"
					}
				default:
					keyParts[i] = fmt.Sprintf("%v", v)
				}
			} else {
				keyParts[i] = "n/a"
			}
		}
		key := strings.Join(keyParts, "|")

		if existingRow, exists := rowMap[key]; exists {
			// Merge this row with existing row
			// Replace "n/a" values with actual values
			for i, val := range row {
				if existingRow[i] == "n/a" && val != "n/a" {
					existingRow[i] = val
				}
			}
		} else {
			// First time seeing this key, store the row
			rowCopy := make([]any, len(row))
			copy(rowCopy, row)
			rowMap[key] = rowCopy
		}
	}

	// Convert map back to slice
	mergedData := make([][]any, 0, len(rowMap))
	for _, row := range rowMap {
		mergedData = append(mergedData, row)
	}

	// Sort by first aggregation column if available
	firstAggCol := -1
	for i, col := range data.Columns {
		if col.Type == qbtypes.ColumnTypeAggregation {
			firstAggCol = i
			break
		}
	}

	if firstAggCol >= 0 {
		sort.SliceStable(mergedData, func(i, j int) bool {
			valI := mergedData[i][firstAggCol]
			valJ := mergedData[j][firstAggCol]

			// Handle n/a values
			if valI == "n/a" {
				return false
			}
			if valJ == "n/a" {
				return true
			}

			// Compare numeric values
			switch vI := valI.(type) {
			case float64:
				if vJ, ok := valJ.(float64); ok {
					return vI > vJ
				}
			case int64:
				if vJ, ok := valJ.(int64); ok {
					return vI > vJ
				}
			case int:
				if vJ, ok := valJ.(int); ok {
					return vI > vJ
				}
			}

			return false
		})
	}

	return map[string]any{
		"table": &qbtypes.ScalarData{
			Columns: data.Columns,
			Data:    mergedData,
		},
	}
}

// roundToTwoDecimal rounds a number to two decimal places
func roundToTwoDecimal(number float64) float64 {
	// Handle very small numbers
	if math.Abs(number) < 0.000001 {
		return 0
	}

	// Determine the number of decimal places to round to
	decimalPlaces := 2
	if math.Abs(number) < 0.01 {
		decimalPlaces = int(math.Ceil(-math.Log10(math.Abs(number)))) + 1
	}

	// Round to the determined number of decimal places
	scale := math.Pow(10, float64(decimalPlaces))
	return math.Round(number*scale) / scale
}

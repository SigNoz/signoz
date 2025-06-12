package querier

import (
	"fmt"
	"math"
	"sort"
	"strings"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

// PostProcessResults applies postprocessing to query results
func (q *querier) PostProcessResults(results map[string]any, req *qbtypes.QueryRangeRequest) (map[string]any, error) {
	// Convert results to typed format for processing
	typedResults := make(map[string]*qbtypes.Result)
	for name, result := range results {
		typedResults[name] = &qbtypes.Result{
			Value: result,
		}
	}

	// Apply postprocessing based on query types
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
	typedResults = q.applyFormulas(typedResults, req)

	// Filter out disabled queries
	typedResults = q.filterDisabledQueries(typedResults, req)

	// Apply fill gaps if requested
	if req.FormatOptions != nil && req.FormatOptions.FillGaps {
		typedResults = q.fillGaps(typedResults, req)
	}

	// Apply table formatting for UI if requested
	if req.FormatOptions != nil && req.FormatOptions.FormatTableResultForUI && req.RequestType == qbtypes.RequestTypeScalar {
		// Format results as a table - this merges all queries into a single table
		tableResult := q.formatScalarResultsAsTable(typedResults, req)

		// Return the table under the first query's name so it gets included in results
		if len(req.CompositeQuery.Queries) > 0 {
			var firstQueryName string
			switch spec := req.CompositeQuery.Queries[0].Spec.(type) {
			case qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]:
				firstQueryName = spec.Name
			case qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]:
				firstQueryName = spec.Name
			case qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]:
				firstQueryName = spec.Name
			}

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
	req *qbtypes.QueryRangeRequest,
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
	// Apply having clause
	result = q.applyHavingClause(result, query.Having)

	// Apply series limit
	if query.Limit > 0 {
		result = q.applySeriesLimit(result, query.Limit, query.Order)
	}

	// Apply functions
	if len(query.Functions) > 0 {
		result = q.applyFunctions(result, query.Functions)
	}

	// Apply reduce to for scalar request type
	if req.RequestType == qbtypes.RequestTypeScalar {
		// For metrics, prefer the ReduceTo field from first aggregation if set
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

	return result
}

// applyHavingClause filters results based on having conditions
func (q *querier) applyHavingClause(result *qbtypes.Result, having *qbtypes.Having) *qbtypes.Result {
	// TODO: Implement having clause evaluation once expression parser is available
	// For now, we skip having clause processing
	return result
}

// evaluateHavingExpression evaluates a having expression
// TODO: Implement this once we have an expression parser for having clauses
func evaluateHavingExpression(value float64, expression string) bool {
	// For now, always return true (no filtering)
	return true
}

// applySeriesLimit limits the number of series in the result
func (q *querier) applySeriesLimit(result *qbtypes.Result, limit int, orderBy []qbtypes.OrderBy) *qbtypes.Result {
	tsData, ok := result.Value.(*qbtypes.TimeSeriesData)
	if !ok {
		return result
	}

	if tsData != nil {
		for _, agg := range tsData.Aggregations {
			if len(agg.Series) <= limit {
				continue
			}

			// Sort series based on orderBy
			q.sortSeries(agg.Series, orderBy)

			// Keep only the top 'limit' series
			agg.Series = agg.Series[:limit]
		}
	}

	return result
}

// sortSeries sorts time series based on orderBy criteria
func (q *querier) sortSeries(series []*qbtypes.TimeSeries, orderBy []qbtypes.OrderBy) {
	if len(orderBy) == 0 {
		// Default: sort by value (average) in descending order
		sort.SliceStable(series, func(i, j int) bool {
			avgI := calculateAverage(series[i].Values)
			avgJ := calculateAverage(series[j].Values)
			return avgI > avgJ
		})
		return
	}

	// Sort by specified criteria
	sort.SliceStable(series, func(i, j int) bool {
		for _, order := range orderBy {
			cmp := 0

			if order.Key.Name == "#value" {
				// Sort by value
				avgI := calculateAverage(series[i].Values)
				avgJ := calculateAverage(series[j].Values)
				if avgI < avgJ {
					cmp = -1
				} else if avgI > avgJ {
					cmp = 1
				}
			} else {
				// Sort by label
				valI := getLabelValue(series[i].Labels, order.Key.Name)
				valJ := getLabelValue(series[j].Labels, order.Key.Name)
				cmp = strings.Compare(valI, valJ)
			}

			if cmp != 0 {
				if order.Direction == qbtypes.OrderDirectionAsc {
					return cmp < 0
				}
				return cmp > 0
			}
		}
		return false
	})
}

// calculateAverage calculates the average of time series values
func calculateAverage(values []*qbtypes.TimeSeriesValue) float64 {
	if len(values) == 0 {
		return 0
	}

	sum := 0.0
	count := 0
	for _, v := range values {
		if !math.IsNaN(v.Value) && !math.IsInf(v.Value, 0) {
			sum += v.Value
			count++
		}
	}

	if count == 0 {
		return 0
	}

	return sum / float64(count)
}

// getLabelValue gets the value of a label by name
func getLabelValue(labels []*qbtypes.Label, name string) string {
	for _, label := range labels {
		if label.Key.Name == name {
			return fmt.Sprintf("%v", label.Value)
		}
	}
	return ""
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

// applyReduceTo reduces time series to a single value
func (q *querier) applyReduceTo(result *qbtypes.Result, secondaryAggs []qbtypes.SecondaryAggregation) *qbtypes.Result {
	tsData, ok := result.Value.(*qbtypes.TimeSeriesData)
	if !ok {
		return result
	}

	// For now, we'll use the first secondary aggregation's expression
	// In the future, this might need to handle multiple secondary aggregations
	expression := ""
	if len(secondaryAggs) > 0 {
		expression = secondaryAggs[0].Expression
	}

	if expression == "" {
		return result
	}

	// Map expression to reduce operation
	var reduceOp qbtypes.ReduceTo
	switch expression {
	case "last":
		reduceOp = qbtypes.ReduceToLast
	case "sum":
		reduceOp = qbtypes.ReduceToSum
	case "avg":
		reduceOp = qbtypes.ReduceToAvg
	case "min":
		reduceOp = qbtypes.ReduceToMin
	case "max":
		reduceOp = qbtypes.ReduceToMax
	default:
		// Unknown reduce operation, return as-is
		return result
	}

	for _, agg := range tsData.Aggregations {
		for i, series := range agg.Series {
			// Use the FunctionReduceTo helper
			reducedSeries := qbtypes.FunctionReduceTo(series, reduceOp)
			agg.Series[i] = reducedSeries
		}
	}

	return result
}

package querier

import (
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

// applyFormulas processes formula queries in the composite query
func (q *querier) applyFormulas(results map[string]*qbtypes.Result, req *qbtypes.QueryRangeRequest) map[string]*qbtypes.Result {
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
		// Prepare time series data for formula evaluation
		timeSeriesData := make(map[string]*qbtypes.TimeSeriesData)

		// Extract time series data from results
		for queryName, result := range results {
			if tsData, ok := result.Value.(*qbtypes.TimeSeriesData); ok {
				timeSeriesData[queryName] = tsData
			}
		}

		// Create formula evaluator
		canDefaultZero := make(map[string]bool)
		for _, query := range req.CompositeQuery.Queries {
			switch spec := query.Spec.(type) {
			case qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]:
				// Metrics can default to zero for rate/increase operations
				canDefaultZero[spec.Name] = true
			case qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]:
				canDefaultZero[spec.Name] = false
			case qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]:
				canDefaultZero[spec.Name] = false
			}
		}

		evaluator, err := qbtypes.NewFormulaEvaluator(formula.Expression, canDefaultZero)
		if err != nil {
			q.logger.Error("failed to create formula evaluator", "error", err, "formula", name)
			continue
		}

		// Evaluate the formula
		formulaSeries, err := evaluator.EvaluateFormula(timeSeriesData)
		if err != nil {
			q.logger.Error("failed to evaluate formula", "error", err, "formula", name)
			continue
		}

		// Create result for formula
		formulaResult := &qbtypes.TimeSeriesData{
			QueryName: name,
			Aggregations: []*qbtypes.AggregationBucket{
				{
					Index:  0,
					Series: formulaSeries,
				},
			},
		}

		// Apply functions if any
		if len(formula.Functions) > 0 {
			for _, agg := range formulaResult.Aggregations {
				for i, series := range agg.Series {
					agg.Series[i] = qbtypes.ApplyFunctions(formula.Functions, series)
				}
			}
		}

		results[name] = &qbtypes.Result{
			Value: formulaResult,
		}
	}

	return results
}

// filterDisabledQueries removes results for disabled queries
func (q *querier) filterDisabledQueries(results map[string]*qbtypes.Result, req *qbtypes.QueryRangeRequest) map[string]*qbtypes.Result {
	filtered := make(map[string]*qbtypes.Result)

	for _, query := range req.CompositeQuery.Queries {
		var queryName string
		var disabled bool

		switch spec := query.Spec.(type) {
		case qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]:
			queryName = spec.Name
			disabled = spec.Disabled
		case qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]:
			queryName = spec.Name
			disabled = spec.Disabled
		case qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]:
			queryName = spec.Name
			disabled = spec.Disabled
		case qbtypes.QueryBuilderFormula:
			queryName = spec.Name
			// Formulas don't have a disabled flag, include them
			disabled = false
		case qbtypes.PromQuery:
			queryName = spec.Name
			disabled = spec.Disabled
		case qbtypes.ClickHouseQuery:
			queryName = spec.Name
			disabled = spec.Disabled
		}

		if !disabled {
			if result, ok := results[queryName]; ok {
				filtered[queryName] = result
			}
		}
	}

	return filtered
}

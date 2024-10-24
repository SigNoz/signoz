package postprocess

import (
	"github.com/SigNoz/govaluate"
	"go.signoz.io/signoz/pkg/query-service/app/queryBuilder"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"go.uber.org/zap"
)

// postProcessResult applies having clause, metric limit, reduce function to the result
// This function is effective for metrics data source for now, but it can be extended to other data sources
// if needed
// Much of this work can be done in the ClickHouse query, but we decided to do it here because:
// 1. Effective use of caching
// 2. Easier to add new functions
func PostProcessResult(result []*v3.Result, queryRangeParams *v3.QueryRangeParamsV3) ([]*v3.Result, error) {
	// Having clause is not part of the clickhouse query, so we need to apply it here
	// It's not included in the query because it doesn't work nicely with caching
	// With this change, if you have a query with a having clause, and then you change the having clause
	// to something else, the query will still be cached.
	ApplyHavingClause(result, queryRangeParams)
	// We apply the metric limit here because it's not part of the clickhouse query
	// The limit in the context of the time series query is the number of time series
	// So for the limit to work, we need to know what series to keep and what to discard
	// For us to know that, we need to execute the query first, and then apply the limit
	// which we found expensive, because we are executing the query twice on the same data
	// So we decided to apply the limit here, after the query is executed
	// The function is named applyMetricLimit because it only applies to metrics data source
	// In traces and logs, the limit is achieved using subqueries
	ApplyMetricLimit(result, queryRangeParams)
	// We apply the functions here it's easier to add new functions
	ApplyFunctions(result, queryRangeParams)
	// Each series in the result produces N number of points, where N is (end - start) / step
	// For the panel type table, we need to show one point for each series in the row
	// We do that by applying a reduce function to each series
	applyReduceTo(result, queryRangeParams)

	// expressions are executed at query serivce so the value of time.now in the invdividual
	// queries will be different so for table panel we are making it same.
	if queryRangeParams.CompositeQuery.PanelType == v3.PanelTypeTable {
		tablePanelResultProcessor(result)
	}

	canDefaultZero := make(map[string]bool)

	for _, query := range queryRangeParams.CompositeQuery.BuilderQueries {
		canDefaultZero[query.QueryName] = query.CanDefaultZero()
	}

	for _, query := range queryRangeParams.CompositeQuery.BuilderQueries {
		// The way we distinguish between a formula and a query is by checking if the expression
		// is the same as the query name
		// TODO(srikanthccv): Update the UI to send a flag to distinguish between a formula and a query
		if query.Expression != query.QueryName {
			expression, err := govaluate.NewEvaluableExpressionWithFunctions(query.Expression, EvalFuncs())
			// This shouldn't happen here, because it should have been caught earlier in validation
			if err != nil {
				zap.L().Error("error in expression", zap.Error(err))
				return nil, err
			}
			formulaResult, err := processResults(result, expression, canDefaultZero)
			if err != nil {
				zap.L().Error("error in expression", zap.Error(err))
				return nil, err
			}
			formulaResult.QueryName = query.QueryName
			ApplyHavingClause([]*v3.Result{formulaResult}, queryRangeParams)
			ApplyMetricLimit([]*v3.Result{formulaResult}, queryRangeParams)
			result = append(result, formulaResult)
		}
	}
	// we are done with the formula calculations, only send the results for enabled queries
	removeDisabledQueries := func(result []*v3.Result) []*v3.Result {
		var newResult []*v3.Result
		for _, res := range result {
			if queryRangeParams.CompositeQuery.BuilderQueries[res.QueryName].Disabled {
				continue
			}
			newResult = append(newResult, res)
		}
		return newResult
	}
	if queryRangeParams.CompositeQuery.QueryType == v3.QueryTypeBuilder {
		result = removeDisabledQueries(result)
	}
	if queryRangeParams.CompositeQuery.FillGaps {
		FillGaps(result, queryRangeParams)
	}

	if queryRangeParams.FormatForWeb &&
		queryRangeParams.CompositeQuery.QueryType == v3.QueryTypeBuilder &&
		queryRangeParams.CompositeQuery.PanelType == v3.PanelTypeTable {
		result = TransformToTableForBuilderQueries(result, queryRangeParams)
	}

	return result, nil
}

// ApplyFunctions applies functions for each query in the composite query
// The functions can be more than one, and they are applied in the order they are defined
func ApplyFunctions(results []*v3.Result, queryRangeParams *v3.QueryRangeParamsV3) {
	for idx, result := range results {
		builderQueries := queryRangeParams.CompositeQuery.BuilderQueries

		if builderQueries != nil {
			functions := builderQueries[result.QueryName].Functions

			for _, function := range functions {
				results[idx] = queryBuilder.ApplyFunction(function, result)
			}
		}
	}
}

func tablePanelResultProcessor(results []*v3.Result) {
	var ts int64
	for ridx := range results {
		for sidx := range results[ridx].Series {
			for pidx := range results[ridx].Series[sidx].Points {
				if ts == 0 {
					ts = results[ridx].Series[sidx].Points[pidx].Timestamp
				} else {
					results[ridx].Series[sidx].Points[pidx].Timestamp = ts
				}
			}
		}
	}
}

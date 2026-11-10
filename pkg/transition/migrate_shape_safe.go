// nolint
package transition

import (
	"context"
	"log/slog"
)

// ══════════════════════════════════════════════
// Shape-safe (idempotent) migration
// ══════════════════════════════════════════════
//
// A copy of the Migrate → updateWidget → updateQueryData chain with the
// "uniformly v4 input" assumption removed, so it is safe on a dashboard whose
// `version` tag lies (a "v5"-labelled dashboard with un-upgraded, possibly mixed,
// bodies — the v1→v2 converter's case). Versus the original: no version gate, and
// each step acts only on the pre-v5 shape (leaving a v5 field alone), so it is
// idempotent. The original Migrate is left unchanged (battle-tested, no test net).
// The *ShapeSafe methods below each note the original they copy; the reused steps
// (createFilterExpression, fixGroupBy, buildAggregationExpression, orderByExpr) are
// already v5-safe.

// MigrateQueryDataShapeSafe is the per-query entry point (the core of
// updateQueryDataShapeSafe) for callers that process queries one at a time (the
// v1→v2 converter). widgetType is the v1 panelTypes (metric reduceTo on tables);
// "" is safe.
func (m *dashboardMigrateV5) MigrateQueryDataShapeSafe(ctx context.Context, queryData map[string]any, widgetType string) bool {
	return m.updateQueryDataShapeSafe(ctx, queryData, widgetType)
}

// updateQueryDataShapeSafe copies updateQueryData, with each destructive step
// guarded to act only on the pre-v5 shape (see the file header).
func (mc *migrateCommon) updateQueryDataShapeSafe(ctx context.Context, queryData map[string]any, widgetType string) bool {
	updated := false

	aggregateOp, _ := queryData["aggregateOperator"].(string)
	hasAggregation := aggregateOp != "" && aggregateOp != "noop"

	if mc.createAggregationsShapeSafe(ctx, queryData, widgetType) {
		updated = true
	}

	// createFilterExpression only touches v4 `filters`; skip if a v5 `filter` exists.
	if _, hasFilter := queryData["filter"]; !hasFilter {
		if mc.createFilterExpression(ctx, queryData) {
			updated = true
		}
	}

	if mc.fixGroupBy(queryData) {
		updated = true
	}

	if mc.createHavingExpressionShapeSafe(queryData) {
		updated = true
	}

	if hasAggregation {
		if orderBy, ok := queryData["orderBy"].([]any); ok && orderByIsPreV5(orderBy) {
			newOrderBy := make([]any, 0)
			for _, order := range orderBy {
				if orderMap, ok := order.(map[string]any); ok {
					columnName, _ := orderMap["columnName"].(string)
					// skip timestamp, id (logs, traces), samples(metrics) ordering for aggregation queries
					if columnName != "timestamp" && columnName != "samples" && columnName != "id" {
						if columnName == "#SIGNOZ_VALUE" {
							if expr, has := mc.orderByExpr(queryData); has {
								orderMap["columnName"] = expr
							}
						} else {
							// if the order by key is not part of the group by keys, remove it
							present := false

							groupBy, ok := queryData["groupBy"].([]any)
							if !ok {
								return false
							}

							for idx := range groupBy {
								item, ok := groupBy[idx].(map[string]any)
								if !ok {
									continue
								}
								key, ok := item["key"].(string)
								if !ok {
									continue
								}
								if key == columnName {
									present = true
								}
							}

							if !present {
								mc.logger.WarnContext(ctx, "found a order by without group by, skipping", slog.String("order_col_name", columnName))
								continue
							}
						}
						newOrderBy = append(newOrderBy, orderMap)
					}
				}
			}
			queryData["orderBy"] = newOrderBy
			updated = true
		}
	} else {
		dataSource, _ := queryData["dataSource"].(string)

		if orderBy, ok := queryData["orderBy"].([]any); ok && orderByIsPreV5(orderBy) {
			newOrderBy := make([]any, 0)
			for _, order := range orderBy {
				if orderMap, ok := order.(map[string]any); ok {
					columnName, _ := orderMap["columnName"].(string)
					// skip id and timestamp for (traces)
					if (columnName == "id" || columnName == "timestamp") && dataSource == "traces" {
						mc.logger.InfoContext(ctx, "skipping `id` order by for traces")
						continue
					}

					// skip id for (logs)
					if (columnName == "id" || columnName == "timestamp") && dataSource == "logs" {
						mc.logger.InfoContext(ctx, "skipping `id`/`timestamp` order by for logs")
						continue
					}

					newOrderBy = append(newOrderBy, orderMap)
				}
			}
			queryData["orderBy"] = newOrderBy
			updated = true
		}
	}

	// Only the `&& functionsArePreV5(functions)` guard differs from updateQueryData.
	if functions, ok := queryData["functions"].([]any); ok && functionsArePreV5(functions) {
		v5Functions := make([]any, len(functions))
		for i, fn := range functions {
			if fnMap, ok := fn.(map[string]any); ok {
				v5Function := map[string]any{
					"name": fnMap["name"],
				}

				// Convert args from v4 format to v5 FunctionArg format
				if args, ok := fnMap["args"].([]any); ok {
					v5Args := make([]any, len(args))
					for j, arg := range args {
						// In v4, args were just values. In v5, they are FunctionArg objects
						v5Args[j] = map[string]any{
							"name":  "", // v4 didn't have named args
							"value": arg,
						}
					}
					v5Function["args"] = v5Args
				}

				// Handle namedArgs if present (some functions might have used this)
				if namedArgs, ok := fnMap["namedArgs"].(map[string]any); ok {
					// Convert named args to the new format
					existingArgs, _ := v5Function["args"].([]any)
					if existingArgs == nil {
						existingArgs = []any{}
					}

					for name, value := range namedArgs {
						existingArgs = append(existingArgs, map[string]any{
							"name":  name,
							"value": value,
						})
					}
					v5Function["args"] = existingArgs
				}

				v5Functions[i] = v5Function
			}
		}
		queryData["functions"] = v5Functions
		updated = true
	}

	delete(queryData, "aggregateOperator")
	delete(queryData, "aggregateAttribute")
	delete(queryData, "temporality")
	delete(queryData, "timeAggregation")
	delete(queryData, "spaceAggregation")
	delete(queryData, "reduceTo")
	delete(queryData, "filters")
	delete(queryData, "ShiftBy")
	delete(queryData, "IsAnomaly")
	delete(queryData, "QueriesUsedInFormula")
	delete(queryData, "seriesAggregation")

	return updated
}

// createHavingExpressionShapeSafe copies createHavingExpression but leaves an
// already-v5 having:{expression} alone instead of wiping it.
func (mc *migrateCommon) createHavingExpressionShapeSafe(queryData map[string]any) bool {
	if _, ok := queryData["having"].(map[string]any); ok {
		return false // already v5-shaped
	}
	having, ok := queryData["having"].([]any)
	if !ok || len(having) == 0 {
		queryData["having"] = map[string]any{"expression": ""}
		return true
	}

	dataSource, _ := queryData["dataSource"].(string)

	for idx := range having {
		if havingItem, ok := having[idx].(map[string]any); ok {
			havingCol, has := mc.orderByExpr(queryData)
			if has {
				havingItem["columnName"] = havingCol
				havingItem["key"] = map[string]any{"key": havingCol}
			}
			having[idx] = havingItem
		}
	}
	queryData["having"] = map[string]any{"expression": mc.buildExpression(context.Background(), having, "AND", dataSource)}
	return true
}

// createAggregationsShapeSafe copies createAggregations but skips a query that
// already has a v5 aggregations[], and picks the metric time/space aggregation
// from the body's shape (has timeAggregation/spaceAggregation?) rather than the
// version tag.
func (mc *migrateCommon) createAggregationsShapeSafe(ctx context.Context, queryData map[string]any, widgetType string) bool {
	if aggs, ok := queryData["aggregations"].([]any); ok && len(aggs) > 0 {
		return false // already v5-shaped
	}

	aggregateOp, hasOp := queryData["aggregateOperator"].(string)
	aggregateAttr, hasAttr := queryData["aggregateAttribute"].(map[string]any)
	dataSource, _ := queryData["dataSource"].(string)

	if aggregateOp == "noop" && dataSource != "metrics" {
		return false
	}
	if !hasOp || !hasAttr {
		return false
	}

	var aggregation map[string]any

	switch dataSource {
	case "metrics":
		_, hasTime := queryData["timeAggregation"]
		_, hasSpace := queryData["spaceAggregation"]
		if hasTime || hasSpace { // acts as a check for v4 shape: the body carries its own time/space aggregation.
			if _, ok := queryData["spaceAggregation"]; !ok {
				queryData["spaceAggregation"] = aggregateOp
			}
			aggregation = map[string]any{
				"metricName":       aggregateAttr["key"],
				"temporality":      queryData["temporality"],
				"timeAggregation":  queryData["timeAggregation"],
				"spaceAggregation": queryData["spaceAggregation"],
			}
			if reduceTo, ok := queryData["reduceTo"].(string); ok {
				aggregation["reduceTo"] = reduceTo
			}
		} else {
			// v3 shape: derive time/space from the compound operator.
			var timeAgg, spaceAgg, reduceTo string
			switch aggregateOp {
			case "sum_rate", "rate_sum":
				timeAgg, spaceAgg, reduceTo = "rate", "sum", "sum"
			case "avg_rate", "rate_avg":
				timeAgg, spaceAgg, reduceTo = "rate", "avg", "avg"
			case "min_rate", "rate_min":
				timeAgg, spaceAgg, reduceTo = "rate", "min", "min"
			case "max_rate", "rate_max":
				timeAgg, spaceAgg, reduceTo = "rate", "max", "max"
			case "hist_quantile_50":
				timeAgg, spaceAgg, reduceTo = "", "p50", "avg"
			case "hist_quantile_75":
				timeAgg, spaceAgg, reduceTo = "", "p75", "avg"
			case "hist_quantile_90":
				timeAgg, spaceAgg, reduceTo = "", "p90", "avg"
			case "hist_quantile_95":
				timeAgg, spaceAgg, reduceTo = "", "p95", "avg"
			case "hist_quantile_99":
				timeAgg, spaceAgg, reduceTo = "", "p99", "avg"
			case "rate":
				timeAgg, spaceAgg, reduceTo = "rate", "sum", "sum"
			case "p99", "p90", "p75", "p50", "p25", "p20", "p10", "p05":
				mc.logger.InfoContext(ctx, "found invalid config")
				timeAgg, spaceAgg, reduceTo = "avg", "avg", "avg"
			case "min":
				timeAgg, spaceAgg, reduceTo = "min", "min", "min"
			case "max":
				timeAgg, spaceAgg, reduceTo = "max", "max", "max"
			case "avg":
				timeAgg, spaceAgg, reduceTo = "avg", "avg", "avg"
			case "sum":
				timeAgg, spaceAgg, reduceTo = "sum", "sum", "sum"
			case "count":
				timeAgg, spaceAgg, reduceTo = "count", "sum", "sum"
			case "count_distinct":
				timeAgg, spaceAgg, reduceTo = "count_distinct", "sum", "sum"
			case "noop":
				mc.logger.WarnContext(ctx, "noop found in the aggregation data")
				timeAgg, spaceAgg, reduceTo = "max", "max", "max"
			}
			aggregation = map[string]any{
				"metricName":       aggregateAttr["key"],
				"temporality":      queryData["temporality"],
				"timeAggregation":  timeAgg,
				"spaceAggregation": spaceAgg,
			}
			if widgetType == "table" {
				aggregation["reduceTo"] = reduceTo
			} else if reduceTo, ok := queryData["reduceTo"].(string); ok {
				aggregation["reduceTo"] = reduceTo
			}
		}
	case "logs", "traces":
		aggregation = map[string]any{"expression": mc.buildAggregationExpression(aggregateOp, aggregateAttr)}
	default:
		return false
	}

	queryData["aggregations"] = []any{aggregation}
	return true
}

// orderByIsPreV5 reports whether an orderBy slice is still in the v4 shape (an
// entry carries "columnName"); a v5 orderBy uses {key:{name}, direction}.
func orderByIsPreV5(orderBy []any) bool {
	for _, o := range orderBy {
		if m, ok := o.(map[string]any); ok {
			if _, has := m["columnName"]; has {
				return true
			}
		}
	}
	return false
}

// functionsArePreV5 reports whether a functions slice is still in the v4 shape
// (args are raw values); a v5 function's args are {name,value} objects.
func functionsArePreV5(functions []any) bool {
	for _, f := range functions {
		if m, ok := f.(map[string]any); ok {
			args, ok := m["args"].([]any)
			if !ok || len(args) == 0 {
				continue
			}
			_, argIsObject := args[0].(map[string]any)
			return !argIsObject
		}
	}
	return false
}

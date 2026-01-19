// nolint
package transition

import (
	"context"
	"fmt"
	"log/slog"
	"regexp"
	"slices"
	"strings"

	"github.com/SigNoz/signoz/pkg/telemetrytraces"
)

type migrateCommon struct {
	ambiguity map[string][]string
	logger    *slog.Logger
}

func NewMigrateCommon(logger *slog.Logger) *migrateCommon {
	return &migrateCommon{
		logger: logger,
	}
}

func (migration *migrateCommon) WrapInV5Envelope(name string, queryMap map[string]any, queryType string) map[string]any {
	// Create a properly structured v5 query
	v5Query := map[string]any{
		"name":     name,
		"disabled": queryMap["disabled"],
		"legend":   queryMap["legend"],
	}

	if name != queryMap["expression"] {
		// formula
		queryType = "builder_formula"
		v5Query["expression"] = queryMap["expression"]
		if functions, ok := queryMap["functions"]; ok {
			v5Query["functions"] = functions
		}
		return map[string]any{
			"type": queryType,
			"spec": v5Query,
		}
	}

	// Add signal based on data source
	if dataSource, ok := queryMap["dataSource"].(string); ok {
		switch dataSource {
		case "traces":
			v5Query["signal"] = "traces"
		case "logs":
			v5Query["signal"] = "logs"
		case "metrics":
			v5Query["signal"] = "metrics"
		}
	}

	if stepInterval, ok := queryMap["stepInterval"]; ok {
		v5Query["stepInterval"] = stepInterval
	}

	if aggregations, ok := queryMap["aggregations"]; ok {
		v5Query["aggregations"] = aggregations
	}

	if filter, ok := queryMap["filter"]; ok {
		v5Query["filter"] = filter
	}

	// Copy groupBy with proper structure
	if groupBy, ok := queryMap["groupBy"].([]any); ok {
		v5GroupBy := make([]any, len(groupBy))
		for i, gb := range groupBy {
			if gbMap, ok := gb.(map[string]any); ok {
				v5GroupBy[i] = map[string]any{
					"name":          gbMap["key"],
					"fieldDataType": gbMap["dataType"],
					"fieldContext":  gbMap["type"],
				}
			}
		}
		v5Query["groupBy"] = v5GroupBy
	}

	// Copy orderBy with proper structure
	if orderBy, ok := queryMap["orderBy"].([]any); ok {
		v5OrderBy := make([]any, len(orderBy))
		for i, ob := range orderBy {
			if obMap, ok := ob.(map[string]any); ok {
				v5OrderBy[i] = map[string]any{
					"key": map[string]any{
						"name":          obMap["columnName"],
						"fieldDataType": obMap["dataType"],
						"fieldContext":  obMap["type"],
					},
					"direction": obMap["order"],
				}
			}
		}
		v5Query["order"] = v5OrderBy
	}

	// Copy selectColumns as selectFields
	if selectColumns, ok := queryMap["selectColumns"].([]any); ok {
		v5SelectFields := make([]any, len(selectColumns))
		for i, col := range selectColumns {
			if colMap, ok := col.(map[string]any); ok {
				v5SelectFields[i] = map[string]any{
					"name":          colMap["key"],
					"fieldDataType": colMap["dataType"],
					"fieldContext":  colMap["type"],
				}
			}
		}
		v5Query["selectFields"] = v5SelectFields
	}

	// Copy limit and offset
	if limit, ok := queryMap["limit"]; ok {
		v5Query["limit"] = limit
	}
	if offset, ok := queryMap["offset"]; ok {
		v5Query["offset"] = offset
	}

	if having, ok := queryMap["having"]; ok {
		v5Query["having"] = having
	}

	if functions, ok := queryMap["functions"]; ok {
		v5Query["functions"] = functions
	}

	return map[string]any{
		"type": queryType,
		"spec": v5Query,
	}
}

func (mc *migrateCommon) updateQueryData(ctx context.Context, queryData map[string]any, version, widgetType string) bool {
	updated := false

	aggregateOp, _ := queryData["aggregateOperator"].(string)
	hasAggregation := aggregateOp != "" && aggregateOp != "noop"

	if mc.createAggregations(ctx, queryData, version, widgetType) {
		updated = true
	}

	if mc.createFilterExpression(ctx, queryData) {
		updated = true
	}

	if mc.fixGroupBy(queryData) {
		updated = true
	}

	if mc.createHavingExpression(ctx, queryData) {
		updated = true
	}

	if hasAggregation {
		if orderBy, ok := queryData["orderBy"].([]any); ok {
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
								mc.logger.WarnContext(ctx, "found a order by without group by, skipping", "order_col_name", columnName)
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

		if orderBy, ok := queryData["orderBy"].([]any); ok {
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

	if functions, ok := queryData["functions"].([]any); ok {
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

func (mc *migrateCommon) orderByExpr(queryData map[string]any) (string, bool) {
	aggregateOp, hasOp := queryData["aggregateOperator"].(string)
	aggregateAttr, hasAttr := queryData["aggregateAttribute"].(map[string]any)
	dataSource, _ := queryData["dataSource"].(string)

	if aggregateOp == "noop" {
		return "", false
	}

	if !hasOp || !hasAttr {
		return "", false
	}

	var expr string
	var has bool

	switch dataSource {
	case "metrics":

		aggs, ok := queryData["aggregations"].([]any)
		if !ok {
			return "", false
		}

		if len(aggs) == 0 {
			return "", false
		}

		agg, ok := aggs[0].(map[string]any)
		if !ok {
			return "", false
		}

		spaceAgg, ok := agg["spaceAggregation"].(string)
		if !ok {
			return "", false
		}

		expr = fmt.Sprintf("%s(%s)", spaceAgg, aggregateAttr["key"])
		has = true
	case "logs":
		expr = mc.buildAggregationExpression(aggregateOp, aggregateAttr)
		has = true
	case "traces":
		expr = mc.buildAggregationExpression(aggregateOp, aggregateAttr)
		has = true
	default:
		has = false
	}

	return expr, has
}

func (mc *migrateCommon) createAggregations(ctx context.Context, queryData map[string]any, version, widgetType string) bool {
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
		if version == "v4" {
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
			var timeAgg, spaceAgg, reduceTo string
			switch aggregateOp {
			case "sum_rate", "rate_sum":
				timeAgg = "rate"
				spaceAgg = "sum"
				reduceTo = "sum"
			case "avg_rate", "rate_avg":
				timeAgg = "rate"
				spaceAgg = "avg"
				reduceTo = "avg"
			case "min_rate", "rate_min":
				timeAgg = "rate"
				spaceAgg = "min"
				reduceTo = "min"
			case "max_rate", "rate_max":
				timeAgg = "rate"
				spaceAgg = "max"
				reduceTo = "max"
			case "hist_quantile_50":
				timeAgg = ""
				spaceAgg = "p50"
				reduceTo = "avg"
			case "hist_quantile_75":
				timeAgg = ""
				spaceAgg = "p75"
				reduceTo = "avg"
			case "hist_quantile_90":
				timeAgg = ""
				spaceAgg = "p90"
				reduceTo = "avg"
			case "hist_quantile_95":
				timeAgg = ""
				spaceAgg = "p95"
				reduceTo = "avg"
			case "hist_quantile_99":
				timeAgg = ""
				spaceAgg = "p99"
				reduceTo = "avg"
			case "rate":
				timeAgg = "rate"
				spaceAgg = "sum"
				reduceTo = "sum"
			case "p99", "p90", "p75", "p50", "p25", "p20", "p10", "p05":
				mc.logger.InfoContext(ctx, "found invalid config")
				timeAgg = "avg"
				spaceAgg = "avg"
				reduceTo = "avg"
			case "min":
				timeAgg = "min"
				spaceAgg = "min"
				reduceTo = "min"
			case "max":
				timeAgg = "max"
				spaceAgg = "max"
				reduceTo = "max"
			case "avg":
				timeAgg = "avg"
				spaceAgg = "avg"
				reduceTo = "avg"
			case "sum":
				timeAgg = "sum"
				spaceAgg = "sum"
				reduceTo = "sum"
			case "count":
				timeAgg = "count"
				spaceAgg = "sum"
				reduceTo = "sum"
			case "count_distinct":
				timeAgg = "count_distinct"
				spaceAgg = "sum"
				reduceTo = "sum"
			case "noop":
				mc.logger.WarnContext(ctx, "noop found in the aggregation data")
				timeAgg = "max"
				spaceAgg = "max"
				reduceTo = "max"
			}

			aggregation = map[string]any{
				"metricName":       aggregateAttr["key"],
				"temporality":      queryData["temporality"],
				"timeAggregation":  timeAgg,
				"spaceAggregation": spaceAgg,
			}
			if widgetType == "table" {
				aggregation["reduceTo"] = reduceTo
			} else {
				if reduceTo, ok := queryData["reduceTo"].(string); ok {
					aggregation["reduceTo"] = reduceTo
				}
			}
		}

	case "logs":
		expression := mc.buildAggregationExpression(aggregateOp, aggregateAttr)
		aggregation = map[string]any{
			"expression": expression,
		}
	case "traces":
		expression := mc.buildAggregationExpression(aggregateOp, aggregateAttr)
		aggregation = map[string]any{
			"expression": expression,
		}
	default:
		return false
	}

	queryData["aggregations"] = []any{aggregation}

	return true
}

func (mc *migrateCommon) createFilterExpression(ctx context.Context, queryData map[string]any) bool {
	filters, ok := queryData["filters"].(map[string]any)
	if !ok {
		return false
	}

	items, ok := filters["items"].([]any)
	if !ok || len(items) == 0 {
		return false
	}

	op, ok := filters["op"].(string)
	if !ok {
		op = "AND"
	}

	dataSource, _ := queryData["dataSource"].(string)

	expression := mc.buildExpression(ctx, items, op, dataSource)
	if expression != "" {
		if groupByExists := mc.groupByExistsExpr(queryData); groupByExists != "" && dataSource != "metrics" {
			mc.logger.InfoContext(ctx, "adding default exists for old qb", "group_by_exists", groupByExists)
			expression += " " + groupByExists
		}

		queryData["filter"] = map[string]any{
			"expression": expression,
		}
		delete(queryData, "filters")
		return true
	}

	return false
}

func (mc *migrateCommon) groupByExistsExpr(queryData map[string]any) string {
	expr := []string{}
	groupBy, ok := queryData["groupBy"].([]any)
	if !ok {
		return strings.Join(expr, " AND ")
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
		expr = append(expr, fmt.Sprintf("%s EXISTS", key))

		if _, ok := telemetrytraces.IntrinsicFields[key]; ok {
			delete(item, "type")
		}
		if _, ok := telemetrytraces.CalculatedFields[key]; ok {
			delete(item, "type")
		}
		if _, ok := telemetrytraces.IntrinsicFieldsDeprecated[key]; ok {
			delete(item, "type")
		}
		if _, ok := telemetrytraces.CalculatedFieldsDeprecated[key]; ok {
			delete(item, "type")
		}
	}

	return strings.Join(expr, " AND ")
}

func (mc *migrateCommon) fixGroupBy(queryData map[string]any) bool {
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
		if _, ok := telemetrytraces.IntrinsicFields[key]; ok {
			delete(item, "type")
		}
		if _, ok := telemetrytraces.CalculatedFields[key]; ok {
			delete(item, "type")
		}
		if _, ok := telemetrytraces.IntrinsicFieldsDeprecated[key]; ok {
			delete(item, "type")
		}
		if _, ok := telemetrytraces.CalculatedFieldsDeprecated[key]; ok {
			delete(item, "type")
		}
	}

	return false
}

func (mc *migrateCommon) createHavingExpression(ctx context.Context, queryData map[string]any) bool {
	having, ok := queryData["having"].([]any)
	if !ok || len(having) == 0 {
		queryData["having"] = map[string]any{
			"expression": "",
		}
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

	mc.logger.InfoContext(ctx, "having before expression", "having", having)

	expression := mc.buildExpression(ctx, having, "AND", dataSource)
	mc.logger.InfoContext(ctx, "having expression after building", "expression", expression, "having", having)
	queryData["having"] = map[string]any{
		"expression": expression,
	}
	return true
}

func (mc *migrateCommon) buildExpression(ctx context.Context, items []any, op, dataSource string) string {
	if len(items) == 0 {
		return ""
	}

	var conditions []string

	for _, item := range items {
		itemMap, ok := item.(map[string]any)
		if !ok {
			continue
		}

		key, keyOk := itemMap["key"].(map[string]any)
		operator, opOk := itemMap["op"].(string)
		value, valueOk := itemMap["value"]

		if !keyOk || !opOk || !valueOk {
			mc.logger.WarnContext(ctx, "didn't find either key, op, or value; continuing")
			continue
		}

		keyStr, ok := key["key"].(string)
		if !ok {
			continue
		}

		if slices.Contains(mc.ambiguity[dataSource], keyStr) {
			mc.logger.WarnContext(ctx, "ambiguity found for a key", "ambiguity_key", keyStr)
			typeStr, ok := key["type"].(string)
			if ok {
				if typeStr == "tag" {
					typeStr = "attribute"
				} else {
					typeStr = "resource"
				}
				keyStr = typeStr + "." + keyStr
			}
		}

		condition := mc.buildCondition(ctx, keyStr, operator, value, key)
		if condition != "" {
			conditions = append(conditions, condition)
		}

	}

	if len(conditions) == 0 {
		return ""
	}

	if len(conditions) == 1 {
		return conditions[0]
	}

	return "(" + strings.Join(conditions, " "+op+" ") + ")"
}

func (mc *migrateCommon) buildCondition(ctx context.Context, key, operator string, value any, keyMetadata map[string]any) string {
	dataType, _ := keyMetadata["dataType"].(string)

	formattedValue := mc.formatValue(ctx, value, dataType)

	switch operator {
	case "=":
		return fmt.Sprintf("%s = %s", key, formattedValue)
	case "!=":
		return fmt.Sprintf("%s != %s", key, formattedValue)
	case ">":
		return fmt.Sprintf("%s > %s", key, formattedValue)
	case ">=":
		return fmt.Sprintf("%s >= %s", key, formattedValue)
	case "<":
		return fmt.Sprintf("%s < %s", key, formattedValue)
	case "<=":
		return fmt.Sprintf("%s <= %s", key, formattedValue)
	case "in", "IN":
		if !strings.HasPrefix(formattedValue, "[") && !mc.isVariable(formattedValue) {
			mc.logger.WarnContext(ctx, "multi-value operator in found with single value", "key", key, "formatted_value", formattedValue)
			return fmt.Sprintf("%s = %s", key, formattedValue)
		}
		return fmt.Sprintf("%s IN %s", key, formattedValue)
	case "nin", "NOT IN":
		if !strings.HasPrefix(formattedValue, "[") && !mc.isVariable(formattedValue) {
			mc.logger.WarnContext(ctx, "multi-value operator not in found with single value", "key", key, "formatted_value", formattedValue)
			return fmt.Sprintf("%s != %s", key, formattedValue)
		}
		return fmt.Sprintf("%s NOT IN %s", key, formattedValue)
	case "like", "LIKE":
		return fmt.Sprintf("%s LIKE %s", key, formattedValue)
	case "nlike", "NOT LIKE":
		return fmt.Sprintf("%s NOT LIKE %s", key, formattedValue)
	case "contains":
		return fmt.Sprintf("%s CONTAINS %s", key, formattedValue)
	case "ncontains":
		return fmt.Sprintf("%s NOT CONTAINS %s", key, formattedValue)
	case "regex":
		return fmt.Sprintf("%s REGEXP %s", key, formattedValue)
	case "nregex":
		return fmt.Sprintf("%s NOT REGEXP %s", key, formattedValue)
	case "exists":
		return fmt.Sprintf("%s EXISTS", key)
	case "nexists":
		return fmt.Sprintf("%s NOT EXISTS", key)
	case "has":
		return fmt.Sprintf("has(%s, %s)", key, formattedValue)
	case "nhas":
		return fmt.Sprintf("NOT has(%s, %s)", key, formattedValue)
	default:
		return fmt.Sprintf("%s %s %s", key, operator, formattedValue)
	}
}

func (mc *migrateCommon) buildAggregationExpression(operator string, attribute map[string]any) string {
	key, _ := attribute["key"].(string)

	switch operator {
	case "count":
		return "count()"
	case "sum":
		if key != "" {
			return fmt.Sprintf("sum(%s)", key)
		}
		return "sum()"
	case "avg":
		if key != "" {
			return fmt.Sprintf("avg(%s)", key)
		}
		return "avg()"
	case "min":
		if key != "" {
			return fmt.Sprintf("min(%s)", key)
		}
		return "min()"
	case "max":
		if key != "" {
			return fmt.Sprintf("max(%s)", key)
		}
		return "max()"
	case "p05":
		if key != "" {
			return fmt.Sprintf("p05(%s)", key)
		}
		return "p05()"
	case "p10":
		if key != "" {
			return fmt.Sprintf("p10(%s)", key)
		}
		return "p10()"
	case "p20":
		if key != "" {
			return fmt.Sprintf("p20(%s)", key)
		}
		return "p20()"
	case "p25":
		if key != "" {
			return fmt.Sprintf("p25(%s)", key)
		}
		return "p25()"
	case "p50":
		if key != "" {
			return fmt.Sprintf("p50(%s)", key)
		}
		return "p50()"
	case "p90":
		if key != "" {
			return fmt.Sprintf("p90(%s)", key)
		}
		return "p90()"
	case "p95":
		if key != "" {
			return fmt.Sprintf("p95(%s)", key)
		}
		return "p95()"
	case "p99":
		if key != "" {
			return fmt.Sprintf("p99(%s)", key)
		}
		return "p99()"
	case "rate":
		if key != "" {
			return fmt.Sprintf("rate(%s)", key)
		}
		return "rate()"
	case "rate_sum":
		if key != "" {
			return fmt.Sprintf("rate_sum(%s)", key)
		}
		return "rate_sum()"
	case "rate_avg":
		if key != "" {
			return fmt.Sprintf("rate_avg(%s)", key)
		}
		return "rate_avg()"
	case "rate_min":
		if key != "" {
			return fmt.Sprintf("rate_min(%s)", key)
		}
		return "rate_min()"
	case "rate_max":
		if key != "" {
			return fmt.Sprintf("rate_max(%s)", key)
		}
		return "rate_max()"
	case "sum_rate":
		if key != "" {
			return fmt.Sprintf("sum(rate(%s))", key)
		}
		return "sum(rate())"
	case "count_distinct":
		if key != "" {
			return fmt.Sprintf("count_distinct(%s)", key)
		}
		return "count_distinct()"
	default:
		// For unknown operators, try to use them as-is
		if key != "" {
			return fmt.Sprintf("%s(%s)", operator, key)
		}
		return fmt.Sprintf("%s()", operator)
	}
}

func (mc *migrateCommon) formatValue(ctx context.Context, value any, dataType string) string {
	switch v := value.(type) {
	case string:
		if mc.isVariable(v) {
			mc.logger.InfoContext(ctx, "found a variable", "dashboard_variable", v)
			return mc.normalizeVariable(ctx, v)
		} else {
			// if we didn't recognize something as variable but looks like has variable like value, double check
			if strings.Contains(v, "{") || strings.Contains(v, "[") || strings.Contains(v, "$") {
				mc.logger.WarnContext(ctx, "variable like string found", "dashboard_variable", v)
			}
		}

		if mc.isNumericType(dataType) {
			if _, err := fmt.Sscanf(v, "%f", new(float64)); err == nil {
				return v // Return the numeric string without quotes
			}
		}

		// Otherwise, it's a string literal - escape single quotes and wrap in quotes
		escaped := strings.ReplaceAll(v, "'", "\\'")
		return fmt.Sprintf("'%s'", escaped)
	case float64:
		return fmt.Sprintf("%v", v)
	case int:
		return fmt.Sprintf("%d", v)
	case bool:
		return fmt.Sprintf("%t", v)
	case []any:
		if len(v) == 1 {
			return mc.formatValue(ctx, v[0], dataType)
		}
		var values []string
		for _, item := range v {
			values = append(values, mc.formatValue(ctx, item, dataType))
		}
		return "[" + strings.Join(values, ", ") + "]"
	default:
		return fmt.Sprintf("%v", v)
	}
}

func (mc *migrateCommon) isNumericType(dataType string) bool {
	switch dataType {
	case "int", "int8", "int16", "int32", "int64",
		"uint", "uint8", "uint16", "uint32", "uint64",
		"float", "float32", "float64",
		"number", "numeric", "integer":
		return true
	default:
		return false
	}
}

func (mc *migrateCommon) isVariable(s string) bool {
	s = strings.TrimSpace(s)

	patterns := []string{
		`^\{.*\}$`,       // {var} or {.var}
		`^\{\{.*\}\}$`,   // {{var}} or {{.var}}
		`^\$.*$`,         // $var or $service.name
		`^\[\[.*\]\]$`,   // [[var]] or [[.var]]
		`^\$\{\{.*\}\}$`, // ${{env}} or ${{.var}}
	}

	for _, pattern := range patterns {
		matched, _ := regexp.MatchString(pattern, s)
		if matched {
			return true
		}
	}

	return false
}

func (mc *migrateCommon) normalizeVariable(ctx context.Context, s string) string {
	s = strings.TrimSpace(s)

	var varName string

	// {{var}} or {{.var}}
	if strings.HasPrefix(s, "{{") && strings.HasSuffix(s, "}}") {
		varName = strings.TrimPrefix(strings.TrimSuffix(s, "}}"), "{{")
		varName = strings.TrimPrefix(varName, ".")
		// this is probably going to be problem if user has $ as start of key
		varName = strings.TrimPrefix(varName, "$")
	} else if strings.HasPrefix(s, "{") && strings.HasSuffix(s, "}") { // {var} or {.var}
		varName = strings.TrimPrefix(strings.TrimSuffix(s, "}"), "{")
		varName = strings.TrimPrefix(varName, ".")
		// this is probably going to be problem if user has $ as start of key
		varName = strings.TrimPrefix(varName, "$")
	} else if strings.HasPrefix(s, "[[") && strings.HasSuffix(s, "]]") {
		// [[var]] or [[.var]]
		varName = strings.TrimPrefix(strings.TrimSuffix(s, "]]"), "[[")
		varName = strings.TrimPrefix(varName, ".")
	} else if strings.HasPrefix(s, "${{") && strings.HasSuffix(s, "}}") {
		varName = strings.TrimPrefix(strings.TrimSuffix(s, "}}"), "${{")
		varName = strings.TrimPrefix(varName, ".")
		varName = strings.TrimPrefix(varName, "$")
	} else if strings.HasPrefix(s, "$") {
		// $var
		return s
	} else {
		return s
	}

	if strings.Contains(varName, " ") {
		mc.logger.InfoContext(ctx, "found white space in var name, replacing it", "dashboard_var_name", varName)
		varName = strings.ReplaceAll(varName, " ", "")
	}

	return "$" + varName
}

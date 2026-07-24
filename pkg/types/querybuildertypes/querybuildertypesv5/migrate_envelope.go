package querybuildertypesv5

// WrapInV5Envelope translates a single v4 builder query/formula map into a
// v5 query envelope ({"type": ..., "spec": ...}). It is a pure shape transform
// over untyped maps: v4 builder field names (groupBy/orderBy/selectColumns/
// dataSource) are rewritten to their v5 equivalents and a `signal` is derived
// from the data source. queryType selects the envelope type, except a formula
// (detected when name != queryMap["expression"]) is always emitted as
// "builder_formula".
//
// Migration code (pkg/transition) and the v1→v2 dashboard conversion both
// produce v5 envelopes, so this lives here with the v5 query types rather than
// in an infra-level package.
func WrapInV5Envelope(name string, queryMap map[string]any, queryType string) map[string]any {
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

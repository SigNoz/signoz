package transition

import (
	"context"
	"encoding/json"
	"log/slog"
)

// BuildFilterExpressionFromFilterSet converts a v3-style FilterSet JSON
// ({"op": "...", "items": [...]}) into a v5-style filter expression string
// (for example: "attribute.http.method = 'GET' AND resource.env = 'prod'").
//
// It reuses migrateCommon.createFilterExpression so that all the existing
// semantics around operators, variables, data types, and ambiguity handling
// are preserved.
//
// dataSource determines which ambiguity set to use ("logs", "traces", etc.).
// For log pipelines, pass "logs".
//
// Returns:
//   - expression: the generated filter expression string
//   - migrated:   true if an expression was generated, false if there was
//                 nothing to migrate (e.g. empty filters)
//   - err:        non-nil only if the input JSON could not be parsed
func BuildFilterExpressionFromFilterSet(
	ctx context.Context,
	logger *slog.Logger,
	dataSource string,
	filterJSON string,
) (expression string, migrated bool, err error) {
	var filters map[string]any
	if err := json.Unmarshal([]byte(filterJSON), &filters); err != nil {
		return "", false, err
	}

	mc := NewMigrateCommon(logger)

	// Shape expected by migrateCommon.createFilterExpression:
	//   queryData["dataSource"] == "logs" | "traces" | "metrics"
	//   queryData["filters"]    == map[string]any{"op": "...", "items": [...]}
	queryData := map[string]any{
		"dataSource": dataSource,
		"filters":    filters,
	}

	if !mc.createFilterExpression(ctx, queryData) {
		return "", false, nil
	}

	filterAny, ok := queryData["filter"].(map[string]any)
	if !ok {
		return "", false, nil
	}

	expr, ok := filterAny["expression"].(string)
	if !ok || expr == "" {
		return "", false, nil
	}

	return expr, true, nil
}


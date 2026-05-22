package alertmanagertypes

import (
	"fmt"
	"strings"

	"github.com/expr-lang/expr"
	"github.com/prometheus/common/model"
)

// ConvertLabelSetToEnv converts a label set into a map suitable for use as an
// expr environment. Dotted keys (e.g. "kubernetes.node") are expanded into
// nested maps so that expr can resolve them without panicking. When a dotted
// path conflicts with a plain key, the nested structure takes precedence.
func ConvertLabelSetToEnv(lset model.LabelSet) map[string]any {
	env := map[string]any{}
	for lk, lv := range lset {
		key := strings.TrimSpace(string(lk))
		value := string(lv)
		if strings.Contains(key, ".") {
			parts := strings.Split(key, ".")
			current := env
			for i, raw := range parts {
				part := strings.TrimSpace(raw)
				if i == len(parts)-1 {
					if _, isMap := current[part].(map[string]any); !isMap {
						current[part] = value
					}
					break
				}
				if nextMap, ok := current[part].(map[string]any); ok {
					current = nextMap
				} else {
					newMap := map[string]any{}
					current[part] = newMap
					current = newMap
				}
			}
			continue
		}
		if _, isMap := env[key].(map[string]any); !isMap {
			env[key] = value
		}
	}
	return env
}

// EvalScopeExpression compiles and runs the expression against the provided
// labels. It returns (result, error). Callers should log the error and
// decide how to handle a failed evaluation (the maintenance muter treats a
// failure as "don't skip" so alerts pass through).
func EvalScopeExpression(expression string, lset model.LabelSet) (bool, error) {
	env := ConvertLabelSetToEnv(lset)
	program, err := expr.Compile(expression, expr.Env(env), expr.AllowUndefinedVariables())
	if err != nil {
		return false, fmt.Errorf("compile scope expression %q: %w", expression, err)
	}
	output, err := expr.Run(program, env)
	if err != nil {
		return false, fmt.Errorf("run scope expression %q: %w", expression, err)
	}
	result, ok := output.(bool)
	if !ok {
		return false, fmt.Errorf("scope expression %q returned non-bool value %T (%v)", expression, output, output)
	}
	return result, nil
}

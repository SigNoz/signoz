package alertmanagertypes

import (
	"strings"

	"github.com/expr-lang/expr"
	"github.com/prometheus/common/model"

	"github.com/SigNoz/signoz/pkg/errors"
)

var ErrCodeInvalidScopeExpression = errors.MustNewCode("invalid_scope_expression")

// ConvertLabelSetToEnv converts a label set into a map suitable for use as an
// expr environment. Dotted keys (e.g. "kubernetes.node") are expanded into
// nested maps so that expr can resolve them without panicking. When a dotted
// path conflicts with a plain key, the nested structure takes precedence.
//
// The second return value reports whether such a prefix conflict was detected
// (a plain key collided with a nested map, or a nested path overwrote a plain
// leaf).
func ConvertLabelSetToEnv(lset model.LabelSet) (map[string]any, bool) {
	env := map[string]any{}
	conflict := false
	for lk, lv := range lset {
		key := strings.TrimSpace(string(lk))
		value := string(lv)
		if strings.Contains(key, ".") {
			parts := strings.Split(key, ".")
			current := env
			for i, raw := range parts {
				part := strings.TrimSpace(raw)
				if i == len(parts)-1 {
					// Last segment: if a nested map already exists here, a
					// deeper path has been processed first — keep it and flag.
					if _, isMap := current[part].(map[string]any); isMap {
						conflict = true
						break
					}
					current[part] = value
					break
				}
				if nextMap, ok := current[part].(map[string]any); ok {
					current = nextMap
				} else {
					// Intermediate segment hit a plain leaf — overwrite with a
					// map so the deeper path can be materialised, and flag.
					if _, exists := current[part]; exists {
						conflict = true
					}
					newMap := map[string]any{}
					current[part] = newMap
					current = newMap
				}
			}
			continue
		}
		// Plain key collides with an already-built nested map — keep the map
		// (nested wins) and flag.
		if _, isMap := env[key].(map[string]any); isMap {
			conflict = true
			continue
		}
		env[key] = value
	}
	return env, conflict
}

// EvalScopeExpression compiles and runs the expression against the provided
// labels. It returns (result, error). Callers should log the error and
// decide how to handle a failed evaluation (the maintenance muter treats a
// failure as "don't skip" so alerts pass through).
func EvalScopeExpression(expression string, lset model.LabelSet) (bool, error) {
	env, _ := ConvertLabelSetToEnv(lset)
	program, err := expr.Compile(expression, expr.Env(env), expr.AllowUndefinedVariables())
	if err != nil {
		return false, errors.Wrapf(err, errors.TypeInvalidInput, ErrCodeInvalidScopeExpression, "compile scope expression %q", expression)
	}
	output, err := expr.Run(program, env)
	if err != nil {
		return false, errors.Wrapf(err, errors.TypeInternal, ErrCodeInvalidScopeExpression, "run scope expression %q", expression)
	}
	result, ok := output.(bool)
	if !ok {
		return false, errors.Newf(errors.TypeInvalidInput, ErrCodeInvalidScopeExpression, "scope expression %q returned non-bool value %T (%v)", expression, output, output)
	}
	return result, nil
}

package alertmanagertypes

import (
	"strings"

	"github.com/expr-lang/expr"
	"github.com/expr-lang/expr/ast"
	"github.com/prometheus/common/model"

	"github.com/SigNoz/signoz/pkg/errors"
)

var ErrCodeInvalidExpression = errors.MustNewCode("invalid_expression")

// NilSafeMemberAccess rewrites every member access a.b into a?.b, so a dotted
// label missing from the alert evaluates to nil instead of failing the run.
type NilSafeMemberAccess struct{}

func (NilSafeMemberAccess) Visit(node *ast.Node) {
	member, ok := (*node).(*ast.MemberNode)
	if !ok || member.Optional {
		return
	}
	member.Optional = true
	// The compiler only honours Optional inside a ChainNode.
	ast.Patch(node, &ast.ChainNode{Node: member})
}

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

// EvalExpression compiles and runs the expression against env, as built by
// ConvertLabelSetToEnv. Callers should log the error and decide how to handle
// a failed evaluation (the maintenance muter treats a failure as "don't skip"
// so alerts pass through).
func EvalExpression(expression string, env map[string]any) (bool, error) {
	program, err := expr.Compile(expression, expr.Env(env), expr.AllowUndefinedVariables(), expr.Patch(NilSafeMemberAccess{}))
	if err != nil {
		return false, errors.Wrapf(err, errors.TypeInvalidInput, ErrCodeInvalidExpression, "compile expression %q", expression)
	}
	output, err := expr.Run(program, env)
	if err != nil {
		return false, errors.Wrapf(err, errors.TypeInternal, ErrCodeInvalidExpression, "run expression %q", expression)
	}
	result, ok := output.(bool)
	if !ok {
		return false, errors.Newf(errors.TypeInvalidInput, ErrCodeInvalidExpression, "expression %q returned non-bool value %T (%v)", expression, output, output)
	}
	return result, nil
}

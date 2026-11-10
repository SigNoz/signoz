package alertmanagertypes

import (
	"strings"

	"github.com/expr-lang/expr"
	"github.com/expr-lang/expr/ast"
	"github.com/prometheus/common/model"

	"github.com/SigNoz/signoz/pkg/errors"
)

var ErrCodeInvalidExpression = errors.MustNewCode("invalid_expression")

const nilSafeMemberFunc = "__nilSafeMember"

// NilSafeMemberAccess rewrites every string-keyed member access a.b into a
// lookup that yields nil unless a is a map, so a dotted label that is missing,
// or whose prefix is a plain label, evaluates to nil instead of failing the run.
type NilSafeMemberAccess struct{}

func (NilSafeMemberAccess) Visit(node *ast.Node) {
	member, ok := (*node).(*ast.MemberNode)
	if !ok {
		return
	}
	if _, ok := member.Property.(*ast.StringNode); !ok {
		return
	}
	ast.Patch(node, &ast.CallNode{
		Callee:    &ast.IdentifierNode{Value: nilSafeMemberFunc},
		Arguments: []ast.Node{member.Node, member.Property},
	})
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
	program, err := expr.Compile(expression, expr.Env(env), expr.AllowUndefinedVariables(), expr.Function(nilSafeMemberFunc, nilSafeMember), expr.Patch(NilSafeMemberAccess{}))
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

func nilSafeMember(params ...any) (any, error) {
	m, _ := params[0].(map[string]any)
	key, _ := params[1].(string)
	return m[key], nil
}

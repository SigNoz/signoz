package querybuilder

import (
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	grammar "github.com/SigNoz/signoz/pkg/parser/filterquery/grammar"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/antlr4-go/antlr/v4"
)

// ExprKeys returns the field keys in key positions of a filter expression; unlike
// QueryStringToKeysSelectors it does not pick up unquoted values like `$threshold`.
func ExprKeys(query string) []*telemetrytypes.TelemetryFieldKey {
	var keys []*telemetrytypes.TelemetryFieldKey
	var walk func(node antlr.Tree)
	walk = func(node antlr.Tree) {
		if kc, ok := node.(*grammar.KeyContext); ok {
			key := telemetrytypes.GetFieldKeyFromKeyText(kc.GetText())
			keys = append(keys, &key)
			return
		}
		for i := 0; i < node.GetChildCount(); i++ {
			walk(node.GetChild(i))
		}
	}
	// syntax errors are ignored here; downstream re-parsing surfaces them
	tree, _ := parseFilterQuery(query)
	walk(tree)
	return keys
}

// ValidateVariablesInExpr checks variable references in value positions upfront, so a
// broken one fails with a targeted error instead of the visitor's combined "Found N
// errors". A `$`-prefixed token resolving to nothing is an error; a bare one means itself.
func ValidateVariablesInExpr(query string, variables map[string]qbtypes.VariableItem) error {
	var err error
	var walk func(node antlr.Tree)
	walk = func(node antlr.Tree) {
		if err != nil {
			return
		}
		if vc, ok := node.(*grammar.ValueContext); ok {
			// only unquoted textual values can be variable references
			if vc.KEY() == nil {
				return
			}
			text := vc.GetText()
			item, ok := variables[text]
			if !ok {
				item, ok = variables[strings.TrimPrefix(text, "$")]
			}
			if !ok {
				if strings.HasPrefix(text, "$") {
					err = errors.NewInvalidInputf(errors.CodeInvalidInput, "unknown variable %q", text)
				}
				return
			}
			if values, isList := item.Value.([]any); isList && len(values) == 0 {
				err = errors.NewInvalidInputf(errors.CodeInvalidInput,
					"variable %q used in expression has an empty list value", strings.TrimPrefix(text, "$"))
			}
			return
		}
		for i := 0; i < node.GetChildCount(); i++ {
			walk(node.GetChild(i))
		}
	}
	// syntax errors are ignored here; downstream re-parsing surfaces them
	tree, _ := parseFilterQuery(query)
	walk(tree)
	return err
}

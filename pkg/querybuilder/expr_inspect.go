package querybuilder

import (
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	grammar "github.com/SigNoz/signoz/pkg/parser/filterquery/grammar"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/antlr4-go/antlr/v4"
)

// ExprKeys returns the field keys referenced in *key positions* of a filter
// expression. Unlike QueryStringToKeysSelectors (which scans raw KEY tokens and so
// also picks up unquoted values — in `x > $threshold` it reports `$threshold`), this
// walks the parse tree and collects only KeyContext nodes.
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
	walk(parseFilterQuery(query))
	return keys
}

// ValidateVariablesInExpr checks the variable references in an expression's value
// positions upfront, so a broken reference fails with a targeted error instead of
// the where-clause visitor's combined "Found N errors" (whose details ride in the
// error's additionals). Lookup mirrors the visitor: verbatim, then with a leading
// `$` stripped. A `$`-prefixed token that resolves to nothing is an error — it can
// never be a valid literal; a bare token that resolves to nothing is left to mean
// itself.
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
	walk(parseFilterQuery(query))
	return err
}

package querier

import (
	"strings"

	"github.com/prometheus/prometheus/model/labels"
	"github.com/prometheus/prometheus/promql/parser"
)

// allVarRemover is a visitor that removes label matchers referencing variables with __all__ value.
// This must run before variable substitution so it can detect variable references in their original form.
type allVarRemover struct {
	allVars map[string]bool // map of variable names that have __all__ value
}

// Visit implements the parser.Visitor interface to traverse and modify the PromQL AST.
func (v *allVarRemover) Visit(node parser.Node, path []parser.Node) (parser.Visitor, error) {
	if node == nil {
		return v, nil
	}
	switch n := node.(type) {
	case *parser.VectorSelector:
		// Remove matchers that reference variables with __all__ value
		var keptMatchers []*labels.Matcher
		for _, matcher := range n.LabelMatchers {
			if !v.shouldRemoveMatcher(matcher.Value) {
				keptMatchers = append(keptMatchers, matcher)
			}
		}
		// Update the label matchers
		n.LabelMatchers = keptMatchers
	}
	return v, nil
}

// shouldRemoveMatcher checks if a matcher value contains a variable reference that has __all__ value.
func (v *allVarRemover) shouldRemoveMatcher(value string) bool {

	// Check for $var pattern
	if strings.Contains(value, "$") {
		keyValue := strings.TrimPrefix(value, "$")
		if _, ok := v.allVars[keyValue]; ok {
			return true
		}
	}

	// Check for {{var}} pattern
	if strings.Contains(value, "{{") {
		keyValue := strings.TrimPrefix(value, "{{")
		keyValue = strings.TrimSuffix(keyValue, "}}")
		if _, ok := v.allVars[keyValue]; ok {
			return true
		}
	}

	// Check for [[var]] pattern
	if strings.Contains(value, "[[") {
		keyValue := strings.TrimPrefix(value, "[[")
		keyValue = strings.TrimSuffix(keyValue, "]]")
		if _, ok := v.allVars[keyValue]; ok {
			return true
		}
	}

	return false
}

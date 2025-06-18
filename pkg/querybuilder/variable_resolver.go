package querybuilder

import (
	"fmt"
	"regexp"
	"strings"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

// VariableResolver handles variable substitution in query expressions
type VariableResolver struct {
	variables map[string]qbtypes.VariableItem
}

// NewVariableResolver creates a new VariableResolver
func NewVariableResolver(variables map[string]qbtypes.VariableItem) *VariableResolver {
	return &VariableResolver{
		variables: variables,
	}
}

// Variable patterns:
// {{.var}} or {{var}}
// [[.var]] or [[var]]
// $var
var variablePatterns = []*regexp.Regexp{
	regexp.MustCompile(`\{\{\.?(\w+)\}\}`), // {{.var}} or {{var}}
	regexp.MustCompile(`\[\[\.?(\w+)\]\]`), // [[.var]] or [[var]]
	regexp.MustCompile(`\$(\w+)`),          // $var
}

// IsVariableReference checks if a value is a variable reference
func (r *VariableResolver) IsVariableReference(value string) (bool, string) {
	// Check for exact match only (not partial)
	for _, pattern := range variablePatterns {
		matches := pattern.FindStringSubmatch(value)
		if len(matches) > 1 && matches[0] == value {
			return true, matches[1]
		}
	}
	return false, ""
}

// ResolveVariable resolves a variable reference to its actual value
func (r *VariableResolver) ResolveVariable(varName string) (any, bool, error) {
	item, exists := r.variables[varName]
	if !exists {
		return nil, false, fmt.Errorf("variable '%s' not found", varName)
	}

	// Check if this is a dynamic variable with special __all__ value
	if item.Type == qbtypes.DynamicVariableType {
		// Check for __all__ values which mean "skip filter"
		switch v := item.Value.(type) {
		case string:
			if v == "__all__" {
				return nil, true, nil // skip filter
			}
		case []any:
			if len(v) == 1 {
				if str, ok := v[0].(string); ok && str == "__all__" {
					return nil, true, nil // skip filter
				}
			}
		case []string:
			if len(v) == 1 && v[0] == "__all__" {
				return nil, true, nil // skip filter
			}
		}
	}

	return item.Value, false, nil
}

// ResolveFilterExpression resolves variables in a filter expression
// Returns the resolved expression and whether any filters should be skipped
func (r *VariableResolver) ResolveFilterExpression(expression string) (string, bool, error) {
	if expression == "" {
		return expression, false, nil
	}

	// Check if the entire expression is a variable
	if isVar, varName := r.IsVariableReference(strings.TrimSpace(expression)); isVar {
		value, skipFilter, err := r.ResolveVariable(varName)
		if err != nil {
			return "", false, err
		}
		if skipFilter {
			return "", true, nil
		}
		// Convert value to string representation
		return formatValue(value), false, nil
	}

	// For complex expressions, we need to find and replace variable references
	// We'll iterate through all variables and check if they appear in the expression
	resolvedExpr := expression
	for _, pattern := range variablePatterns {
		matches := pattern.FindAllStringSubmatch(expression, -1)
		for _, match := range matches {
			if len(match) > 1 {
				varName := match[1]
				value, skipFilter, err := r.ResolveVariable(varName)
				if err != nil {
					// Skip this variable if not found
					continue
				}
				if skipFilter {
					// If any variable indicates skip filter, skip the entire filter
					return "", true, nil
				}
				// Replace the variable reference with its value
				resolvedExpr = strings.ReplaceAll(resolvedExpr, match[0], formatValue(value))
			}
		}
	}

	return resolvedExpr, false, nil
}

// formatValue formats a value for use in a filter expression
func formatValue(value any) string {
	switch v := value.(type) {
	case string:
		// Quote strings
		return fmt.Sprintf("'%s'", strings.ReplaceAll(v, "'", "''"))
	case []string:
		// Format as array
		parts := make([]string, len(v))
		for i, s := range v {
			parts[i] = fmt.Sprintf("'%s'", strings.ReplaceAll(s, "'", "''"))
		}
		return fmt.Sprintf("[%s]", strings.Join(parts, ", "))
	case []any:
		// Format as array
		parts := make([]string, len(v))
		for i, item := range v {
			parts[i] = formatValue(item)
		}
		return fmt.Sprintf("[%s]", strings.Join(parts, ", "))
	default:
		return fmt.Sprintf("%v", v)
	}
}

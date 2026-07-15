package variables

import (
	"fmt"
	"sort"
	"strconv"
	"strings"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

// isVariableNameChar reports whether c can be part of a variable name.
func isVariableNameChar(c byte) bool {
	return c == '_' || ('0' <= c && c <= '9') || ('a' <= c && c <= 'z') || ('A' <= c && c <= 'Z')
}

// lookupVariable resolves a variable name against the variables map, tolerating a
// `$` prefix on either the name or the map keys.
func lookupVariable(name string, variables map[string]qbtypes.VariableItem) (qbtypes.VariableItem, bool) {
	if item, ok := variables[name]; ok {
		return item, true
	}
	if strings.HasPrefix(name, "$") {
		item, ok := variables[name[1:]]
		return item, ok
	}
	item, ok := variables["$"+name]
	return item, ok
}

// Interpolate replaces $variable references embedded in s with their values, matching
// against the names in the variables map (longest name first). A reference is only
// replaced when the character following it cannot extend a variable name: with only
// `env` defined, "$env-suffix" becomes "prod-suffix" while "$environment" stays
// untouched instead of turning into "prodironment".
// A string that is a single variable reference (e.g. "$env") is returned unchanged so
// callers can process standalone references with their type intact (lists for IN,
// numbers, __all__, etc.).
// The returned bool is true when a referenced dynamic variable has the __all__ value,
// meaning the enclosing condition must be dropped. Warnings (e.g. a multi-value
// variable collapsing to its first value) are returned for the caller to surface.
func Interpolate(s string, variables map[string]qbtypes.VariableItem) (string, bool, []string) {
	if len(variables) == 0 {
		return s, false, nil
	}

	if strings.HasPrefix(s, "$") {
		if _, ok := lookupVariable(s, variables); ok {
			return s, false, nil
		}
	}

	names := make([]string, 0, len(variables))
	seen := make(map[string]bool, len(variables))
	for name := range variables {
		name = strings.TrimPrefix(name, "$")
		if name == "" || seen[name] {
			continue
		}
		seen[name] = true
		names = append(names, name)
	}
	// longest first so that $environment is not mistaken for $env plus a suffix
	sort.Slice(names, func(i, j int) bool { return len(names[i]) > len(names[j]) })

	var warnings []string
	var sb strings.Builder
	i := 0
	for i < len(s) {
		if s[i] != '$' {
			sb.WriteByte(s[i])
			i++
			continue
		}
		rest := s[i+1:]
		matched := false
		for _, name := range names {
			if !strings.HasPrefix(rest, name) {
				continue
			}
			// a name character right after the match means this occurrence references
			// a longer, unknown variable; leave it for a shorter-name check or as-is
			if len(rest) > len(name) && isVariableNameChar(rest[len(name)]) {
				continue
			}
			varItem, _ := lookupVariable(name, variables)
			if varItem.Type == qbtypes.DynamicVariableType {
				if allVal, ok := varItem.Value.(string); ok && allVal == qbtypes.AllVariableValue {
					return "", true, warnings
				}
			}
			sb.WriteString(formatValueForInterpolation(varItem.Value, name, &warnings))
			i += 1 + len(name)
			matched = true
			break
		}
		if !matched {
			sb.WriteByte('$')
			i++
		}
	}

	return sb.String(), false, warnings
}

// formatValueForInterpolation renders a variable value as a plain string for embedding
// inside a larger value. Multi-value variables collapse to their first value with a
// warning, since a pattern like "%$var%" can only hold one.
func formatValueForInterpolation(value any, varName string, warnings *[]string) string {
	switch val := value.(type) {
	case string:
		return val
	case []string:
		if len(val) == 0 {
			return ""
		}
		if len(val) > 1 {
			*warnings = append(*warnings, fmt.Sprintf("variable `%s` has multiple values, using first value `%s` for string interpolation", varName, val[0]))
		}
		return val[0]
	case []any:
		if len(val) == 0 {
			return ""
		}
		if len(val) > 1 {
			*warnings = append(*warnings, fmt.Sprintf("variable `%s` has multiple values, using first value for string interpolation", varName))
		}
		return formatValueForInterpolation(val[0], varName, warnings)
	case bool:
		return strconv.FormatBool(val)
	default:
		return fmt.Sprintf("%v", val)
	}
}

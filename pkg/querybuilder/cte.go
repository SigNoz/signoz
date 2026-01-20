package querybuilder

import (
	"strings"
)

// combineCTEs takes any number of individual CTE fragments like
//
//	"__resource_filter AS (...)", "__limit_cte AS (...)"
//
// and renders the final `WITH …` clause.
func CombineCTEs(ctes []string) string {
	if len(ctes) == 0 {
		return ""
	}
	return "WITH " + strings.Join(ctes, ", ") + " "
}

// prependArgs ensures CTE arguments appear before main-query arguments
// in the final slice so their ordinal positions match the SQL string.
func PrependArgs(cteArgs [][]any, mainArgs []any) []any {
	out := make([]any, 0, len(mainArgs)+len(cteArgs))
	for _, a := range cteArgs { // CTEs first, in declaration order
		out = append(out, a...)
	}
	return append(out, mainArgs...)
}

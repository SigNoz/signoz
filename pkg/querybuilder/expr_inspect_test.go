package querybuilder

import (
	"testing"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/stretchr/testify/require"
)

func TestExprKeys(t *testing.T) {
	names := func(expr string) []string {
		var out []string
		for _, k := range ExprKeys(expr) {
			out = append(out, k.Name)
		}
		return out
	}

	// value-position tokens are not keys, unlike QueryStringToKeysSelectors
	require.Equal(t, []string{"output_tokens"}, names("output_tokens > $threshold"))
	require.Equal(t, []string{"trace.output_tokens"}, names("trace.output_tokens > 1000"))
	require.Equal(t, []string{"a", "b"}, names("a > 1 AND b IN ('x', 'y')"))
}

func TestValidateVariablesInExpr(t *testing.T) {
	vars := map[string]qbtypes.VariableItem{
		"threshold": {Type: qbtypes.TextBoxVariableType, Value: float64(1000)},
		"empty":     {Type: qbtypes.QueryVariableType, Value: []any{}},
		"all":       {Type: qbtypes.DynamicVariableType, Value: "__all__"},
	}

	require.NoError(t, ValidateVariablesInExpr("x > $threshold", vars))
	require.NoError(t, ValidateVariablesInExpr("x > threshold", vars))
	require.NoError(t, ValidateVariablesInExpr("x IN $all", vars))
	require.NoError(t, ValidateVariablesInExpr("m = 'cost$usd'", vars)) // quoted literals are not references
	require.NoError(t, ValidateVariablesInExpr("x > bare_word", vars)) // bare non-variable means itself
	require.ErrorContains(t, ValidateVariablesInExpr("x > $bogus", vars), `unknown variable "$bogus"`)
	require.ErrorContains(t, ValidateVariablesInExpr("x IN $empty", vars), "empty list")
}

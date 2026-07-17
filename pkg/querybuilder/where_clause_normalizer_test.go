package querybuilder

import (
	"testing"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNormalizeWhereClauseEquivalenceClasses(t *testing.T) {
	testCases := []struct {
		name        string
		expressions []string
		expected    string
	}{
		{
			name: "spacing and keyword case",
			expressions: []string{
				"service.name = 'frontend' AND status = 200",
				"service.name='frontend' and status=200",
				"service.name  =  'frontend'  AND  status  =  200",
				"service.name  =  frontend  AND  status  =  200",
			},
			expected: "service.name = 'frontend' AND status = 200",
		},
		{
			name: "operand order",
			expressions: []string{
				"a = 1 AND b = 2",
				"b = 2 AND a = 1",
			},
			expected: "a = 1 AND b = 2",
		},
		{
			name: "implicit and explicit AND",
			expressions: []string{
				"a = 1 b = 2",
				"a = 1 AND b = 2",
			},
			expected: "a = 1 AND b = 2",
		},
		{
			name: "quote styles",
			expressions: []string{
				`a = "frontend"`,
				"a = 'frontend'",
			},
			expected: "a = 'frontend'",
		},
		{
			name: "redundant parentheses",
			expressions: []string{
				"(a = 1)",
				"a = 1",
				"((a = 1))",
			},
			expected: "a = 1",
		},
		{
			name: "in clause forms and value order",
			expressions: []string{
				"a IN (1, 2)",
				"a IN [2, 1]",
				"a in (2, 1, 1)",
			},
			expected: "a IN (1, 2)",
		},
		{
			name: "single value in",
			expressions: []string{
				"a IN 1",
				"a IN (1)",
				"a IN [1]",
			},
			expected: "a IN (1)",
		},
		{
			name: "operator aliases",
			expressions: []string{
				"a == 1",
				"a = 1",
			},
			expected: "a = 1",
		},
		{
			name: "not equals aliases",
			expressions: []string{
				"a <> 1",
				"a != 1",
			},
			expected: "a != 1",
		},
		{
			name: "duplicate siblings",
			expressions: []string{
				"a = 1 AND a = 1",
				"a = 1",
			},
			expected: "a = 1",
		},
		{
			name: "grouped or under and",
			expressions: []string{
				"a = 1 AND (b = 2 OR c = 3)",
				"(c = 3 OR b = 2) AND a = 1",
			},
			expected: "(b = 2 OR c = 3) AND a = 1",
		},
		{
			name: "exists spellings",
			expressions: []string{
				"service.name EXISTS",
				"service.name exists",
				"service.name EXIST",
			},
			expected: "service.name EXISTS",
		},
		{
			name: "contains spellings",
			expressions: []string{
				"body CONTAINS 'error'",
				"body contain 'error'",
			},
			expected: "body CONTAINS 'error'",
		},
		{
			name: "full text term forms",
			expressions: []string{
				`"panic"`,
				"'panic'",
				"panic",
			},
			expected: "'panic'",
		},
		{
			name: "not without parens",
			expressions: []string{
				"NOT a = 1",
				"not (a = 1)",
			},
			expected: "NOT a = 1",
		},
		{
			name: "not over grouped or",
			expressions: []string{
				"NOT (b = 2 OR a = 1)",
				"not (a = 1 or b = 2)",
			},
			expected: "NOT (a = 1 OR b = 2)",
		},
		{
			name: "function name case",
			expressions: []string{
				"HAS(tags, 'x')",
				"has(tags, 'x')",
			},
			expected: "has(tags, 'x')",
		},
		{
			name: "boolean case",
			expressions: []string{
				"a = TRUE",
				"a = true",
			},
			expected: "a = true",
		},
		{
			name: "between",
			expressions: []string{
				"duration BETWEEN 1 AND 10",
				"duration between 1 and 10",
			},
			expected: "duration BETWEEN 1 AND 10",
		},
		{
			name: "not in",
			expressions: []string{
				"a NOT IN (2, 1)",
				"a not in [1, 2]",
			},
			expected: "a NOT IN (1, 2)",
		},
		{
			name: "key with datatype annotation",
			expressions: []string{
				"resource.service.name:string = 'x'",
			},
			expected: "resource.service.name:string = 'x'",
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			for _, expression := range testCase.expressions {
				canonical, err := NormalizeWhereClause(expression, nil)
				require.NoError(t, err, "expression %q", expression)
				assert.Equal(t, testCase.expected, canonical.Expression, "expression %q", expression)
			}
		})
	}
}

func TestNormalizeWhereClauseNonEquivalence(t *testing.T) {
	testCases := []struct {
		name  string
		left  string
		right string
	}{
		{name: "different values", left: "a = 1", right: "a = 2"},
		{name: "different keys", left: "a = 1", right: "b = 1"},
		{name: "different operators", left: "a = 1", right: "a != 1"},
		{name: "no semantic rewrite of not", left: "NOT a = 1", right: "a != 1"},
		{name: "number literals as authored", left: "a = 1.0", right: "a = 1"},
		{name: "between bounds are ordered", left: "a BETWEEN 1 AND 10", right: "a BETWEEN 10 AND 1"},
		{name: "function params are ordered", left: "has(tags, 'x')", right: "has('x', tags)"},
		{name: "and vs or", left: "a = 1 AND b = 2", right: "a = 1 OR b = 2"},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			left, err := NormalizeWhereClause(testCase.left, nil)
			require.NoError(t, err)
			right, err := NormalizeWhereClause(testCase.right, nil)
			require.NoError(t, err)
			assert.NotEqual(t, left.Expression, right.Expression)
		})
	}
}

func TestNormalizeWhereClauseAtoms(t *testing.T) {
	canonical, err := NormalizeWhereClause("NOT (a = 1 OR b IN ('y', 'x')) AND service.name EXISTS AND hasAny(tags, ['p', 'q']) AND \"panic\"", nil)
	require.NoError(t, err)

	expected := []WhereClauseCondition{
		{Key: "a", Operator: "=", Values: []string{"1"}, Negated: true},
		{Key: "b", Operator: "IN", Values: []string{"x", "y"}, Negated: true},
		{Key: "service.name", Operator: "EXISTS", Values: []string{}, Negated: false, TopLevel: true},
		{Key: "tags", Operator: "hasAny", Values: []string{"p", "q"}, Negated: false, TopLevel: true},
		{Key: "", Operator: WhereClauseOperatorFullText, Values: []string{"panic"}, Negated: false, TopLevel: true},
	}
	assert.ElementsMatch(t, expected, canonical.Conditions)
}

func TestNormalizeWhereClauseTopLevel(t *testing.T) {
	testCases := []struct {
		name       string
		expression string
		expected   map[string]bool
	}{
		{
			name:       "and siblings are top level",
			expression: "service.name = 'a' AND status = 500",
			expected:   map[string]bool{"service.name": true, "status": true},
		},
		{
			name:       "or branches are not top level",
			expression: "service.name = 'a' OR status = 500",
			expected:   map[string]bool{"service.name": false, "status": false},
		},
		{
			name:       "and sibling stays top level next to a grouped or",
			expression: "service.name = 'a' AND (x = 1 OR y = 2)",
			expected:   map[string]bool{"service.name": true, "x": false, "y": false},
		},
		{
			name:       "parenthesized pure and group stays top level",
			expression: "(service.name = 'a' AND b = 2) AND c = 3",
			expected:   map[string]bool{"service.name": true, "b": true, "c": true},
		},
		{
			name:       "negated condition is not top level",
			expression: "NOT service.name = 'a' AND status = 500",
			expected:   map[string]bool{"service.name": false, "status": true},
		},
		{
			name:       "double negation restores top level",
			expression: "NOT (NOT (service.name = 'a'))",
			expected:   map[string]bool{"service.name": true},
		},
		{
			name:       "in condition under and is top level",
			expression: "service.name IN ('a', 'b') AND x = 1",
			expected:   map[string]bool{"service.name": true, "x": true},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			normalized, err := NormalizeWhereClause(testCase.expression, nil)
			require.NoError(t, err)

			actual := make(map[string]bool)
			for _, condition := range normalized.Conditions {
				actual[condition.Key] = condition.TopLevel
			}
			assert.Equal(t, testCase.expected, actual)
		})
	}
}

func TestNormalizeWhereClauseEscaping(t *testing.T) {
	canonical, err := NormalizeWhereClause(`a = "it's fine"`, nil)
	require.NoError(t, err)
	assert.Equal(t, `a = 'it\'s fine'`, canonical.Expression)
	require.Len(t, canonical.Conditions, 1)
	assert.Equal(t, []string{"it's fine"}, canonical.Conditions[0].Values)

	equivalent, err := NormalizeWhereClause(canonical.Expression, nil)
	require.NoError(t, err)
	assert.Equal(t, canonical.Expression, equivalent.Expression)
	assert.Equal(t, canonical.Conditions, equivalent.Conditions)
}

func TestNormalizeWhereClauseSyntaxError(t *testing.T) {
	_, err := NormalizeWhereClause("a = ", nil)
	require.Error(t, err)

	_, err = NormalizeWhereClause("AND a = 1", nil)
	require.Error(t, err)
}

func TestNormalizeWhereClauseIdempotence(t *testing.T) {
	expressions := []string{
		"service.name='frontend' and (status = 500 or status=502) not retired k8s.pod.name exists",
		"a IN [3, 1, 2] AND hasAll(tags, ['a', 'b']) AND body CONTAINS 'x'",
		"duration BETWEEN 1 AND 10 OR duration > 100",
		`msg = 'with \'escapes\' and "quotes"'`,
	}

	for _, expression := range expressions {
		first, err := NormalizeWhereClause(expression, nil)
		require.NoError(t, err, "expression %q", expression)

		second, err := NormalizeWhereClause(first.Expression, nil)
		require.NoError(t, err, "canonical output %q must re-parse", first.Expression)
		assert.Equal(t, first.Expression, second.Expression, "canonicalization must be idempotent for %q", expression)
	}
}

func TestNormalizeWhereClauseVariables(t *testing.T) {
	variables := map[string]qbtypes.VariableItem{
		"service":  {Value: "frontend"},
		"statuses": {Value: []any{float64(502), float64(500)}},
		"env":      {Type: qbtypes.DynamicVariableType, Value: "__all__"},
		"limit":    {Value: float64(100)},
	}

	testCases := []struct {
		name       string
		expression string
		expected   string
	}{
		{
			name:       "scalar substitution",
			expression: "service.name = $service",
			expected:   "service.name = 'frontend'",
		},
		{
			name:       "array substitution in IN is sorted",
			expression: "status IN $statuses",
			expected:   "status IN (500, 502)",
		},
		{
			name:       "numeric substitution",
			expression: "duration > $limit",
			expected:   "duration > 100",
		},
		{
			name:       "dynamic all prunes the condition",
			expression: "a = 1 AND deployment.environment IN $env",
			expected:   "a = 1",
		},
		{
			name:       "unknown variable stays a token",
			expression: "service.name = $unknown",
			expected:   "service.name = $unknown",
		},
		{
			name:       "substituted forms hash-equal to concrete forms",
			expression: "status IN (502, 500) AND service.name = 'frontend'",
			expected:   "service.name = 'frontend' AND status IN (500, 502)",
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			normalized, err := NormalizeWhereClause(testCase.expression, variables)
			require.NoError(t, err, "expression %q", testCase.expression)
			assert.Equal(t, testCase.expected, normalized.Expression)
		})
	}

	substituted, err := NormalizeWhereClause("service.name = $service AND status IN $statuses", variables)
	require.NoError(t, err)
	concrete, err := NormalizeWhereClause("status IN (500, 502) AND service.name = 'frontend'", nil)
	require.NoError(t, err)
	assert.Equal(t, concrete.Expression, substituted.Expression)
	assert.Equal(t, concrete.Conditions, substituted.Conditions)
}

func TestNormalizeWhereClauseVariablesFullyPruned(t *testing.T) {
	variables := map[string]qbtypes.VariableItem{
		"env": {Type: qbtypes.DynamicVariableType, Value: "__all__"},
	}

	normalized, err := NormalizeWhereClause("deployment.environment IN $env", variables)
	require.NoError(t, err)
	assert.Equal(t, "", normalized.Expression)
	assert.Empty(t, normalized.Conditions)
}

func TestNormalizeWhereClauseVariablesEmptyList(t *testing.T) {
	variables := map[string]qbtypes.VariableItem{
		"statuses": {Value: []any{}},
	}

	_, err := NormalizeWhereClause("status IN $statuses", variables)
	require.Error(t, err)
}

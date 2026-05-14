package sqlschema

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestWhereNormalizerNormalize(t *testing.T) {
	testCases := []struct {
		name   string
		input  string
		output string
	}{
		{
			name:   "BooleanComparison",
			input:  `"active" = true`,
			output: `active = true`,
		},
		{
			name:   "QuotedStringLiteralPreserved",
			input:  `status = 'somewhere'`,
			output: `status = 'somewhere'`,
		},
		{
			name:   "EscapedStringLiteralPreserved",
			input:  `status = 'it''s active'`,
			output: `status = 'it''s active'`,
		},
		{
			name:   "OuterParenthesesRemoved",
			input:  `(("deleted_at" IS NULL))`,
			output: `deleted_at IS NULL`,
		},
		{
			name:   "InnerParenthesesPreserved",
			input:  `("deleted_at" IS NULL OR ("active" = true AND "status" = 'open'))`,
			output: `deleted_at IS NULL OR (active = true AND status = 'open')`,
		},
		{
			name:   "MultipleClausesWhitespaceCollapsed",
			input:  "  (  \"deleted_at\" IS NULL  \n AND\t\"active\" = true  AND status = 'open' )  ",
			output: `deleted_at IS NULL AND active = true AND status = 'open'`,
		},
		{
			name:   "ComplexBooleanClauses",
			input:  `NOT ("deleted_at" IS NOT NULL AND ("active" = false OR "status" = 'archived'))`,
			output: `NOT (deleted_at IS NOT NULL AND (active = false OR status = 'archived'))`,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			assert.Equal(t, testCase.output, (&whereNormalizer{input: testCase.input}).normalize())
		})
	}
}

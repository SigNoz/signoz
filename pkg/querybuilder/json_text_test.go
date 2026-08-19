package querybuilder

import (
	"testing"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/stretchr/testify/assert"
)

// The literals have to hold whichever encoder wrote the text, so the runs stop at every byte
// one of them may rewrite.
func TestJSONTextRuns(t *testing.T) {
	testCases := []struct {
		name     string
		value    string
		expected []string
	}{
		{"plain text is one run", "checkout failed", []string{"checkout failed"}},
		{"a run with nothing to split on is kept whole", "abc", []string{"abc"}},
		{"quote splits the run", `say "hello there"`, []string{"say ", "hello there"}},
		{"slash splits the run, PHP escapes it", "/api/v1/users", []string{"api", "v1", "users"}},
		{"ampersand and angles split, Go escapes them", "a&b<c>dddd", []string{"a", "b", "c", "dddd"}},
		{"non-ascii splits, Python escapes it", "order café latte", []string{"order caf", " latte"}},
		{"newline splits", "line one\nline two", []string{"line one", "line two"}},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			assert.Equal(t, tc.expected, JSONTextRuns(tc.value))
		})
	}
}

// A LIKE pattern splits at its wildcards on top of the encoder-escapable bytes, so its escape
// sequences dissolve conservatively; an equality value keeps wildcard characters as literal text.
func TestJSONComparisonLiterals(t *testing.T) {
	testCases := []struct {
		name     string
		operator qbtypes.FilterOperator
		value    any
		expected []string
	}{
		{"equality keeps wildcards literal", qbtypes.FilterOperatorEqual, "100%_off", []string{"100%_off"}},
		{"wildcards split runs", qbtypes.FilterOperatorLike, "%foo%bar_baz%", []string{"foo", "bar", "baz"}},
		{"pattern escapes dissolve", qbtypes.FilterOperatorLike, `%C:\\tmp\_%`, []string{"C:", "tmp"}},
		{"a number carries nothing", qbtypes.FilterOperatorEqual, int64(123), nil},
		{"no literals at all", qbtypes.FilterOperatorLike, "%_%", nil},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			literals := JSONComparisonLiterals(tc.operator, tc.value)
			if len(tc.expected) == 0 {
				assert.Empty(t, literals)
				return
			}
			assert.Equal(t, tc.expected, literals)
		})
	}
}

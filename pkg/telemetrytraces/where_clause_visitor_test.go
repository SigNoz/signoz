package telemetrytraces

import (
	"strings"
	"testing"

	parser "github.com/SigNoz/signoz/pkg/parser/grammar"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

func TestConvertToClickHouseSpansQueryWithErrors(t *testing.T) {
	cases := []struct {
		name                   string
		fieldKeys              map[string][]*telemetrytypes.TelemetryFieldKey
		query                  string
		expectedSearchString   string
		expectedSearchArgs     []any
		expectedErrorSubString string
		expectedWarnings       []error
	}{
		{
			name:                   "has-function-with-multiple-values",
			fieldKeys:              map[string][]*telemetrytypes.TelemetryFieldKey{},
			query:                  "key.that.does.not.exist = 'redis'",
			expectedSearchString:   "",
			expectedSearchArgs:     []any{},
			expectedErrorSubString: "key `key.that.does.not.exist` not found",
			expectedWarnings:       []error{},
		},
		{
			name:                   "unknown-function",
			fieldKeys:              map[string][]*telemetrytypes.TelemetryFieldKey{},
			query:                  "unknown.function()",
			expectedSearchString:   "",
			expectedSearchArgs:     []any{},
			expectedErrorSubString: "expecting {'(', NOT, HAS, HASANY, HASALL, QUOTED_TEXT, KEY, FREETEXT}",
			expectedWarnings:       []error{},
		},
		{
			name:                   "has-function-not-enough-params",
			fieldKeys:              map[string][]*telemetrytypes.TelemetryFieldKey{},
			query:                  "has(key.that.does.not.exist)",
			expectedSearchString:   "",
			expectedSearchArgs:     []any{},
			expectedErrorSubString: "function `has` expects key and value parameters",
			expectedWarnings:       []error{},
		},
	}

	for _, c := range cases {
		_, warnings, err := parser.PrepareWhereClause(
			c.query,
			c.fieldKeys,
			DefaultFieldMapper,
			DefaultConditionBuilder,
			&telemetrytypes.TelemetryFieldKey{
				Name:          "dummy",
				Signal:        telemetrytypes.SignalTraces,
				FieldContext:  telemetrytypes.FieldContextSpan,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
			"",
			nil,
		)
		if err != nil {
			if !strings.Contains(err.Error(), c.expectedErrorSubString) {
				t.Errorf("Expected error %v, got %v", c.expectedErrorSubString, err)
			}
		}

		if len(warnings) != len(c.expectedWarnings) {
			t.Errorf("Expected %d warnings, got %d", len(c.expectedWarnings), len(warnings))
		}
		for i, warning := range warnings {
			if warning.Error() != c.expectedWarnings[i].Error() {
				t.Errorf("Expected warning %d to be %v, got %v", i, c.expectedWarnings[i], warning)
			}
		}
	}
}

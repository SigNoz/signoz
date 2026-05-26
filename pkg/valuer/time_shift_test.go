package valuer

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestParseTimeShiftSeconds(t *testing.T) {
	cases := []struct {
		name     string
		input    any
		expected float64
		wantErr  bool
	}{
		// Numeric types
		{name: "float64 value", input: float64(3600), expected: 3600},
		{name: "int64 value", input: int64(86400), expected: 86400},
		{name: "int value", input: int(300), expected: 300},
		{name: "negative float64", input: float64(-300), expected: -300},
		{name: "zero float64", input: float64(0), expected: 0},

		// Raw numeric strings
		{name: "string integer seconds", input: "3600", expected: 3600},
		{name: "string float seconds", input: "86400.5", expected: 86400.5},
		{name: "string negative seconds", input: "-300", expected: -300},
		{name: "string zero", input: "0", expected: 0},

		// Go duration strings
		{name: "5 minutes", input: "5m", expected: 300},
		{name: "1 hour", input: "1h", expected: 3600},
		{name: "1.5 hours", input: "1.5h", expected: 5400},
		{name: "1h30m", input: "1h30m", expected: 5400},
		{name: "1 week as duration", input: "168h", expected: 604800},
		{name: "negative duration", input: "-10m", expected: -600},
		{name: "30 seconds", input: "30s", expected: 30},

		// Human-readable "N unit ago" phrases
		{name: "1 hour ago", input: "1 hour ago", expected: 3600},
		{name: "6 hours ago", input: "6 hours ago", expected: 21600},
		{name: "12 hours ago", input: "12 hours ago", expected: 43200},
		{name: "1 day ago", input: "1 day ago", expected: 86400},
		{name: "2 days ago", input: "2 days ago", expected: 172800},
		{name: "1 week ago", input: "1 week ago", expected: 604800},
		{name: "1 minute ago", input: "1 minute ago", expected: 60},
		{name: "30 minutes ago", input: "30 minutes ago", expected: 1800},
		{name: "1 second ago", input: "1 second ago", expected: 1},
		{name: "60 seconds ago", input: "60 seconds ago", expected: 60},
		{name: "uppercase phrase", input: "1 HOUR AGO", expected: 3600},
		{name: "mixed case phrase", input: "2 Days Ago", expected: 172800},

		// Sub-second duration string — should error
		{name: "sub-second duration", input: "500ms", wantErr: true},
		{name: "nanoseconds", input: "100ns", wantErr: true},

		// Invalid inputs
		{name: "empty string", input: "", wantErr: true},
		{name: "whitespace only", input: "   ", wantErr: true},
		{name: "random text", input: "yesterday", wantErr: true},
		{name: "malformed ago phrase", input: "hour ago", wantErr: true},
		{name: "unsupported unit ago", input: "1 fortnight ago", wantErr: true},
		{name: "unsupported type bool", input: true, wantErr: true},
		{name: "unsupported type slice", input: []int{1}, wantErr: true},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, err := ParseTimeShiftSeconds(tc.input)
			if tc.wantErr {
				assert.Error(t, err)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, tc.expected, got)
		})
	}
}

func TestParseTimeShiftSeconds_WhitespaceTrimmed(t *testing.T) {
	got, err := ParseTimeShiftSeconds("  3600  ")
	require.NoError(t, err)
	assert.Equal(t, float64(3600), got)
}

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
		{
			name:     "numeric string seconds",
			input:    "3600",
			expected: 3600,
		},
		{
			name:     "numeric float seconds",
			input:    3600.0,
			expected: 3600,
		},
		{
			name:     "compact minutes",
			input:    "5m",
			expected: 300,
		},
		{
			name:     "compact fractional hours",
			input:    "1.5h",
			expected: 5400,
		},
		{
			name:     "compact compound duration",
			input:    "1h30m",
			expected: 5400,
		},
		{
			name:     "day unit",
			input:    "1 day",
			expected: 86400,
		},
		{
			name:     "week ago",
			input:    "1 week ago",
			expected: 604800,
		},
		{
			name:     "hour ago without count",
			input:    "hour ago",
			expected: 3600,
		},
		{
			name:     "spaced compact duration",
			input:    "1 h",
			expected: 3600,
		},
		{
			name:     "negative numeric string",
			input:    "-30",
			expected: -30,
		},
		{
			name:    "sub-second duration rejected",
			input:   "500ms",
			wantErr: true,
		},
		{
			name:    "negative ago duration rejected",
			input:   "-1h ago",
			wantErr: true,
		},
		{
			name:    "invalid input rejected",
			input:   "later",
			wantErr: true,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			shift, err := ParseTimeShiftSeconds(tc.input)
			if tc.wantErr {
				require.Error(t, err)
				return
			}

			require.NoError(t, err)
			assert.Equal(t, tc.expected, shift)
		})
	}
}

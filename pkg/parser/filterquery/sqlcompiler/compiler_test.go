package sqlcompiler

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestEndsWithDanglingEscape(t *testing.T) {
	testCases := []struct {
		value string
		want  bool
	}{
		{value: "", want: false},
		{value: `\`, want: true},
		{value: `\\`, want: false},
		{value: `\\\`, want: true},
		{value: `abc`, want: false},
		{value: `abc\`, want: true},
		{value: `abc\\`, want: false},
		{value: `a\b\\`, want: false},
	}

	for _, tc := range testCases {
		t.Run(tc.value, func(t *testing.T) {
			assert.Equal(t, tc.want, endsWithDanglingEscape(tc.value))
		})
	}
}

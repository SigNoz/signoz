package config

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewUri(t *testing.T) {
	testCases := []struct {
		input    string
		expected Uri
		pass     bool
	}{
		{input: "file:/path/1", expected: Uri{scheme: "file", value: "/path/1"}, pass: true},
		{input: "file:", expected: Uri{scheme: "file", value: ""}, pass: true},
		{input: "env:", expected: Uri{scheme: "env", value: ""}, pass: true},
		{input: "scheme", expected: Uri{}, pass: false},
	}

	for _, tc := range testCases {
		uri, err := NewUri(tc.input)
		if !tc.pass {
			assert.Error(t, err)
			continue
		}

		require.NoError(t, err)
		assert.NotPanics(t, func() { MustNewUri(tc.input) })
		assert.Equal(t, tc.expected, uri)
		assert.Equal(t, tc.expected.Scheme(), uri.scheme)
		assert.Equal(t, tc.expected.Value(), uri.value)
	}
}

package config

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestConfMerge(t *testing.T) {
	testCases := []struct {
		name     string
		conf     *Conf
		input    *Conf
		expected *Conf
		pass     bool
	}{
		{name: "Empty", conf: NewConf(), input: NewConf(), expected: NewConf(), pass: true},
		{name: "Merge", conf: MustNewConfFromMap(map[string]any{"a": "b"}), input: MustNewConfFromMap(map[string]any{"c": "d"}), expected: MustNewConfFromMap(map[string]any{"a": "b", "c": "d"}), pass: true},
		{name: "NestedMerge", conf: MustNewConfFromMap(map[string]any{"a": map[string]any{"b": "v1", "c": "v2"}}), input: MustNewConfFromMap(map[string]any{"a": map[string]any{"d": "v1", "e": "v2"}}), expected: MustNewConfFromMap(map[string]any{"a": map[string]any{"b": "v1", "c": "v2", "d": "v1", "e": "v2"}}), pass: true},
		{name: "Override", conf: MustNewConfFromMap(map[string]any{"a": "b"}), input: MustNewConfFromMap(map[string]any{"a": "c"}), expected: MustNewConfFromMap(map[string]any{"a": "c"}), pass: true},
	}

	t.Parallel()
	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			err := tc.conf.Merge(tc.input)
			if !tc.pass {
				assert.Error(t, err)
				return
			}

			require.NoError(t, err)
			assert.Equal(t, tc.expected.Raw(), tc.conf.Raw())
			assert.Equal(t, tc.expected.Raw(), tc.conf.Raw())
		})
	}
}

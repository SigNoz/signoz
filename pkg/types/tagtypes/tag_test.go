package tagtypes

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestValidatePostableTag(t *testing.T) {
	tests := []struct {
		name      string
		input     PostableTag
		wantKey   string
		wantValue string
		wantError bool
	}{
		{name: "simple pair", input: PostableTag{Key: "team", Value: "pulse"}, wantKey: "team", wantValue: "pulse"},
		{name: "preserves casing", input: PostableTag{Key: "Team", Value: "Pulse"}, wantKey: "Team", wantValue: "Pulse"},
		{name: "trims key", input: PostableTag{Key: "  team  ", Value: "pulse"}, wantKey: "team", wantValue: "pulse"},
		{name: "trims value", input: PostableTag{Key: "team", Value: "  pulse  "}, wantKey: "team", wantValue: "pulse"},

		{name: "empty key rejected", input: PostableTag{Key: "", Value: "pulse"}, wantError: true},
		{name: "empty value rejected", input: PostableTag{Key: "team", Value: ""}, wantError: true},
		{name: "whitespace-only key rejected", input: PostableTag{Key: "   ", Value: "pulse"}, wantError: true},
		{name: "whitespace-only value rejected", input: PostableTag{Key: "team", Value: "   "}, wantError: true},

		{name: "slash accepted", input: PostableTag{Key: "team/eng", Value: "pulse/events"}, wantKey: "team/eng", wantValue: "pulse/events"},
		{name: "colon accepted", input: PostableTag{Key: "team:eng", Value: "env:prod"}, wantKey: "team:eng", wantValue: "env:prod"},
		{name: "extra punctuation accepted in both", input: PostableTag{Key: "a_b-c@d#e$f{g}h", Value: "a_b-c@d#e$f{g}h"}, wantKey: "a_b-c@d#e$f{g}h", wantValue: "a_b-c@d#e$f{g}h"},

		// Key is strict; value allows the extra `. + =` plus leading digits.
		{name: "dot in key rejected", input: PostableTag{Key: "team.eng", Value: "pulse"}, wantError: true},
		{name: "dot in value accepted", input: PostableTag{Key: "team", Value: "pulse.events"}, wantKey: "team", wantValue: "pulse.events"},
		{name: "plus in key rejected", input: PostableTag{Key: "team+eng", Value: "pulse"}, wantError: true},
		{name: "plus in value accepted", input: PostableTag{Key: "team", Value: "a+b"}, wantKey: "team", wantValue: "a+b"},
		{name: "equals in key rejected", input: PostableTag{Key: "team=eng", Value: "pulse"}, wantError: true},
		{name: "equals in value accepted", input: PostableTag{Key: "team", Value: "a=b"}, wantKey: "team", wantValue: "a=b"},
		{name: "leading digit in key rejected", input: PostableTag{Key: "2024team", Value: "pulse"}, wantError: true},
		{name: "leading digit in value accepted", input: PostableTag{Key: "team", Value: "2024_team"}, wantKey: "team", wantValue: "2024_team"},

		{name: "unicode letter in key rejected", input: PostableTag{Key: "チーム", Value: "pulse"}, wantError: true},
		{name: "unicode letter in value rejected", input: PostableTag{Key: "team", Value: "東京"}, wantError: true},

		{name: "internal space in key rejected", input: PostableTag{Key: "team eng", Value: "pulse"}, wantError: true},
		{name: "internal space in value rejected", input: PostableTag{Key: "team", Value: "pulse two"}, wantError: true},

		{name: "disallowed char in key rejected", input: PostableTag{Key: "team!eng", Value: "pulse"}, wantError: true},
		{name: "disallowed char in value rejected", input: PostableTag{Key: "team", Value: "pulse!one"}, wantError: true},
		{name: "control char rejected", input: PostableTag{Key: "team\tone", Value: "pulse"}, wantError: true},

		{name: "key at the 32-char limit accepted", input: PostableTag{Key: "abcdefghijklmnopabcdefghijklmnop", Value: "pulse"}, wantKey: "abcdefghijklmnopabcdefghijklmnop", wantValue: "pulse"},
		{name: "value at the 32-char limit accepted", input: PostableTag{Key: "team", Value: "abcdefghijklmnopabcdefghijklmnop"}, wantKey: "team", wantValue: "abcdefghijklmnopabcdefghijklmnop"},
		{name: "key over the 32-char limit rejected", input: PostableTag{Key: "abcdefghijklmnopabcdefghijklmnopq", Value: "pulse"}, wantError: true},
		{name: "value over the 32-char limit rejected", input: PostableTag{Key: "team", Value: "abcdefghijklmnopabcdefghijklmnopq"}, wantError: true},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			gotKey, gotValue, err := ValidatePostableTag(tc.input)
			if tc.wantError {
				require.Error(t, err)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, tc.wantKey, gotKey)
			assert.Equal(t, tc.wantValue, gotValue)
		})
	}
}

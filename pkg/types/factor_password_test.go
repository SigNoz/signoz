package types

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
)

func TestMustGenerateFactorPassword(t *testing.T) {
	assert.NotPanics(t, func() {
		MustGenerateFactorPassword(valuer.GenerateUUID().String())
	})
}

func TestIsPasswordValid(t *testing.T) {
	// length is measured in runes (characters), not bytes, so a password
	// that satisfies the rule on byte-length but not character-length must
	// be rejected. See https://github.com/SigNoz/signoz/issues/11111.
	valid := []string{
		"Abcdefghijk1!", // 13 ASCII chars
	}
	for _, pwd := range valid {
		assert.Truef(t, IsPasswordValid(pwd), "expected password %q to be valid", pwd)
	}

	invalid := []string{
		"",             // empty
		"Abc1!",        // too short
		"abcdefghijk1", // no uppercase, no symbol
		"ABCDEFGHIJK1", // no lowercase, no symbol
		"Abcdefghijk!", // no number
		"Abcdefghijk1", // no symbol
		"日本語Aa1!",      // only 7 characters; 13 bytes but fewer runes than minPasswordLength
	}
	for _, pwd := range invalid {
		assert.Falsef(t, IsPasswordValid(pwd), "expected password %q to be invalid", pwd)
	}

	// a password of exactly minPasswordLength runes, using multibyte letters
	// that are neutral to case, should still be accepted when all rules pass.
	exactlyMin := "日本語Abcdefg1!" // 12 runes: 3 CJK + A + bcdefg + 1 + !
	assert.True(t, IsPasswordValid(exactlyMin))
}

func TestErrInvalidPasswordMessage(t *testing.T) {
	// the symbol list must render as a readable string, not as Go's default
	// slice formatting (e.g. "%!c([]int=[...])").
	msg := ErrInvalidPassword.Error()
	assert.NotContains(t, msg, "%!")
	assert.Contains(t, msg, string(symbols))
}

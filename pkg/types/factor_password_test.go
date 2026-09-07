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
	tests := []struct {
		name     string
		password string
		valid    bool
	}{
		{"valid standard", "Admin1234567!", true},
		{"too short by rune count", "🚀🚀🚀Aa1!", false},  // 8 runes < 12, but 16 bytes >= 12
		{"semicolon allowed", "Admin1234567;", true},        // ; is valid punctuation
		{"apostrophe allowed", "Admin'1234567", true},       // ' is valid punctuation
		{"space allowed", "Admin 1234567!", true},           // space is printable, ! is symbol
		{"control char rejected", "Admin1234567!\x01", false}, // non-printable
		{"missing uppercase", "admin1234567!", false},
		{"missing lowercase", "ADMIN1234567!", false},
		{"missing number", "AdminPassword!", false},
		{"missing symbol", "Admin1234567X", false},
		{"11 chars too short", "Admin12345!", false},    // 11 rune chars < 12 → invalid
		{"exactly 12 rune chars", "Admin123456!", true}, // A-d-m-i-n-1-2-3-4-5-6-! = 12
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.valid, IsPasswordValid(tt.password))
		})
	}
}

func TestIsPasswordValidRuneCount(t *testing.T) {
	// 3 emoji (3 runes, 12 bytes) + 4 ASCII = 7 rune chars < 12 → invalid
	// Before fix: len("🚀🚀🚀Aa1!") = 16 bytes >= 12 → was incorrectly valid
	assert.False(t, IsPasswordValid("🚀🚀🚀Aa1!"), "multi-byte chars must be counted by rune, not byte")
}

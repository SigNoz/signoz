package types

import (
	"crypto/sha256"
	"encoding/hex"
	"testing"

	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
)

func TestMustGenerateFactorPassword(t *testing.T) {
	assert.NotPanics(t, func() {
		MustGenerateFactorPassword(valuer.GenerateUUID().String())
	})
}

func TestIsPasswordValidAcceptsSHA256Hex(t *testing.T) {
	digest := sha256.Sum256([]byte("whatever-the-raw-password-was"))
	hexDigest := hex.EncodeToString(digest[:])

	assert.True(t, IsPasswordValid(hexDigest))
}

func TestIsPasswordValidAcceptsRawComplexPassword(t *testing.T) {
	// Exercises the config-driven admin bootstrap password path
	// (pkg/modules/user/impluser/service.go), which never goes through the
	// browser's client-side hashing.
	assert.True(t, IsPasswordValid("Correct-Horse-Battery-9"))
}

func TestIsPasswordValidRejectsWeakRawPassword(t *testing.T) {
	assert.False(t, IsPasswordValid("short"))
	assert.False(t, IsPasswordValid("alllowercase12345"))
	assert.False(t, IsPasswordValid(""))
}

func TestIsPasswordValidRejectsNearMissHex(t *testing.T) {
	digest := sha256.Sum256([]byte("x"))
	hexDigest := hex.EncodeToString(digest[:])

	// one char too short
	assert.False(t, IsPasswordValid(hexDigest[:len(hexDigest)-1]))
	// uppercase hex isn't what the frontend produces
	assert.False(t, IsPasswordValid("A"+hexDigest[1:]))
}

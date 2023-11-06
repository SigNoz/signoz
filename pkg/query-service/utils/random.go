package utils

import (
	"crypto/rand"
	"encoding/hex"
)

func RandomHex(sz int) (string, error) {
	bytes := make([]byte, sz)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

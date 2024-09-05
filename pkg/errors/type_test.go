package errors

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestString(t *testing.T) {
	typ := typ{"test-error"}
	assert.Equal(t, typ.s, "test-error")
}

func TestEquals(t *testing.T) {
	typ1 := typ{"test-error"}
	typ2 := typ{"test-error"}
	assert.True(t, typ1 == typ2)
}

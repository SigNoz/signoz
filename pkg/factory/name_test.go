package factory

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestName(t *testing.T) {
	assert.Equal(t, Name{name: "c1"}, MustNewName("c1"))
}

func TestNameWithInvalidCharacters(t *testing.T) {
	_, err := NewName("c1%")
	assert.Error(t, err)

	assert.Panics(t, func() {
		MustNewName("c1%")
	})
}

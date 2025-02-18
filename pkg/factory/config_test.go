package factory

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

type c1 struct{}

func (c1) Validate() error {
	return nil
}

func TestNewConfigFactory(t *testing.T) {
	cf := NewConfigFactory(MustNewName("c1"), func() Config {
		return c1{}
	})
	assert.Equal(t, MustNewName("c1"), cf.Name())
	assert.IsType(t, c1{}, cf.New())
}

func TestNewConfigFactoryWithPointer(t *testing.T) {
	cfp := NewConfigFactory(MustNewName("c1"), func() Config {
		return &c1{}
	})
	assert.Equal(t, MustNewName("c1"), cfp.Name())
	assert.IsType(t, &c1{}, cfp.New())
}

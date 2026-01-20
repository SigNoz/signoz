package factory

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
)

type p1 struct{}

type pc1 struct{}

func (pc1) Validate() error {
	return nil
}

func TestNewProviderFactory(t *testing.T) {
	pf := NewProviderFactory(MustNewName("p1"), func(ctx context.Context, settings ProviderSettings, config pc1) (p1, error) {
		return p1{}, nil
	})
	assert.Equal(t, MustNewName("p1"), pf.Name())
	p, err := pf.New(context.Background(), ProviderSettings{}, pc1{})
	assert.NoError(t, err)
	assert.IsType(t, p1{}, p)
}

func TestNewProviderFactoryFromFactory(t *testing.T) {
	pf := NewProviderFactory(MustNewName("p1"), func(ctx context.Context, settings ProviderSettings, config pc1) (p1, error) {
		return p1{}, nil
	})

	m := MustNewNamedMap(pf)
	assert.Equal(t, MustNewName("p1"), pf.Name())
	p, err := NewProviderFromNamedMap(context.Background(), ProviderSettings{}, pc1{}, m, "p1")
	assert.NoError(t, err)
	assert.IsType(t, p1{}, p)

	_, err = NewProviderFromNamedMap(context.Background(), ProviderSettings{}, pc1{}, m, "p2")
	assert.Error(t, err)
}

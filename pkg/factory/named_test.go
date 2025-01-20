package factory

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

type f1 struct{}

func (*f1) Name() Name {
	return MustNewName("f1")
}

type f2 struct{}

func (*f2) Name() Name {
	return MustNewName("f2")
}

func TestNewNamedMap(t *testing.T) {
	nm, err := NewNamedMap[Named](&f1{}, &f2{})
	assert.NoError(t, err)
	assert.Equal(t, map[Name]Named{
		MustNewName("f1"): &f1{},
		MustNewName("f2"): &f2{},
	}, nm.factories)
	assert.Equal(t, []Named{&f1{}, &f2{}}, nm.GetInOrder())
}

func TestNewNamedMapWithDuplicateNames(t *testing.T) {
	_, err := NewNamedMap[Named](&f1{}, &f1{})
	assert.Error(t, err)
}

func TestMustNewNamedMap(t *testing.T) {
	nm := MustNewNamedMap[Named](&f1{}, &f2{})
	assert.Equal(t, map[Name]Named{
		MustNewName("f1"): &f1{},
		MustNewName("f2"): &f2{},
	}, nm.factories)
	assert.Equal(t, []Named{&f1{}, &f2{}}, nm.GetInOrder())
}

func TestMustNewNamedMapDuplicateNames(t *testing.T) {
	assert.Panics(t, func() {
		MustNewNamedMap[Named](&f1{}, &f1{})
	})
}

func TestNamedMapGet(t *testing.T) {
	nm := MustNewNamedMap[Named](&f1{}, &f2{})

	nf1, err := nm.Get("f1")
	assert.NoError(t, err)
	assert.IsType(t, &f1{}, nf1)

	_, err = nm.Get("f3")
	assert.Error(t, err)
}

func TestNamedMapAdd(t *testing.T) {
	nm := MustNewNamedMap[Named](&f1{})

	err := nm.Add(&f2{})
	assert.NoError(t, err)
	assert.Equal(t, map[Name]Named{
		MustNewName("f1"): &f1{},
		MustNewName("f2"): &f2{},
	}, nm.factories)
	assert.Equal(t, []Named{&f1{}, &f2{}}, nm.GetInOrder())
}

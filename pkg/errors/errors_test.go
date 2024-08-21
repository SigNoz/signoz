package errors

import (
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestNew(t *testing.T) {
	typ := typ{"test-error"}
	err := New(typ, "test error info")
	assert.NotNil(t, err)
}

func TestNewf(t *testing.T) {
	typ := typ{"test-error"}
	err := Newf(typ, "test error info with %s", "string")
	assert.NotNil(t, err)
	assert.Equal(t, "test-error: test error info with string", err.Error())
}

func TestWrapf(t *testing.T) {
	typ := typ{"test-error"}
	err := Wrapf(errors.New("original error"), typ, "info for err %d", 2)
	assert.NotNil(t, err)
}

func TestError(t *testing.T) {
	typ := typ{"test-error"}
	err1 := New(typ, "info for err1")
	assert.Equal(t, "test-error: info for err1", err1.Error())

	err2 := Wrapf(err1, typ, "info for err2")
	assert.Equal(t, "test-error: info for err1", err2.Error())
}

func TestUnwrapb(t *testing.T) {
	typ := typ{"test-error"}
	oerr := errors.New("original error")
	berr := Wrapf(oerr, typ, "this is a base err")

	atyp, ai, aerr := Unwrapb(berr)
	assert.Equal(t, typ, atyp)
	assert.Equal(t, "this is a base err", ai)
	assert.Equal(t, oerr, aerr)

	atyp, _, _ = Unwrapb(oerr)
	assert.Equal(t, TypeInternal, atyp)
}

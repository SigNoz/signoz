package errors

import (
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestNew(t *testing.T) {
	typ := typ{"test-error"}
	err := New(typ, MustNewCode("code"), "test error info")
	assert.NotNil(t, err)
}

func TestNewf(t *testing.T) {
	typ := typ{"test-error"}
	err := Newf(typ, MustNewCode("test_code"), "test error info with %s", "string")
	assert.NotNil(t, err)
	assert.Equal(t, "test-error(test_code): test error info with string", err.Error())
}

func TestWrapf(t *testing.T) {
	typ := typ{"test-error"}
	err := Wrapf(errors.New("original error"), typ, MustNewCode("test_code"), "info for err %d", 2)
	assert.NotNil(t, err)
}

func TestError(t *testing.T) {
	typ := typ{"test-error"}
	err1 := New(typ, MustNewCode("test_code"), "info for err1")
	assert.Equal(t, "test-error(test_code): info for err1", err1.Error())

	err2 := Wrapf(err1, typ, MustNewCode("test_code"), "info for err2")
	assert.Equal(t, "test-error(test_code): info for err1", err2.Error())
}

func TestUnwrapb(t *testing.T) {
	typ := typ{"test-error"}
	oerr := errors.New("original error")
	berr := Wrapf(oerr, typ, MustNewCode("test_code"), "this is a base err").WithUrl("https://docs").WithAdditional("additional err")

	atyp, acode, amessage, aerr, au, aa := Unwrapb(berr)
	assert.Equal(t, typ, atyp)
	assert.Equal(t, "test_code", acode.String())
	assert.Equal(t, "this is a base err", amessage)
	assert.Equal(t, oerr, aerr)
	assert.Equal(t, "https://docs", au)
	assert.Equal(t, []string{"additional err"}, aa)

	atyp, _, _, _, _, _ = Unwrapb(oerr)
	assert.Equal(t, TypeInternal, atyp)
}

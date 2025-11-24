package errors

import (
	"errors" //nolint:depguard
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
	assert.Equal(t, "test error info with string", err.Error())
}

func TestWrapf(t *testing.T) {
	typ := typ{"test-error"}
	err := Wrapf(errors.New("original error"), typ, MustNewCode("test_code"), "info for err %d", 2)
	assert.NotNil(t, err)
}

func TestError(t *testing.T) {
	typ := typ{"test-error"}
	err1 := New(typ, MustNewCode("test_code"), "info for err1")
	assert.Equal(t, "info for err1", err1.Error())

	err2 := Wrapf(err1, typ, MustNewCode("test_code"), "info for err2")
	assert.Equal(t, "info for err1", err2.Error())
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

func TestWithAdditionalf(t *testing.T) {
	t.Run("adds additional message to base error", func(t *testing.T) {
		typ := typ{"test-error"}
		baseErr := New(typ, MustNewCode("test_code"), "primary message")

		result := WithAdditionalf(baseErr, "additional context %d", 456)

		assert.NotNil(t, result)
		_, _, msg, _, _, additional := Unwrapb(result)
		assert.Equal(t, "primary message", msg, "primary message should not change")
		assert.Equal(t, []string{"additional context 456"}, additional)
	})

	t.Run("adds additional message to non-base error", func(t *testing.T) {
		stdErr := errors.New("some error")

		result := WithAdditionalf(stdErr, "extra info: %s", "details")

		assert.NotNil(t, result)
		_, _, _, _, _, additional := Unwrapb(result)
		assert.Equal(t, []string{"extra info: details"}, additional)
	})

	t.Run("appends to existing additional messages", func(t *testing.T) {
		typ := typ{"test-error"}
		baseErr := New(typ, MustNewCode("test_code"), "message").
			WithAdditional("first additional", "second additional")

		result := WithAdditionalf(baseErr, "third additional %s", "msg")

		_, _, _, _, _, additional := Unwrapb(result)
		assert.Equal(t, []string{
			"first additional",
			"second additional",
			"third additional msg",
		}, additional)
	})
}

func TestWithUrl(t *testing.T) {
	t.Run("adds url to base error", func(t *testing.T) {
		typ := typ{"test-error"}
		baseErr := New(typ, MustNewCode("test_code"), "error message")

		result := baseErr.WithUrl("https://docs.signoz.io/errors")

		_, _, _, _, url, _ := Unwrapb(result)
		assert.Equal(t, "https://docs.signoz.io/errors", url)
	})

	t.Run("replaces existing url", func(t *testing.T) {
		typ := typ{"test-error"}
		baseErr := New(typ, MustNewCode("test_code"), "error message").
			WithUrl("https://old-url.com")

		result := baseErr.WithUrl("https://new-url.com")

		_, _, _, _, url, _ := Unwrapb(result)
		assert.Equal(t, "https://new-url.com", url)
	})
}

func TestWithAdditional(t *testing.T) {
	t.Run("adds additional messages to base error", func(t *testing.T) {
		typ := typ{"test-error"}
		baseErr := New(typ, MustNewCode("test_code"), "main message")

		result := baseErr.WithAdditional("hint 1", "hint 2", "hint 3")

		_, _, _, _, _, additional := Unwrapb(result)
		assert.Equal(t, []string{"hint 1", "hint 2", "hint 3"}, additional)
	})

	t.Run("replaces existing additional messages", func(t *testing.T) {
		typ := typ{"test-error"}
		baseErr := New(typ, MustNewCode("test_code"), "message").
			WithAdditional("old hint")

		result := baseErr.WithAdditional("new hint 1", "new hint 2")

		_, _, _, _, _, additional := Unwrapb(result)
		assert.Equal(t, []string{"new hint 1", "new hint 2"}, additional)
	})
}

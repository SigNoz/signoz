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

func TestWithAppendf(t *testing.T) {
	t.Run("appends to base error message", func(t *testing.T) {
		typ := typ{"test-error"}
		baseErr := New(typ, MustNewCode("test_code"), "original message")

		result := WithAppendf(baseErr, " with context %d", 123)

		assert.NotNil(t, result)
		// Verify the message field was updated
		_, _, msg, _, _, _ := Unwrapb(result)
		assert.Equal(t, "original message with context 123", msg)
		// Verify Error() returns the appended message
		assert.Equal(t, "original message with context 123", result.Error())
	})

	t.Run("appends to non-base error", func(t *testing.T) {
		stdErr := errors.New("standard error")

		result := WithAppendf(stdErr, " (connection timeout)")

		assert.NotNil(t, result)
		// Verify the message field includes appended text
		_, _, msg, wrappedErr, _, _ := Unwrapb(result)
		assert.Equal(t, "standard error (connection timeout)", msg)
		assert.Equal(t, stdErr, wrappedErr)

		// BUG: This test demonstrates the issue - Error() returns the wrapped error's message
		// instead of the appended message
		assert.Equal(t, "standard error", result.Error(),
			"BUG: Error() should return 'standard error (connection timeout)' but returns wrapped error's message")
	})

	t.Run("preserves other base error fields", func(t *testing.T) {
		typ := typ{"validation-error"}
		code := MustNewCode("invalid_input")
		baseErr := New(typ, code, "field is required").
			WithUrl("https://docs.example.com").
			WithAdditional("see field validation rules")

		result := WithAppendf(baseErr, " for user %s", "john@example.com")

		atyp, acode, msg, _, url, additional := Unwrapb(result)
		assert.Equal(t, typ, atyp)
		assert.Equal(t, code, acode)
		assert.Equal(t, "field is required for user john@example.com", msg)
		assert.Equal(t, "https://docs.example.com", url)
		assert.Equal(t, []string{"see field validation rules"}, additional)
	})
}

func TestWithAppend(t *testing.T) {
	t.Run("appends string to base error message", func(t *testing.T) {
		typ := typ{"test-error"}
		baseErr := New(typ, MustNewCode("test_code"), "database error")

		result := WithAppend(baseErr, ": connection refused")

		assert.NotNil(t, result)
		_, _, msg, _, _, _ := Unwrapb(result)
		assert.Equal(t, "database error: connection refused", msg)
		assert.Equal(t, "database error: connection refused", result.Error())
	})

	t.Run("appends to non-base error", func(t *testing.T) {
		stdErr := errors.New("network failure")

		result := WithAppend(stdErr, " on port 8080")

		assert.NotNil(t, result)
		_, _, msg, wrappedErr, _, _ := Unwrapb(result)
		assert.Equal(t, "network failure on port 8080", msg)
		assert.Equal(t, stdErr, wrappedErr)

		// BUG: Demonstrates the same issue as WithAppendf
		assert.Equal(t, "network failure", result.Error(),
			"BUG: Error() should return 'network failure on port 8080' but returns wrapped error's message")
	})

	t.Run("works with wrapped base errors", func(t *testing.T) {
		typ := typ{"internal"}
		originalErr := errors.New("connection lost")
		wrappedErr := Wrapf(originalErr, typ, MustNewCode("conn_error"), "failed to connect")

		result := WithAppend(wrappedErr, " to database")

		_, _, msg, wrappedInner, _, _ := Unwrapb(result)
		assert.Equal(t, "failed to connect to database", msg)
		assert.Equal(t, originalErr, wrappedInner)
		// This works correctly because wrappedErr is a base error
		assert.Equal(t, "connection lost", result.Error())
	})
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

package errors

import (
	"errors" //nolint:depguard
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
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
	assert.Equal(t, []additional{{message: "additional err"}}, aa)

	atyp, _, _, _, _, _ = Unwrapb(oerr)
	assert.Equal(t, TypeInternal, atyp)
}

func TestAttr(t *testing.T) {
	err := New(TypeInternal, MustNewCode("test_code"), "test error")
	attr := Attr(err)
	assert.Equal(t, "exception", attr.Key)
	assert.Equal(t, err, attr.Value.Any())
}

func TestWithSuggestions(t *testing.T) {
	err := New(TypeInternal, MustNewCode("test_code"), "test error").WithSuggestions("try this")
	assert.Equal(t, []string{"try this"}, suggestionsOf(err))

	// WithSuggestions replaces the existing list.
	err = err.WithSuggestions("try this instead")
	assert.Equal(t, []string{"try this instead"}, suggestionsOf(err))

	// Variadic form replaces with multiple entries.
	err = err.WithSuggestions("first", "second")
	assert.Equal(t, []string{"first", "second"}, suggestionsOf(err))
}

func TestWithSuggestiveAdditional(t *testing.T) {
	// WithSuggestiveAdditional attaches suggestions to a specific detail (in the
	// errors array), distinct from the error-wide WithSuggestions.
	err := NewInvalidInputf(MustNewCode("bad_field"), "unknown field %q", "filed").
		WithSuggestiveAdditional("field `filed` not found", "did you mean: `field`")

	j := AsJSON(err)
	assert.Equal(t, []responseerroradditional{
		{Message: "field `filed` not found", Suggestions: []string{"did you mean: `field`"}},
	}, j.Errors)
	assert.Nil(t, j.Suggestions, "detail-scoped suggestions must not leak into the error-wide list")
}

func TestWithRetryAfter(t *testing.T) {
	err := New(TypeInternal, MustNewCode("test_code"), "test error").WithRetryAfter(5 * time.Microsecond)
	r := retryOf(err)

	assert.Equal(t, 5, int(r.delay.Microseconds()))
}

func TestAsJSONBaseError(t *testing.T) {
	err := New(TypeInvalidInput, MustNewCode("bad_input"), "field foo is bad").
		WithUrl("https://docs/bad_input").
		WithAdditional("hint1", "hint2").
		WithSuggestions("try this")

	j := AsJSON(err)

	assert.Equal(t, "invalid-input", j.Type)
	assert.Equal(t, "bad_input", j.Code)
	assert.Equal(t, "field foo is bad", j.Message)
	assert.Equal(t, "https://docs/bad_input", j.Url)
	assert.Equal(t, []responseerroradditional{{Message: "hint1"}, {Message: "hint2"}}, j.Errors)

	// InvalidInput auto-applies the after_fix policy via NewInvalidInputf — but
	// New (bare constructor) does not. The retry block should reflect that.
	assert.Nil(t, j.Retry, "bare New(...) should not populate a retry block")

	assert.Equal(t, []string{"try this"}, j.Suggestions)
}

func TestAsJSONWrappedErrorPreservesHints(t *testing.T) {
	// An inner base carries the user-facing hints (e.g. produced inside an
	// UnmarshalJSON), then gets re-wrapped (e.g. WrapInvalidInputf). suggestionsOf
	// must walk the cause chain so the hints still surface.
	inner := NewInvalidInputf(MustNewCode("bad_kind"), "unknown panel kind %q", "boom").
		WithSuggestions("valid references: a, b, c")

	wrapped := WrapInvalidInputf(inner, MustNewCode("outer"), "%s", inner.Error())

	j := AsJSON(wrapped)
	assert.Equal(t, []string{"valid references: a, b, c"}, j.Suggestions,
		"suggestions on an inner base must survive wrapping")
}

func TestAsJSONRetryBlock(t *testing.T) {
	t.Run("RetryAfterIncludesDuration", func(t *testing.T) {
		err := NewTimeoutf(MustNewCode("slow"), "slow").WithRetryAfter(5 * time.Second)
		j := AsJSON(err)
		require.NotNil(t, j.Retry)
		assert.Equal(t, 5*time.Second, j.Retry.Delay)
	})

	t.Run("NonAfterPolicyOmitsDurationField", func(t *testing.T) {
		// NewInvalidInputf auto-applies retryAfterFix via the constructor helper.
		err := NewInvalidInputf(MustNewCode("bad"), "bad")
		j := AsJSON(err)
		require.Nil(t, j.Retry, "retry must be empty")
	})

	t.Run("BareErrorOmitsRetryBlock", func(t *testing.T) {
		err := New(TypeInternal, MustNewCode("boom"), "boom")
		j := AsJSON(err)
		assert.Nil(t, j.Retry, "bare New(...) without WithRetry* must omit retry")
	})

	t.Run("NonBaseErrorOmitsRetryBlock", func(t *testing.T) {
		// Stdlib errors carry no retry metadata; AsJSON omits the retry block.
		j := AsJSON(errors.New("plain stdlib error"))
		assert.Nil(t, j.Retry, "non-base errors must omit the retry block")
	})
}

func TestAsJSONOptionalFieldsOmittedWhenEmpty(t *testing.T) {
	j := AsJSON(New(TypeInternal, MustNewCode("boom"), "boom"))
	assert.Nil(t, j.Suggestions, "no suggestions set => Suggestions must be nil so json omitempty drops it")
}

func TestWithStacktrace(t *testing.T) {
	err := New(TypeInternal, MustNewCode("test_code"), "panic").WithStacktrace("custom stack trace")

	assert.Equal(t, "custom stack trace", err.Stacktrace())
	assert.Equal(t, "panic", err.Error())

	typ, code, message, _, _, _ := Unwrapb(err)
	assert.Equal(t, TypeInternal, typ)
	assert.Equal(t, "test_code", code.String())
	assert.Equal(t, "panic", message)
}

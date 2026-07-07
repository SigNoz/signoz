package errors

import (
	"errors" //nolint:depguard
	"fmt"
	"log/slog"
	"time"

	"go.opentelemetry.io/otel/attribute"
)

// base is the fundamental struct that implements the error interface.
type base struct {
	// t denotes the custom type of the error.
	t typ
	// c denotes the short code for the error message.
	c Code
	// m contains error message passed through errors.New.
	m string
	// e is the actual error being wrapped.
	e error
	// u denotes the url for the documentation (if present) for the error.
	u string
	// a denotes any additional error details (if present). Each detail carries an
	// optional message and any user-facing suggestions closely related to it.
	a []additional
	// s contains the stacktrace captured at error creation time.
	s fmt.Stringer
	// r is the retry strategy for the error, if applicable.
	r *retry
	// suggestions is a list of user-facing suggestions related to the error as a
	// whole (not tied to a specific detail in a), if present. For example,
	// "narrow the time range window". For a suggestion tied to a specific detail,
	// use the suggestions field on additional instead.
	suggestions []string
}

// additional is a single supplementary error detail: a message plus any
// user-facing suggestions (e.g. "did you mean: `x`") closely related to it.
type additional struct {
	message     string
	suggestions []string
}

// Stacktrace returns the stacktrace captured at error creation time, formatted as a string.
func (b *base) Stacktrace() string {
	if b.s == nil {
		return ""
	}
	return b.s.String()
}

// WithStacktrace replaces the auto-captured stacktrace with a pre-formatted string
// and returns a new base error.
func (b *base) WithStacktrace(s string) *base {
	return &base{
		t:           b.t,
		c:           b.c,
		m:           b.m,
		e:           b.e,
		u:           b.u,
		a:           b.a,
		s:           rawStacktrace(s),
		r:           b.r,
		suggestions: b.suggestions,
	}
}

// base implements Error interface.
func (b *base) Error() string {
	if b.e != nil {
		return b.e.Error()
	}

	return b.m
}

// Unwrap exposes the wrapped cause so stdlib errors.Is / errors.As can walk
// the chain — e.g. errors.Is(WrapCanceledf(context.Canceled, …), context.Canceled).
func (b *base) Unwrap() error {
	return b.e
}

// New returns a base error. It requires type, code and message as input.
func New(t typ, code Code, message string) *base {
	return &base{
		t: t,
		c: code,
		m: message,
		e: nil,
		u: "",
		a: []additional{},
		s: newStackTrace(),
	}
}

// Newf returns a new base by formatting the error message with the supplied format specifier.
func Newf(t typ, code Code, format string, args ...any) *base {
	return &base{
		t: t,
		c: code,
		m: fmt.Sprintf(format, args...),
		e: nil,
		s: newStackTrace(),
	}
}

// Wrapf returns a new error by formatting the error message with the supplied format specifier
// and wrapping another error with base.
func Wrapf(cause error, t typ, code Code, format string, args ...any) *base {
	b := &base{
		t: t,
		c: code,
		m: fmt.Sprintf(format, args...),
		e: cause,
		s: newStackTrace(),
	}

	// Carry the user-facing hints forward from the wrapped cause. Otherwise
	// wrapping a structured error (e.g. one returned from an UnmarshalJSON) would
	// silently drop its suggestions / invalid references from the response.
	// Propagation is transitive: each Wrapf copies from its immediate cause, so
	// the hints survive arbitrarily deep wrapping as long as it goes through Wrapf.
	if inner, ok := cause.(*base); ok {
		b.r = inner.r
		b.a = inner.a
		b.suggestions = inner.suggestions
	}

	return b
}

// Wrap returns a new error by wrapping another error with base.
func Wrap(cause error, t typ, code Code, message string) *base {
	b := &base{
		t: t,
		c: code,
		m: message,
		e: cause,
		s: newStackTrace(),
	}

	// Carry the user-facing hints forward from the wrapped cause. Otherwise
	// wrapping a structured error (e.g. one returned from an UnmarshalJSON) would
	// silently drop its suggestions / invalid references from the response.
	// Propagation is transitive: each Wrapf copies from its immediate cause, so
	// the hints survive arbitrarily deep wrapping as long as it goes through Wrapf.
	if inner, ok := cause.(*base); ok {
		b.r = inner.r
		b.a = inner.a
		b.suggestions = inner.suggestions
	}

	return b
}

// WithAdditionalf adds an additional error message to the existing error.
func WithAdditionalf(cause error, format string, args ...any) *base {
	if b, ok := cause.(*base); ok {
		return b.WithAdditional(fmt.Sprintf(format, args...))
	}

	t, c, m, e, u, a := Unwrapb(cause)
	b := &base{t: t, c: c, m: m, e: e, u: u, a: a, s: newStackTrace(), r: retryOf(cause)}
	return b.WithAdditional(fmt.Sprintf(format, args...))
}

// WithSuggestiveAdditionalf appends a detail whose message is built from the format
// specifier and which carries the given user-facing suggestions closely related to
// it, returning a new base error.
func WithSuggestiveAdditionalf(cause error, suggestions []string, format string, args ...any) *base {
	if b, ok := cause.(*base); ok {
		return b.WithSuggestiveAdditional(fmt.Sprintf(format, args...), suggestions...)
	}

	t, c, m, e, u, a := Unwrapb(cause)
	b := &base{t: t, c: c, m: m, e: e, u: u, a: a, s: newStackTrace(), r: retryOf(cause)}
	return b.WithSuggestiveAdditional(fmt.Sprintf(format, args...), suggestions...)
}

// WithUrl adds a url to the base error and returns a new base error.
func (b *base) WithUrl(u string) *base {
	return &base{
		t:           b.t,
		c:           b.c,
		m:           b.m,
		e:           b.e,
		u:           u,
		a:           b.a,
		s:           b.s,
		r:           b.r,
		suggestions: b.suggestions,
	}
}

// WithAdditional appends one or more message-only details and returns a new base error.
func (b *base) WithAdditional(messages ...string) *base {
	extra := make([]additional, len(messages))
	for i, m := range messages {
		extra[i] = additional{message: m}
	}
	return b.WithAdditionals(extra...)
}

// WithAdditionals appends the given details and returns a new base error. It is also
// the way to re-attach details previously pulled out via Unwrapb.
func (b *base) WithAdditionals(additionals ...additional) *base {
	nb := *b
	nb.a = append(append([]additional{}, b.a...), additionals...)
	return &nb
}

// withRetry adds retry metadata to the base error and returns a new base error.
func (b *base) withRetry(r retry) *base {
	return &base{
		t:           b.t,
		c:           b.c,
		m:           b.m,
		e:           b.e,
		u:           b.u,
		a:           b.a,
		s:           b.s,
		r:           &r,
		suggestions: b.suggestions,
	}
}

// WithSuggestions replaces the error-wide suggestions and returns a new base error.
// These relate to the error as a whole; for a suggestion tied to a specific detail,
// use WithSuggestiveAdditional.
func (b *base) WithSuggestions(suggestions ...string) *base {
	return &base{
		t:           b.t,
		c:           b.c,
		m:           b.m,
		e:           b.e,
		u:           b.u,
		a:           b.a,
		s:           b.s,
		r:           b.r,
		suggestions: suggestions,
	}
}

// WithSuggestiveAdditional appends a detail carrying a message together with the
// user-facing suggestions closely related to it, and returns a new base error.
func (b *base) WithSuggestiveAdditional(message string, suggestions ...string) *base {
	return b.WithAdditionals(additional{message: message, suggestions: suggestions})
}

// WithRetryAfter sets the retry delay on the base error and returns a new base error.
func (b *base) WithRetryAfter(delay time.Duration) *base {
	return b.withRetry(newRetryAfter(delay))
}

// Unwrapb is a combination of built-in errors.As and type casting.
// It finds the first error in cause that matches base,
// and if one is found, returns the individual fields of base.
// Otherwise, it returns TypeInternal, the original error string
// and the error itself.
//
//nolint:staticcheck // ST1008: intentional return order matching struct field order (TCMEUA)
func Unwrapb(cause error) (typ, Code, string, error, string, []additional) {
	base, ok := cause.(*base)
	if ok {
		return base.t, base.c, base.m, base.e, base.u, base.a
	}

	return TypeInternal, CodeUnknown, cause.Error(), cause, "", []additional{}
}

// Ast checks if the provided error matches the specified custom error type.
func Ast(cause error, typ typ) bool {
	t, _, _, _, _, _ := Unwrapb(cause)

	return t == typ
}

// Asc checks if the provided error matches the specified custom error code.
func Asc(cause error, code Code) bool {
	_, c, _, _, _, _ := Unwrapb(cause)

	return c.s == code.s
}

// Join is a wrapper around errors.Join.
func Join(errs ...error) error {
	return errors.Join(errs...)
}

// As is a wrapper around errors.As.
func As(err error, target any) bool {
	return errors.As(err, target)
}

// Is is a wrapper around errors.Is.
func Is(err error, target error) bool {
	return errors.Is(err, target)
}

// WrapNotFoundf is a wrapper around Wrapf with TypeNotFound.
func WrapNotFoundf(cause error, code Code, format string, args ...any) *base {
	return Wrapf(cause, TypeNotFound, code, format, args...)
}

// NewNotFoundf is a wrapper around Newf with TypeNotFound.
func NewNotFoundf(code Code, format string, args ...any) *base {
	return Newf(TypeNotFound, code, format, args...)
}

// WrapInternalf is a wrapper around Wrapf with TypeInternal.
func WrapInternalf(cause error, code Code, format string, args ...any) *base {
	return Wrapf(cause, TypeInternal, code, format, args...)
}

// NewInternalf is a wrapper around Newf with TypeInternal.
func NewInternalf(code Code, format string, args ...any) *base {
	return Newf(TypeInternal, code, format, args...)
}

// WrapInvalidInputf is a wrapper around Wrapf with TypeInvalidInput.
func WrapInvalidInputf(cause error, code Code, format string, args ...any) *base {
	return Wrapf(cause, TypeInvalidInput, code, format, args...)
}

// NewInvalidInputf is a wrapper around Newf with TypeInvalidInput.
func NewInvalidInputf(code Code, format string, args ...any) *base {
	return Newf(TypeInvalidInput, code, format, args...)
}

// NewMethodNotAllowedf is a wrapper around Newf with TypeMethodNotAllowed.
func NewMethodNotAllowedf(code Code, format string, args ...any) *base {
	return Newf(TypeMethodNotAllowed, code, format, args...)
}

// WrapTimeoutf is a wrapper around Wrapf with TypeTimeout.
func WrapTimeoutf(cause error, code Code, format string, args ...any) *base {
	return Wrapf(cause, TypeTimeout, code, format, args...)
}

// NewTimeoutf is a wrapper around Newf with TypeTimeout.
func NewTimeoutf(code Code, format string, args ...any) *base {
	return Newf(TypeTimeout, code, format, args...)
}

// WrapCanceledf is a wrapper around Wrapf with TypeCanceled.
func WrapCanceledf(cause error, code Code, format string, args ...any) *base {
	return Wrapf(cause, TypeCanceled, code, format, args...)
}

// NewCanceledf is a wrapper around Newf with TypeCanceled.
func NewCanceledf(code Code, format string, args ...any) *base {
	return Newf(TypeCanceled, code, format, args...)
}

// WrapUnauthenticatedf is a wrapper around Wrapf with TypeUnauthenticated.
func WrapUnauthenticatedf(cause error, code Code, format string, args ...any) *base {
	return Wrapf(cause, TypeUnauthenticated, code, format, args...)
}

// NewUnauthenticatedf is a wrapper around Newf with TypeUnauthenticated.
func NewUnauthenticatedf(code Code, format string, args ...any) *base {
	return Newf(TypeUnauthenticated, code, format, args...)
}

// WrapForbiddenf is a wrapper around Wrapf with TypeForbidden.
func WrapForbiddenf(cause error, code Code, format string, args ...any) *base {
	return Wrapf(cause, TypeForbidden, code, format, args...)
}

// NewForbiddenf is a wrapper around Newf with TypeForbidden.
func NewForbiddenf(code Code, format string, args ...any) *base {
	return Newf(TypeForbidden, code, format, args...)
}

// Attr returns an slog.Attr with a standardized "exception" key for the given error.
func Attr(err error) slog.Attr {
	return slog.Any("exception", err)
}

// TypeAttr returns an OTel attribute.KeyValue with the "error.type" semconv key
// set to the error's type string.
func TypeAttr(err error) attribute.KeyValue {
	t, _, _, _, _, _ := Unwrapb(err)
	return attribute.String("error.type", t.String())
}

// RetryDelayOf returns the explicit retry delay set via WithRetryAfter,
// or zero if the error carries no retry delay.
func RetryDelayOf(err error) time.Duration {
	base, ok := err.(*base)
	if !ok || base.r == nil {
		return 0
	}
	return base.r.delay
}

func retryOf(err error) *retry {
	base, ok := err.(*base)
	if ok {
		return base.r
	}
	return nil
}

func suggestionsOf(err error) []string {
	base, ok := err.(*base)
	if ok {
		return base.suggestions
	}
	return nil
}

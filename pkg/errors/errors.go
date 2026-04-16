package errors

import (
	"errors" //nolint:depguard
	"fmt"
	"log/slog"
)

// base is the fundamental struct that implements the error interface.
// The order of the struct is 'TCMEUAS'.
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
	// a denotes any additional error messages (if present).
	a []string
	// s contains the stacktrace captured at error creation time.
	s fmt.Stringer
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
		t: b.t,
		c: b.c,
		m: b.m,
		e: b.e,
		u: b.u,
		a: b.a,
		s: rawStacktrace(s),
	}
}

// base implements Error interface.
func (b *base) Error() string {
	if b.e != nil {
		return b.e.Error()
	}

	return b.m
}

// New returns a base error. It requires type, code and message as input.
func New(t typ, code Code, message string) *base {
	return &base{
		t: t,
		c: code,
		m: message,
		e: nil,
		u: "",
		a: []string{},
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
	return &base{
		t: t,
		c: code,
		m: fmt.Sprintf(format, args...),
		e: cause,
		s: newStackTrace(),
	}
}

// Wrap returns a new error by wrapping another error with base.
func Wrap(cause error, t typ, code Code, message string) *base {
	return &base{
		t: t,
		c: code,
		m: message,
		e: cause,
		s: newStackTrace(),
	}
}

// WithAdditionalf adds an additional error message to the existing error.
func WithAdditionalf(cause error, format string, args ...any) *base {
	t, c, m, e, u, a := Unwrapb(cause)
	var s fmt.Stringer
	if original, ok := cause.(*base); ok {
		s = original.s
	}
	b := &base{
		t: t,
		c: c,
		m: m,
		e: e,
		u: u,
		a: a,
		s: s,
	}

	return b.WithAdditional(append(a, fmt.Sprintf(format, args...))...)
}

// WithUrl adds a url to the base error and returns a new base error.
func (b *base) WithUrl(u string) *base {
	return &base{
		t: b.t,
		c: b.c,
		m: b.m,
		e: b.e,
		u: u,
		a: b.a,
		s: b.s,
	}
}

// WithAdditional adds additional messages to the base error and returns a new base error.
func (b *base) WithAdditional(a ...string) *base {
	return &base{
		t: b.t,
		c: b.c,
		m: b.m,
		e: b.e,
		u: b.u,
		a: a,
		s: b.s,
	}
}

// Unwrapb is a combination of built-in errors.As and type casting.
// It finds the first error in cause that matches base,
// and if one is found, returns the individual fields of base.
// Otherwise, it returns TypeInternal, the original error string
// and the error itself.
//
//nolint:staticcheck // ST1008: intentional return order matching struct field order (TCMEUA)
func Unwrapb(cause error) (typ, Code, string, error, string, []string) {
	base, ok := cause.(*base)
	if ok {
		return base.t, base.c, base.m, base.e, base.u, base.a
	}

	return TypeInternal, CodeUnknown, cause.Error(), cause, "", []string{}
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

// WrapUnexpectedf is a wrapper around Wrapf with TypeUnexpected.
func WrapUnexpectedf(cause error, code Code, format string, args ...any) *base {
	return Wrapf(cause, TypeInvalidInput, code, format, args...)
}

// NewUnexpectedf is a wrapper around Newf with TypeUnexpected.
func NewUnexpectedf(code Code, format string, args ...any) *base {
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

// Attr returns an slog.Attr with a standardized "exception" key for the given error.
func Attr(err error) slog.Attr {
	return slog.Any("exception", err)
}

package errors

import (
	"errors"
	"fmt"
	"log/slog"
)

var (
	codeUnknown code = MustNewCode("unknown")
)

// base is the fundamental struct that implements the error interface.
// The order of the struct is 'TCMEUA'.
type base struct {
	// t denotes the custom type of the error.
	t typ
	// c denotes the short code for the error message.
	c code
	// m contains error message passed through errors.New.
	m string
	// e is the actual error being wrapped.
	e error
	// u denotes the url for the documentation (if present) for the error.
	u string
	// a denotes any additional error messages (if present).
	a []string
}

func (b *base) LogValue() slog.Value {
	return slog.GroupValue(
		slog.String("type", b.t.s),
		slog.String("code", b.c.s),
		slog.String("message", b.m),
		slog.String("url", b.u),
		slog.Any("additional", b.a),
	)
}

// base implements Error interface.
func (b *base) Error() string {
	if b.e != nil {
		return b.e.Error()
	}

	return fmt.Sprintf("%s(%s): %s", b.t.s, b.c, b.m)
}

// New returns a base error. It requires type, code and message as input.
func New(t typ, code code, message string) *base {
	return &base{
		t: t,
		c: code,
		m: message,
		e: nil,
		u: "",
		a: []string{},
	}
}

// Newf returns a new base by formatting the error message with the supplied format specifier.
func Newf(t typ, code code, format string, args ...interface{}) *base {
	return &base{
		t: t,
		c: code,
		m: fmt.Sprintf(format, args...),
		e: nil,
	}
}

// Wrapf returns a new error by formatting the error message with the supplied format specifier
// and wrapping another error with base.
func Wrapf(cause error, t typ, code code, format string, args ...interface{}) *base {
	return &base{
		t: t,
		c: code,
		m: fmt.Sprintf(format, args...),
		e: cause,
	}
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
	}
}

// WithUrl adds additional messages to the base error and returns a new base error.
func (b *base) WithAdditional(a ...string) *base {
	return &base{
		t: b.t,
		c: b.c,
		m: b.m,
		e: b.e,
		u: b.u,
		a: a,
	}
}

// Unwrapb is a combination of built-in errors.As and type casting.
// It finds the first error in cause that matches base,
// and if one is found, returns the individual fields of base.
// Otherwise, it returns TypeInternal, the original error string
// and the error itself.
//
//lint:ignore ST1008 we want to return arguments in the 'TCMEUA' order of the struct
func Unwrapb(cause error) (typ, code, string, error, string, []string) {
	base, ok := cause.(*base)
	if ok {
		return base.t, base.c, base.m, base.e, base.u, base.a
	}

	return TypeInternal, codeUnknown, cause.Error(), cause, "", []string{}
}

// Ast checks if the provided error matches the specified custom error type.
func Ast(cause error, typ typ) bool {
	t, _, _, _, _, _ := Unwrapb(cause)

	return t == typ
}

// Ast checks if the provided error matches the specified custom error code.
func Asc(cause error, code code) bool {
	_, c, _, _, _, _ := Unwrapb(cause)

	return c.s == code.s
}

// Join is a wrapper around errors.Join.
func Join(errs ...error) error {
	return errors.Join(errs...)
}

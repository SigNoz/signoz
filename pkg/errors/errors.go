package errors

import (
	"fmt"
)

// base is the fundamental struct that implements the error interface.
type base struct {
	// t denotes the custom type of the error.
	t typ
	// i contains error message passed through errors.New.
	i string
	// e is the actual error being wrapped.
	e error
}

func (b *base) Error() string {
	if b.e != nil {
		return b.e.Error()
	}

	return fmt.Sprintf("%s: %s", b.t.s, b.i)
}

// New returns a base error.
func New(t typ, info string) error {
	return &base{
		t: t,
		i: info,
		e: nil,
	}
}

// Newf returns a new base by formatting the error message with the supplied format specifier.
func Newf(t typ, format string, args ...interface{}) error {
	return &base{
		t: t,
		i: fmt.Sprintf(format, args...),
		e: nil,
	}
}

// Wrapf returns a new error by formatting the error message with the supplied format specifier
// and wrapping another error with base.
func Wrapf(cause error, t typ, format string, args ...interface{}) error {
	return &base{
		t: t,
		i: fmt.Sprintf(format, args...),
		e: cause,
	}
}

// Unwrapb is a combination of built-in errors.As and type casting.
// It finds the first error in cause that matches base,
// and if one is found, returns the individual fields of base.
// Otherwise, it returns TypeInternal, the original error string
// and the error itself.
func Unwrapb(cause error) (typ, string, error) {
	base, ok := cause.(*base)
	if ok {
		return base.t, base.i, base.e
	}

	return TypeInternal, cause.Error(), cause
}

// Ast checks if the provided error matches the specified custom error type.
func Ast(cause error, typ typ) bool {
	t, _, _ := Unwrapb(cause)

	return t == typ
}

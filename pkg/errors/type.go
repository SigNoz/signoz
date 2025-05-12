package errors

var (
	TypeInvalidInput     typ = typ{"invalid-input"}
	TypeInternal             = typ{"internal"}
	TypeUnsupported          = typ{"unsupported"}
	TypeNotFound             = typ{"not-found"}
	TypeMethodNotAllowed     = typ{"method-not-allowed"}
	TypeAlreadyExists        = typ{"already-exists"}
	TypeUnauthenticated      = typ{"unauthenticated"}
	TypeForbidden            = typ{"forbidden"}
)

// Defines custom error types
type typ struct{ s string }

func NotFoundWrap(cause error, code Code, format string, args ...interface{}) *base {
	return Wrapf(cause, TypeNotFound, code, format, args...)
}

func NotFoundNew(code Code, format string, args ...interface{}) *base {
	return Newf(TypeNotFound, code, format, args...)
}

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
	TypeCanceled             = typ{"canceled"}
	TypeTimeout              = typ{"timeout"}
)

// Defines custom error types
type typ struct{ s string }

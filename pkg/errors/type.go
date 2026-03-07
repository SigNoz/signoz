package errors

var (
	TypeInvalidInput       typ = typ{"invalid-input"}
	TypeInternal               = typ{"internal"}
	TypeUnsupported            = typ{"unsupported"}
	TypeNotFound               = typ{"not-found"}
	TypeMethodNotAllowed       = typ{"method-not-allowed"}
	TypeAlreadyExists          = typ{"already-exists"}
	TypeUnauthenticated        = typ{"unauthenticated"}
	TypeForbidden              = typ{"forbidden"}
	TypeCanceled               = typ{"canceled"}
	TypeTimeout                = typ{"timeout"}
	TypeUnexpected             = typ{"unexpected"} // Generic mismatch of expectations
	TypeLicenseUnavailable     = typ{"license-unavailable"}
)

// Defines custom error types
type typ struct{ s string }

func (t typ) String() string {
	return t.s
}

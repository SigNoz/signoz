package errors

import (
	"regexp"
)

var (
	CodeInvalidInput       Code = Code{"invalid_input"}
	CodeInternal                = Code{"internal"}
	CodeUnsupported             = Code{"unsupported"}
	CodeNotFound                = Code{"not_found"}
	CodeMethodNotAllowed        = Code{"method_not_allowed"}
	CodeAlreadyExists           = Code{"already_exists"}
	CodeUnauthenticated         = Code{"unauthenticated"}
	CodeForbidden               = Code{"forbidden"}
	CodeCanceled                = Code{"canceled"}
	CodeTimeout                 = Code{"timeout"}
	CodeUnknown                 = Code{"unknown"}
	CodeFatal                   = Code{"fatal"}
	CodeLicenseUnavailable      = Code{"license_unavailable"}
	CodeTooManyRequests         = Code{"too_many_requests"}
)

var (
	// Used when reverse engineering an error from a response that doesn't have a code.
	// This should never be used in the codebase, and if it is, it's a bug that should be fixed by using proper error handling and including error codes in responses.
	CodeUnset = Code{"unset"}
)

var (
	codeRegex = regexp.MustCompile(`^[a-z_]+$`)
)

type Code struct{ s string }

func NewCode(s string) (Code, error) {
	if !codeRegex.MatchString(s) {
		return Code{}, NewInvalidInputf(CodeInvalidInput, "invalid code: %v", s)
	}

	return Code{s: s}, nil
}

func MustNewCode(s string) Code {
	code, err := NewCode(s)
	if err != nil {
		panic(err)
	}

	return code
}

func (c Code) String() string {
	return c.s
}

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
	CodeLicenseUnavailable      = Code{"license_unavailable"}
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

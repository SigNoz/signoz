package errors

import (
	"fmt"
	"regexp"
)

var (
	CodeInvalidInput     code = code{"invalid_input"}
	CodeInternal              = code{"internal"}
	CodeUnsupported           = code{"unsupported"}
	CodeNotFound              = code{"not_found"}
	CodeMethodNotAllowed      = code{"method_not_allowed"}
	CodeAlreadyExists         = code{"already_exists"}
	CodeUnauthenticated       = code{"unauthenticated"}
)

var (
	codeRegex = regexp.MustCompile(`^[a-z_]+$`)
)

type code struct{ s string }

func NewCode(s string) (code, error) {
	if !codeRegex.MatchString(s) {
		return code{}, fmt.Errorf("invalid code: %v", s)
	}

	return code{s: s}, nil
}

func MustNewCode(s string) code {
	code, err := NewCode(s)
	if err != nil {
		panic(err)
	}

	return code
}

func (c code) String() string {
	return c.s
}

package errors

import (
	"fmt"
	"regexp"
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

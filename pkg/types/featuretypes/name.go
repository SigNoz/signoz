package featuretypes

import (
	"regexp"

	"github.com/SigNoz/signoz/pkg/errors"
)

var nameRegex = regexp.MustCompile(`^[a-z][a-z0-9_]+$`)

// Name is a concrete type for a feature name.
// We make this abstract to avoid direct use of strings and enforce
// a consistent way to create and validate feature names.
type Name struct {
	s string
}

func NewName(s string) (Name, error) {
	if !nameRegex.MatchString(s) {
		return Name{}, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "invalid feature name: %s", s)
	}

	return Name{s: s}, nil
}

func MustNewName(s string) Name {
	name, err := NewName(s)
	if err != nil {
		panic(err)
	}

	return name
}

func (n Name) String() string {
	return n.s
}

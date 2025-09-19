package authtypes

import (
	"regexp"

	"github.com/SigNoz/signoz/pkg/errors"
)

var (
	nameRegex = regexp.MustCompile("^[a-z]{1,35}$")
)

type Name struct {
	val string
}

func NewName(name string) (Name, error) {
	if !nameRegex.MatchString(name) {
		return Name{}, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "name must conform to regex %s", nameRegex.String())
	}

	return Name{val: name}, nil
}

func MustNewName(name string) Name {
	named, err := NewName(name)
	if err != nil {
		panic(err)
	}

	return named
}

func (name Name) String() string {
	return name.val
}

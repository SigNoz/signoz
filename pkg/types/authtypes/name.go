package authtypes

import (
	"regexp"

	"github.com/SigNoz/signoz/pkg/errors"
)

var (
	nameRegex = regexp.MustCompile("")
)

type Name string

func MustNewName(name string) Name {
	if !nameRegex.MatchString(name) {
		panic(errors.NewInternalf(errors.CodeInternal, "name must confirm to regex %s", nameRegex.String()))
	}

	return Name(name)
}

func (name *Name) String() string {
	return string(*name)
}

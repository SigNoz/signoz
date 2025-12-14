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

func MustNewName(name string) Name {
	if !nameRegex.MatchString(name) {
		panic(errors.NewInternalf(errors.CodeInternal, "name must conform to regex %s", nameRegex.String()))
	}

	return Name{val: name}
}

func (name Name) String() string {
	return name.val
}

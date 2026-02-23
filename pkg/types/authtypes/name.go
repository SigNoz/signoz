package authtypes

import (
	"encoding/json"
	"regexp"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
)

var (
	nameRegex = regexp.MustCompile("^[a-z-]{1,50}$")

	_ json.Unmarshaler = new(Name)
)

type Name struct{ valuer.String }

func NewName(name string) (Name, error) {
	if !nameRegex.MatchString(name) {
		return Name{}, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "name must conform to regex %s", nameRegex.String())
	}

	return Name{valuer.NewString(name)}, nil
}

func MustNewName(name string) Name {
	named, err := NewName(name)
	if err != nil {
		panic(err)
	}

	return named
}

func (name *Name) UnmarshalJSON(data []byte) error {
	nameStr := ""
	err := json.Unmarshal(data, &nameStr)
	if err != nil {
		return err
	}

	shadow, err := NewName(nameStr)
	if err != nil {
		return err
	}

	*name = shadow
	return nil
}

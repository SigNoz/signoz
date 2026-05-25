package coretypes

import (
	"encoding"
	"encoding/json"
	"regexp"

	"github.com/SigNoz/signoz/pkg/errors"
)

var (
	kindRegex = regexp.MustCompile("^[a-z-]{1,50}$")
)

var (
	_ json.Marshaler           = new(Kind)
	_ json.Unmarshaler         = new(Kind)
	_ encoding.TextMarshaler   = new(Kind)
	_ encoding.TextUnmarshaler = new(Kind)
)

// Kind represents a specific kind of a Type. For example, for Type "metaresource", we can have Kinds like "dashboard", "alert", etc.
type Kind struct{ val string }

func NewKind(str string) (Kind, error) {
	if !kindRegex.MatchString(str) {
		return Kind{}, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "kind must conform to regex %s", kindRegex.String())
	}

	return Kind{val: str}, nil
}

func MustNewKind(str string) Kind {
	kind, err := NewKind(str)
	if err != nil {
		panic(err)
	}

	return kind
}

func (name Kind) String() string {
	return name.val
}

func (name *Kind) MarshalJSON() ([]byte, error) {
	return json.Marshal(name.val)
}

func (name *Kind) UnmarshalJSON(data []byte) error {
	str := ""
	err := json.Unmarshal(data, &str)
	if err != nil {
		return err
	}

	shadow, err := NewKind(str)
	if err != nil {
		return err
	}

	*name = shadow
	return nil
}

func (name Kind) MarshalText() ([]byte, error) {
	return []byte(name.val), nil
}

func (name *Kind) UnmarshalText(text []byte) error {
	shadow, err := NewKind(string(text))
	if err != nil {
		return err
	}
	*name = shadow
	return nil
}

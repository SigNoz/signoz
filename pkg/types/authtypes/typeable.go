package authtypes

import (
	"encoding/json"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
	openfgav1 "github.com/openfga/api/proto/openfga/v1"
)

var (
	ErrCodeAuthZUnavailable = errors.MustNewCode("authz_unavailable")
	ErrCodeAuthZForbidden   = errors.MustNewCode("authz_forbidden")
)

var (
	TypeUser         = Type{valuer.NewString("user")}
	TypeRole         = Type{valuer.NewString("role")}
	TypeOrganization = Type{valuer.NewString("organization")}
	TypeResource     = Type{valuer.NewString("resource")}
	TypeResources    = Type{valuer.NewString("resources")}
)

var (
	TypeableUser         = &typeableUser{}
	TypeableRole         = &typeableRole{}
	TypeableOrganization = &typeableOrganization{}
)

type Typeable interface {
	Type() Type
	Name() Name
	Prefix() string
	Tuples(subject string, relation Relation, selector []Selector) ([]*openfgav1.TupleKey, error)
}

type Type struct{ valuer.String }

func MustNewType(input string) Type {
	typed, err := NewType(input)
	if err != nil {
		panic(err)
	}

	return typed
}

func NewType(input string) (Type, error) {
	switch input {
	case "user":
		return TypeUser, nil
	case "role":
		return TypeRole, nil
	case "organization":
		return TypeOrganization, nil
	case "resource":
		return TypeResource, nil
	case "resources":
		return TypeResources, nil
	default:
		return Type{}, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "invalid type: %s", input)
	}
}

func (typed *Type) UnmarshalJSON(data []byte) error {
	str := ""
	err := json.Unmarshal(data, &str)
	if err != nil {
		return err
	}

	shadow, err := NewType(str)
	if err != nil {
		return err
	}

	*typed = shadow
	return nil
}

func NewTypeableFromType(typed Type, name Name) (Typeable, error) {
	switch typed {
	case TypeRole:
		return TypeableRole, nil
	case TypeUser:
		return TypeableUser, nil
	case TypeOrganization:
		return TypeableOrganization, nil
	case TypeResource:
		resource, err := NewTypeableResource(name)
		if err != nil {
			return nil, err
		}
		return resource, nil
	case TypeResources:
		resources, err := NewTypeableResources(name)
		if err != nil {
			return nil, err
		}
		return resources, nil
	}

	return nil, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "invalid type")
}

func MustNewTypeableFromType(typed Type, name Name) Typeable {
	typeable, err := NewTypeableFromType(typed, name)
	if err != nil {
		panic(err)
	}

	return typeable
}

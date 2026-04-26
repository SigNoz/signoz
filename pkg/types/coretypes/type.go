package coretypes

import (
	"encoding/json"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
)

var (
	ErrCodeInvalidType = errors.MustNewCode("invalid_type")
)

var (
	TypeUser           = Type{valuer.NewString("user")}
	TypeServiceAccount = Type{valuer.NewString("serviceaccount")}
	TypeAnonymous      = Type{valuer.NewString("anonymous")}
	TypeRole           = Type{valuer.NewString("role")}
	TypeOrganization   = Type{valuer.NewString("organization")}
	TypeMetaResource   = Type{valuer.NewString("metaresource")}
	TypeMetaResources  = Type{valuer.NewString("metaresources")}
)

// Represents a type of entity in the system.
// These types are fundamental/core entities in the system.
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
	case "serviceaccount":
		return TypeServiceAccount, nil
	case "role":
		return TypeRole, nil
	case "organization":
		return TypeOrganization, nil
	case "metaresource":
		return TypeMetaResource, nil
	case "metaresources":
		return TypeMetaResources, nil
	default:
		return Type{}, errors.Newf(errors.TypeInvalidInput, ErrCodeInvalidType, "invalid type: %s", input)
	}
}

func (typed *Type) UnmarshalJSON(data []byte) error {
	str := ""
	err := json.Unmarshal(data, &str)
	if err != nil {
		return err
	}

	alias, err := NewType(str)
	if err != nil {
		return err
	}

	*typed = alias
	return nil
}

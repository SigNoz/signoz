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
	ErrCodeAuthZInvalidType = errors.MustNewCode("authz_invalid_type")
)

var (
	TypeUser          = Type{valuer.NewString("user")}
	TypeAnonymous     = Type{valuer.NewString("anonymous")}
	TypeRole          = Type{valuer.NewString("role")}
	TypeOrganization  = Type{valuer.NewString("organization")}
	TypeMetaResource  = Type{valuer.NewString("metaresource")}
	TypeMetaResources = Type{valuer.NewString("metaresources")}
)

var (
	TypeableUser         = &typeableUser{}
	TypeableAnonymous    = &typeableAnonymous{}
	TypeableRole         = &typeableRole{}
	TypeableOrganization = &typeableOrganization{}
)

type Typeable interface {
	Type() Type
	Name() Name
	Prefix(orgId valuer.UUID) string
	Tuples(subject string, relation Relation, selector []Selector, orgID valuer.UUID) ([]*openfgav1.TupleKey, error)
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
	case "metaresource":
		return TypeMetaResource, nil
	case "metaresources":
		return TypeMetaResources, nil
	default:
		return Type{}, errors.Newf(errors.TypeInvalidInput, ErrCodeAuthZInvalidType, "invalid type: %s", input)
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

func NewTypeableFromType(typed Type, name Name) (Typeable, error) {
	switch typed {
	case TypeRole:
		return TypeableRole, nil
	case TypeUser:
		return TypeableUser, nil
	case TypeOrganization:
		return TypeableOrganization, nil
	case TypeMetaResource:
		resource, err := NewTypeableMetaResource(name)
		if err != nil {
			return nil, err
		}
		return resource, nil
	case TypeMetaResources:
		resources, err := NewTypeableMetaResources(name)
		if err != nil {
			return nil, err
		}
		return resources, nil
	}

	return nil, errors.Newf(errors.TypeInvalidInput, ErrCodeAuthZInvalidType, "invalid type %s", typed)
}

func MustNewTypeableFromType(typed Type, name Name) Typeable {
	typeable, err := NewTypeableFromType(typed, name)
	if err != nil {
		panic(err)
	}

	return typeable
}

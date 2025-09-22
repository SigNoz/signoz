package authtypes

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
	openfgav1 "github.com/openfga/api/proto/openfga/v1"
)

var (
	ErrCodeAuthZUnavailable          = errors.MustNewCode("authz_unavailable")
	ErrCodeAuthZForbidden            = errors.MustNewCode("authz_forbidden")
	ErrCodeAuthZInvalidSelectorRegex = errors.MustNewCode("authz_invalid_selector_regex")
	ErrCodeAuthZUnsupportedRelation  = errors.MustNewCode("authz_unsupported_relation")
	ErrCodeAuthZInvalidSubject       = errors.MustNewCode("authz_invalid_subject")
)

var (
	TypeUser         = Type{valuer.NewString("user")}
	TypeRole         = Type{valuer.NewString("role")}
	TypeOrganization = Type{valuer.NewString("organization")}
	TypeResource     = Type{valuer.NewString("resource")}
	TypeResources    = Type{valuer.NewString("resources")}
)

var (
	TypeableUser         = &user{}
	TypeableRole         = &role{}
	TypeableOrganization = &organization{}
)

type Typeable interface {
	Type() Type
	Name() Name
	Tuples(subject string, relation Relation, selector []Selector) ([]*openfgav1.TupleKey, error)
}

type Type struct{ valuer.String }

func MustNewType(input string) Type {
	switch input {
	case "user":
		return TypeUser
	case "role":
		return TypeRole
	case "organization":
		return TypeOrganization
	case "resource":
		return TypeResource
	case "resources":
		return TypeResources
	default:
		panic(errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "invalid type: %s", input))
	}
}

func MustNewTypeableFromType(typed Type, name Name) Typeable {
	switch typed {
	case TypeRole:
		return TypeableRole
	case TypeUser:
		return TypeableUser
	case TypeOrganization:
		return TypeableOrganization
	case TypeResource:
		return MustNewResource(name)
	case TypeResources:
		return MustNewResources(name)
	}

	panic(errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "invalid type"))
}

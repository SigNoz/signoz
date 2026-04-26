package authtypes

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	openfgav1 "github.com/openfga/api/proto/openfga/v1"
)

var (
	ErrCodeAuthZUnavailable = errors.MustNewCode("authz_unavailable")
	ErrCodeAuthZForbidden   = errors.MustNewCode("authz_forbidden")
	ErrCodeAuthZInvalidType = errors.MustNewCode("authz_invalid_type")
)

type Typeable interface {
	coretypes.Typeable
	Tuples(subject string, relation coretypes.Relation, selector []Selector, orgID valuer.UUID) ([]*openfgav1.TupleKey, error)
}

func NewTypeableFromType(typed coretypes.Type, kind coretypes.Kind) (Typeable, error) {
	switch typed {
	case coretypes.TypeRole:
		return NewTypeableRole(), nil
	case coretypes.TypeUser:
		return NewTypeableUser(), nil
	case coretypes.TypeServiceAccount:
		return NewTypeableServiceAccount(), nil
	case coretypes.TypeOrganization:
		return NewTypeableOrganization(), nil
	case coretypes.TypeMetaResource:
		resource, err := NewTypeableMetaResource(kind)
		if err != nil {
			return nil, err
		}
		return resource, nil
	case coretypes.TypeMetaResources:
		resources, err := NewTypeableMetaResources(kind)
		if err != nil {
			return nil, err
		}
		return resources, nil
	}

	return nil, errors.Newf(errors.TypeNotFound, coretypes.ErrCodeTypeableNotFound, "typeable does not exist for type %s", typed)
}

func MustNewTypeableFromType(typed coretypes.Type, kind coretypes.Kind) Typeable {
	typeable, err := NewTypeableFromType(typed, kind)
	if err != nil {
		panic(err)
	}

	return typeable
}

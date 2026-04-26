package coretypes

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
)

var (
	ErrCodeTypeableNotFound = errors.MustNewCode("typeable_not_found")
)

type Typeable interface {
	Type() Type
	Kind() Kind
	Prefix(orgId valuer.UUID) string
	Scope(relation Relation) string
}

func NewTypeableFromType(typed Type, kind Kind) (Typeable, error) {
	switch typed {
	case TypeRole:
		return NewTypeableRole(), nil
	case TypeUser:
		return NewTypeableUser(), nil
	case TypeServiceAccount:
		return NewTypeableServiceAccount(), nil
	case TypeOrganization:
		return NewTypeableOrganization(), nil
	case TypeMetaResource:
		resource, err := NewTypeableMetaResource(kind)
		if err != nil {
			return nil, err
		}
		return resource, nil
	case TypeMetaResources:
		resources, err := NewTypeableMetaResources(kind)
		if err != nil {
			return nil, err
		}
		return resources, nil
	}

	return nil, errors.Newf(errors.TypeNotFound, ErrCodeTypeableNotFound, "typeable does not exist for type %s", typed)
}

func MustNewTypeableFromType(typed Type, kind Kind) Typeable {
	typeable, err := NewTypeableFromType(typed, kind)
	if err != nil {
		panic(err)
	}

	return typeable
}

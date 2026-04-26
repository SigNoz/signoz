package coretypes

import (
	"github.com/SigNoz/signoz/pkg/valuer"
)

var _ Typeable = new(typeableMetaResource)

type typeableMetaResource struct {
	kind Kind
}

func NewTypeableMetaResource(kind Kind) (Typeable, error) {
	return &typeableMetaResource{kind: kind}, nil
}

func MustNewTypeableMetaResource(kind Kind) Typeable {
	typeableesource, err := NewTypeableMetaResource(kind)
	if err != nil {
		panic(err)
	}

	return typeableesource
}

func (typeableMetaResource *typeableMetaResource) Type() Type {
	return TypeMetaResource
}

func (typeableMetaResource *typeableMetaResource) Kind() Kind {
	return typeableMetaResource.kind
}

// example: metaresource:organization/0199c47d-f61b-7833-bc5f-c0730f12f046/dashboard
func (typeableMetaResource *typeableMetaResource) Prefix(orgID valuer.UUID) string {
	return typeableMetaResource.Type().StringValue() + ":" + "organization" + "/" + orgID.StringValue() + "/" + typeableMetaResource.Kind().String()
}

func (typeableMetaResource *typeableMetaResource) Scope(relation Relation) string {
	return typeableMetaResource.Kind().String() + ":" + relation.StringValue()
}

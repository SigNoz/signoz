package coretypes

import (
	"github.com/SigNoz/signoz/pkg/valuer"
)

var _ Typeable = new(typeableMetaResources)

type typeableMetaResources struct {
	kind Kind
}

func NewTypeableMetaResources(kind Kind) (Typeable, error) {
	return &typeableMetaResources{kind: kind}, nil
}

func MustNewTypeableMetaResources(kind Kind) Typeable {
	resources, err := NewTypeableMetaResources(kind)
	if err != nil {
		panic(err)
	}

	return resources
}

func (typeableMetaResources *typeableMetaResources) Type() Type {
	return TypeMetaResources
}

func (typeableMetaResources *typeableMetaResources) Kind() Kind {
	return typeableMetaResources.kind
}

// example: metaresources:organization/0199c47d-f61b-7833-bc5f-c0730f12f046/dashboards
func (typeableMetaResources *typeableMetaResources) Prefix(orgID valuer.UUID) string {
	return typeableMetaResources.Type().StringValue() + ":" + "organization" + "/" + orgID.StringValue() + "/" + typeableMetaResources.Kind().String()
}

func (typeableMetaResources *typeableMetaResources) Scope(relation Relation) string {
	return typeableMetaResources.Kind().String() + ":" + relation.StringValue()
}

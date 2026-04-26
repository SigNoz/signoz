package coretypes

import (
	"github.com/SigNoz/signoz/pkg/valuer"
)

var _ Typeable = new(typeableOrganization)

type typeableOrganization struct{}

func NewTypeableOrganization() *typeableOrganization {
	return &typeableOrganization{}
}

func (typeableOrganization *typeableOrganization) Type() Type {
	return TypeOrganization
}

func (typeableOrganization *typeableOrganization) Kind() Kind {
	return MustNewKind("organization")
}

func (typeableOrganization *typeableOrganization) Prefix(_ valuer.UUID) string {
	return typeableOrganization.Type().StringValue()
}

func (typeableOrganization *typeableOrganization) Scope(relation Relation) string {
	return typeableOrganization.Kind().String() + ":" + relation.StringValue()
}

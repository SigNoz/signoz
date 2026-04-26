package coretypes

import (
	"github.com/SigNoz/signoz/pkg/valuer"
)

var _ Typeable = new(typeableRole)

type typeableRole struct{}

func NewTypeableRole() *typeableRole {
	return &typeableRole{}
}

func (typeableRole *typeableRole) Type() Type {
	return TypeRole
}

func (typeableRole *typeableRole) Kind() Kind {
	return MustNewKind("role")
}

// example: role:organization/0199c47d-f61b-7833-bc5f-c0730f12f046/role
func (typeableRole *typeableRole) Prefix(orgID valuer.UUID) string {
	return typeableRole.Type().StringValue() + ":" + "organization" + "/" + orgID.StringValue() + "/" + typeableRole.Kind().String()
}

func (typeableRole *typeableRole) Scope(relation Relation) string {
	return typeableRole.Kind().String() + ":" + relation.StringValue()
}

package coretypes

import (
	"github.com/SigNoz/signoz/pkg/valuer"
)

var _ Typeable = new(typeableUser)

type typeableUser struct{}

func NewTypeableUser() *typeableUser {
	return &typeableUser{}
}

func (typeableUser *typeableUser) Type() Type {
	return TypeUser
}

func (typeableUser *typeableUser) Kind() Kind {
	return MustNewKind("user")
}

// example: user:organization/0199c47d-f61b-7833-bc5f-c0730f12f046/user
func (typeableUser *typeableUser) Prefix(orgID valuer.UUID) string {
	return typeableUser.Type().StringValue() + ":" + "organization" + "/" + orgID.StringValue() + "/" + typeableUser.Kind().String()
}

func (typeableUser *typeableUser) Scope(relation Relation) string {
	return typeableUser.Kind().String() + ":" + relation.StringValue()
}

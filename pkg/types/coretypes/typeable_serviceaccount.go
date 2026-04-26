package coretypes

import (
	"github.com/SigNoz/signoz/pkg/valuer"
)

var _ Typeable = new(typeableServiceAccount)

type typeableServiceAccount struct{}

func NewTypeableServiceAccount() *typeableServiceAccount {
	return &typeableServiceAccount{}
}

func (typeableServiceAccount *typeableServiceAccount) Type() Type {
	return TypeServiceAccount
}

func (typeableServiceAccount *typeableServiceAccount) Kind() Kind {
	return MustNewKind("serviceaccount")
}

// example: serviceaccount:organization/0199c47d-f61b-7833-bc5f-c0730f12f046/serviceaccount
func (typeableServiceAccount *typeableServiceAccount) Prefix(orgID valuer.UUID) string {
	return typeableServiceAccount.Type().StringValue() + ":" + "organization" + "/" + orgID.StringValue() + "/" + typeableServiceAccount.Kind().String()
}

func (typeableServiceAccount *typeableServiceAccount) Scope(relation Relation) string {
	return typeableServiceAccount.Kind().String() + ":" + relation.StringValue()
}

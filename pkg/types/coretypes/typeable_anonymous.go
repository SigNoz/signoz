package coretypes

import (
	"github.com/SigNoz/signoz/pkg/valuer"
)

var _ Typeable = new(typeableAnonymous)

var (
	AnonymousUser = valuer.UUID{}
)

type typeableAnonymous struct{}

func NewTypeableAnonymous() *typeableAnonymous {
	return &typeableAnonymous{}
}

func (typeableAnonymous *typeableAnonymous) Type() Type {
	return TypeAnonymous
}

func (typeableAnonymous *typeableAnonymous) Kind() Kind {
	return MustNewKind("anonymous")
}

// example: anonymous:organization/0199c47d-f61b-7833-bc5f-c0730f12f046/anonymous
func (typeableAnonymous *typeableAnonymous) Prefix(orgID valuer.UUID) string {
	return typeableAnonymous.Type().StringValue() + ":" + "organization" + "/" + orgID.StringValue() + "/" + typeableAnonymous.Kind().String()
}

func (typeableAnonymous *typeableAnonymous) Scope(relation Relation) string {
	return typeableAnonymous.Kind().String() + ":" + relation.StringValue()
}

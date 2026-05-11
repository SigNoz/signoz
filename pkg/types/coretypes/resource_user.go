package coretypes

import (
	"github.com/SigNoz/signoz/pkg/valuer"
)

type resourceUser struct {
	kind Kind
}

func NewResourceUser() Resource {
	return &resourceUser{
		kind: KindUser,
	}
}

func (*resourceUser) Type() Type {
	return TypeUser
}

func (resourceUser *resourceUser) Kind() Kind {
	return resourceUser.kind
}

// example: user:organization/0199c47d-f61b-7833-bc5f-c0730f12f046/user
func (resourceUser *resourceUser) Prefix(orgID valuer.UUID) string {
	return resourceUser.Type().StringValue() + ":" + "organization" + "/" + orgID.StringValue() + "/" + resourceUser.Kind().String()
}

func (resourceUser *resourceUser) Object(orgID valuer.UUID, selector string) string {
	return resourceUser.Prefix(orgID) + "/" + selector
}

func (resourceUser *resourceUser) Scope(verb Verb) string {
	return resourceUser.Kind().String() + ":" + verb.StringValue()
}

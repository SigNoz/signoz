package coretypes

import (
	"github.com/SigNoz/signoz/pkg/valuer"
)

type resourceRole struct {
	kind Kind
}

func NewResourceRole() Resource {
	return &resourceRole{
		kind: KindRole,
	}
}

func (resourceRole *resourceRole) Type() Type {
	return TypeRole
}

func (resourceRole *resourceRole) Kind() Kind {
	return resourceRole.kind
}

// example: role:organization/0199c47d-f61b-7833-bc5f-c0730f12f046/role
func (resourceRole *resourceRole) Prefix(orgID valuer.UUID) string {
	return resourceRole.Type().StringValue() + ":" + "organization" + "/" + orgID.StringValue() + "/" + resourceRole.Kind().String()
}

func (resourceRole *resourceRole) Object(orgID valuer.UUID, selector string) string {
	return resourceRole.Prefix(orgID) + "/" + selector
}

func (resourceRole *resourceRole) Scope(verb Verb) string {
	return resourceRole.Kind().String() + ":" + verb.StringValue()
}

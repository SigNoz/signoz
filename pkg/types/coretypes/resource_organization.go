package coretypes

import (
	"github.com/SigNoz/signoz/pkg/valuer"
)

type resourceOrganization struct {
	kind Kind
}

func NewResourceOrganization() Resource {
	return &resourceOrganization{
		kind: KindOrganization,
	}
}

func (*resourceOrganization) Type() Type {
	return TypeOrganization
}

func (resourceOrganization *resourceOrganization) Kind() Kind {
	return resourceOrganization.kind
}

func (resourceOrganization *resourceOrganization) Prefix(_ valuer.UUID) string {
	return resourceOrganization.Type().StringValue() + ":" + "organization"
}

func (resourceOrganization *resourceOrganization) Object(orgID valuer.UUID, selector string) string {
	return resourceOrganization.Prefix(orgID) + "/" + selector
}

func (resourceOrganization *resourceOrganization) Scope(verb Verb) string {
	return resourceOrganization.Kind().String() + ":" + verb.StringValue()
}

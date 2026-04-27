package coretypes

import (
	"strings"

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
	return resourceOrganization.Type().StringValue()
}

func (resourceOrganization *resourceOrganization) Object(_ valuer.UUID, selector string) string {
	return strings.Join([]string{resourceOrganization.Type().StringValue(), selector}, ":")
}

func (resourceOrganization *resourceOrganization) Scope(verb Verb) string {
	return resourceOrganization.Kind().String() + ":" + verb.StringValue()
}

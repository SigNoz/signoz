package coretypes

import (
	"github.com/SigNoz/signoz/pkg/valuer"
)

type resourceMetaResource struct {
	kind         Kind
	allowedVerbs []Verb
}

func NewResourceMetaResource(kind Kind, allowedVerbs ...Verb) Resource {
	if len(allowedVerbs) == 0 {
		allowedVerbs = TypeMetaResource.AllowedVerbs()
	}
	return &resourceMetaResource{kind: kind, allowedVerbs: allowedVerbs}
}

func (*resourceMetaResource) Type() Type {
	return TypeMetaResource
}

func (resourceMetaResource *resourceMetaResource) Kind() Kind {
	return resourceMetaResource.kind
}

// example: metaresource:organization/0199c47d-f61b-7833-bc5f-c0730f12f046/dashboard
func (resourceMetaResource *resourceMetaResource) Prefix(orgID valuer.UUID) string {
	return resourceMetaResource.Type().StringValue() + ":" + "organization" + "/" + orgID.StringValue() + "/" + resourceMetaResource.Kind().String()
}

func (resourceMetaResource *resourceMetaResource) Object(orgID valuer.UUID, selector string) string {
	return resourceMetaResource.Prefix(orgID) + "/" + selector
}

func (resourceMetaResource *resourceMetaResource) Scope(verb Verb) string {
	return resourceMetaResource.Kind().String() + ":" + verb.StringValue()
}

func (resourceMetaResource *resourceMetaResource) AllowedVerbs() []Verb {
	return resourceMetaResource.allowedVerbs
}

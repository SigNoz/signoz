package coretypes

import (
	"github.com/SigNoz/signoz/pkg/valuer"
)

type resourceMetaResource struct {
	kind Kind
}

func NewResourceMetaResource(kind Kind) Resource {
	return &resourceMetaResource{kind: kind}
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

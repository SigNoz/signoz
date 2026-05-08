package coretypes

import (
	"github.com/SigNoz/signoz/pkg/valuer"
)

type resourceMetaResources struct {
	kind Kind
}

func NewResourceMetaResources(kind Kind) Resource {
	return &resourceMetaResources{kind: kind}
}

func (*resourceMetaResources) Type() Type {
	return TypeMetaResources
}

func (resourceMetaResources *resourceMetaResources) Kind() Kind {
	return resourceMetaResources.kind
}

// example: metaresources:organization/0199c47d-f61b-7833-bc5f-c0730f12f046/dashboards
func (resourceMetaResources *resourceMetaResources) Prefix(orgID valuer.UUID) string {
	return resourceMetaResources.Type().StringValue() + ":" + "organization" + "/" + orgID.StringValue() + "/" + resourceMetaResources.Kind().String()
}

func (resourceMetaResources *resourceMetaResources) Object(orgID valuer.UUID, selector string) string {
	return resourceMetaResources.Prefix(orgID) + "/" + selector
}

func (resourceMetaResources *resourceMetaResources) Scope(verb Verb) string {
	return resourceMetaResources.Kind().String() + ":" + verb.StringValue()
}

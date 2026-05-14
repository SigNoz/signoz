package coretypes

import (
	"github.com/SigNoz/signoz/pkg/valuer"
)

type resourceTelemetryResource struct {
	kind Kind
}

func NewResourceTelemetryResource(kind Kind) Resource {
	return &resourceTelemetryResource{kind: kind}
}

func (*resourceTelemetryResource) Type() Type {
	return TypeTelemetryResource
}

func (resourceTelemetryResource *resourceTelemetryResource) Kind() Kind {
	return resourceTelemetryResource.kind
}

// example: telemetryresource:organization/0199c47d-f61b-7833-bc5f-c0730f12f046/logs
func (resourceTelemetryResource *resourceTelemetryResource) Prefix(orgID valuer.UUID) string {
	return resourceTelemetryResource.Type().StringValue() + ":" + "organization" + "/" + orgID.StringValue() + "/" + resourceTelemetryResource.Kind().String()
}

func (resourceTelemetryResource *resourceTelemetryResource) Object(orgID valuer.UUID, selector string) string {
	return resourceTelemetryResource.Prefix(orgID) + "/" + selector
}

func (resourceTelemetryResource *resourceTelemetryResource) Scope(verb Verb) string {
	return resourceTelemetryResource.Kind().String() + ":" + verb.StringValue()
}

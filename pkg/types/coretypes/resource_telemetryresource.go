package coretypes

import (
	"crypto/sha256"
	"encoding/hex"

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
	if selector == WildCardSelectorString {
		return resourceTelemetryResource.Prefix(orgID) + "/" + selector
	}

	return resourceTelemetryResource.Prefix(orgID) + "/" + telemetrySelectorHash(selector)
}

// Must stay stable: grant-time and check-time tuple objects both hash the selector
// here, so changing this invalidates every stored telemetry grant tuple.
func telemetrySelectorHash(selector string) string {
	sum := sha256.Sum256([]byte(selector))
	return hex.EncodeToString(sum[:16])
}

func (resourceTelemetryResource *resourceTelemetryResource) Scope(verb Verb) string {
	return resourceTelemetryResource.Kind().String() + ":" + verb.StringValue()
}

func (*resourceTelemetryResource) AllowedVerbs() []Verb {
	return TypeTelemetryResource.AllowedVerbs()
}

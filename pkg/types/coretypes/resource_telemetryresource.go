package coretypes

import (
	"crypto/sha256"
	"encoding/hex"
	"strings"

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

var telemetryQueryTypeSelectors = map[string]struct{}{
	"builder_query":          {},
	"builder_sub_query":      {},
	"builder_trace_operator": {},
	"promql":                 {},
	"clickhouse_sql":         {},
}

func IsTelemetryQueryTypeSelector(selector string) bool {
	_, ok := telemetryQueryTypeSelectors[selector]
	return ok
}

func (resourceTelemetryResource *resourceTelemetryResource) Object(orgID valuer.UUID, selector string) string {
	if selector == WildCardSelectorString {
		return resourceTelemetryResource.Prefix(orgID) + "/" + selector
	}

	parts := strings.SplitN(selector, "/", 2)
	if len(parts) == 2 && IsTelemetryQueryTypeSelector(parts[0]) {
		if parts[1] == WildCardSelectorString {
			return resourceTelemetryResource.Prefix(orgID) + "/" + parts[0] + "/" + WildCardSelectorString
		}

		return resourceTelemetryResource.Prefix(orgID) + "/" + parts[0] + "/" + TelemetrySelectorSegment(parts[1])
	}

	return resourceTelemetryResource.Prefix(orgID) + "/" + TelemetrySelectorSegment(selector)
}

// Must stay stable: grant-time and check-time object building both rely on
// producing the same segment for the same selector value.
func TelemetrySelectorSegment(selector string) string {
	sum := sha256.Sum256([]byte(selector))
	return hex.EncodeToString(sum[:16])
}

func (resourceTelemetryResource *resourceTelemetryResource) Scope(verb Verb) string {
	return resourceTelemetryResource.Kind().String() + ":" + verb.StringValue()
}

func (*resourceTelemetryResource) AllowedVerbs() []Verb {
	return TypeTelemetryResource.AllowedVerbs()
}

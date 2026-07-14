package coretypes

import (
	"crypto/sha256"
	"encoding/hex"
	"maps"
	"slices"
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

var telemetryGrantKeys = map[string]struct{}{
	"service.name": {},
}

func IsTelemetryQueryTypeSelector(selector string) bool {
	_, ok := telemetryQueryTypeSelectors[selector]
	return ok
}

func IsTelemetryGrantKey(key string) bool {
	_, ok := telemetryGrantKeys[key]
	return ok
}

func TelemetryGrantKeys() []string {
	return slices.Sorted(maps.Keys(telemetryGrantKeys))
}

func (resourceTelemetryResource *resourceTelemetryResource) Object(orgID valuer.UUID, selector string) string {
	prefix := resourceTelemetryResource.Prefix(orgID)

	if selector == WildCardSelectorString {
		return prefix + "/" + selector
	}

	parts := strings.SplitN(selector, "/", 3)
	if !IsTelemetryQueryTypeSelector(parts[0]) {
		return prefix + "/" + TelemetrySelectorSegment(selector)
	}

	if len(parts) == 2 && parts[1] == WildCardSelectorString {
		return prefix + "/" + selector
	}

	if len(parts) == 3 && IsTelemetryGrantKey(parts[1]) {
		if parts[2] == WildCardSelectorString {
			return prefix + "/" + selector
		}

		return prefix + "/" + parts[0] + "/" + parts[1] + "/" + TelemetrySelectorSegment(parts[2])
	}

	return prefix + "/" + TelemetrySelectorSegment(selector)
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

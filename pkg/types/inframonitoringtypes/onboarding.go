package inframonitoringtypes

import (
	"slices"

	"github.com/SigNoz/signoz/pkg/errors"
)

// PostableOnboarding is the request for GET /api/v2/infra_monitoring/onboarding.
// The single `type` query param selects which infra-monitoring subsection the
// readiness check runs for.
type PostableOnboarding struct {
	Type OnboardingType `query:"type" required:"true"`
}

// Validate rejects empty/unknown onboarding types.
func (req *PostableOnboarding) Validate() error {
	if req == nil {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "request is nil")
	}

	if req.Type.IsZero() {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "type is required")
	}

	if !slices.Contains(ValidOnboardingTypes, req.Type) {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid type: %s", req.Type)
	}

	return nil
}

// Onboarding is the response for GET /api/v2/infra_monitoring/onboarding.
//
// The three present/missing pairs partition a type's requirements into three
// dimensions — default-enabled metrics, optional metrics, required attributes —
// each bucketed by the collector component (receiver or processor) that
// produces it. Ready is true iff every Missing* array is empty.
type Onboarding struct {
	Type                         OnboardingType                    `json:"type" required:"true"`
	Ready                        bool                              `json:"ready" required:"true"`
	PresentDefaultEnabledMetrics []MetricsComponentEntry           `json:"presentDefaultEnabledMetrics" required:"true"`
	PresentOptionalMetrics       []MetricsComponentEntry           `json:"presentOptionalMetrics" required:"true"`
	PresentRequiredAttributes    []AttributesComponentEntry        `json:"presentRequiredAttributes" required:"true"`
	MissingDefaultEnabledMetrics []MissingMetricsComponentEntry    `json:"missingDefaultEnabledMetrics" required:"true"`
	MissingOptionalMetrics       []MissingMetricsComponentEntry    `json:"missingOptionalMetrics" required:"true"`
	MissingRequiredAttributes    []MissingAttributesComponentEntry `json:"missingRequiredAttributes" required:"true"`
}

// AssociatedComponent identifies the collector receiver or processor that a
// metric or attribute originates from. Name is free-form (e.g. "kubeletstatsreceiver").
type AssociatedComponent struct {
	Type OnboardingComponentType `json:"type" required:"true"`
	Name string                  `json:"name" required:"true"`
}

// MetricsComponentEntry lists metrics that share a single associated component.
type MetricsComponentEntry struct {
	Metrics             []string            `json:"metrics" required:"true"`
	AssociatedComponent AssociatedComponent `json:"associatedComponent" required:"true"`
}

// AttributesComponentEntry lists resource attributes that share a single associated component.
type AttributesComponentEntry struct {
	Attributes          []string            `json:"attributes" required:"true"`
	AssociatedComponent AssociatedComponent `json:"associatedComponent" required:"true"`
}

// MissingMetricsComponentEntry extends MetricsComponentEntry with a user-facing
// message and a docs link for fixing the missing metrics.
type MissingMetricsComponentEntry struct {
	MetricsComponentEntry
	Message           string `json:"message" required:"true"`
	DocumentationLink string `json:"documentationLink" required:"true"`
}

// MissingAttributesComponentEntry extends AttributesComponentEntry with a user-facing
// message and a docs link for fixing the missing attributes.
type MissingAttributesComponentEntry struct {
	AttributesComponentEntry
	Message           string `json:"message" required:"true"`
	DocumentationLink string `json:"documentationLink" required:"true"`
}

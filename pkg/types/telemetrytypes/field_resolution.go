package telemetrytypes

import "github.com/SigNoz/signoz/pkg/valuer"

// FieldResolution controls whether a query field addresses one physical key or
// an enabled semantic-convention family. The zero value keeps family resolution.
type FieldResolution struct {
	valuer.String
}

var (
	FieldResolutionUnspecified = FieldResolution{valuer.NewString("")}
	FieldResolutionExact       = FieldResolution{valuer.NewString("exact")}
)

// Enum returns the acceptable values for FieldResolution.
func (FieldResolution) Enum() []any {
	return []any{
		FieldResolutionExact,
		FieldResolutionUnspecified,
	}
}

// IsExact reports whether semantic-convention family expansion is disabled.
func (resolution FieldResolution) IsExact() bool {
	return resolution == FieldResolutionExact
}

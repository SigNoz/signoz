package telemetrytypes

import "github.com/SigNoz/signoz/pkg/valuer"

type Source struct {
	valuer.String
}

var (
	SourceAudit       = Source{valuer.NewString("audit")}
	SourceMeter       = Source{valuer.NewString("meter")}
	SourceUnspecified = Source{valuer.NewString("")}
)

// Enum returns the acceptable values for Source.
// The unspecified (empty) value is accepted and echoed back by the server for a
// non-meter query, so it is a valid enum member a typed client can round-trip.
// TODO: Add SourceAudit once the frontend is ready for consumption.
func (Source) Enum() []any {
	return []any{
		SourceMeter,
		SourceUnspecified,
	}
}

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
// TODO: Add SourceAudit once the frontend is ready for consumption.
func (Source) Enum() []any {
	return []any{
		SourceMeter,
	}
}

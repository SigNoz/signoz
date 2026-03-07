package telemetrytypes

import "github.com/SigNoz/signoz/pkg/valuer"

type Source struct {
	valuer.String
}

var (
	SourceMeter       = Source{valuer.NewString("meter")}
	SourceUnspecified = Source{valuer.NewString("")}
)

// Enum returns the acceptable values for Source.
func (Source) Enum() []any {
	return []any{
		SourceMeter,
	}
}

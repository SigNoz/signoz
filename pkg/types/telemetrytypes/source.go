package telemetrytypes

import "github.com/SigNoz/signoz/pkg/valuer"

type Source struct {
	valuer.String
}

var (
	SourceMeter       = Source{valuer.NewString("meter")}
	SourceUnspecified = Source{valuer.NewString("")}
)

package telemetrytypes

import "github.com/SigNoz/signoz/pkg/valuer"

type Signal struct {
	valuer.String
}

var (
	SignalTraces      = Signal{valuer.NewString("traces")}
	SignalLogs        = Signal{valuer.NewString("logs")}
	SignalMetrics     = Signal{valuer.NewString("metrics")}
	SignalMeter       = Signal{valuer.NewString("meter")}
	SignalUnspecified = Signal{valuer.NewString("")}
)

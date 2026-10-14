package telemetrytypes

import "github.com/SigNoz/signoz/pkg/valuer"

type Signal struct {
	valuer.String
}

var (
	SignalTraces      = Signal{valuer.NewString("traces")}
	SignalLogs        = Signal{valuer.NewString("logs")}
	SignalMetrics     = Signal{valuer.NewString("metrics")}
	SignalUnspecified = Signal{valuer.NewString("")}
)

// Enum returns the acceptable values for Signal.
func (Signal) Enum() []any {
	return []any{
		SignalTraces,
		SignalLogs,
		SignalMetrics,
		SignalUnspecified,
	}
}

// SignalFromText resolves a signal word to its Signal; ok is false for an
// unknown word.
func SignalFromText(text string) (Signal, bool) {
	s := Signal{valuer.NewString(text)}
	switch s {
	case SignalTraces:
		return SignalTraces, true
	case SignalLogs:
		return SignalLogs, true
	case SignalMetrics:
		return SignalMetrics, true
	}
	return Signal{}, false
}

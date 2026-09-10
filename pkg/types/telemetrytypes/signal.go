package telemetrytypes

import (
	"strings"

	"github.com/SigNoz/signoz/pkg/valuer"
)

type Signal struct {
	valuer.String
}

var (
	SignalTraces      = Signal{valuer.NewString("traces")}
	SignalLogs        = Signal{valuer.NewString("logs")}
	SignalMetrics     = Signal{valuer.NewString("metrics")}
	SignalUnspecified = Signal{valuer.NewString("")}

	signals = map[string]Signal{
		"traces":  SignalTraces,
		"logs":    SignalLogs,
		"metrics": SignalMetrics,
	}
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

// SignalFromText resolves a signal word to its Signal. ok is false for an
// unknown word, so callers can reject it rather than get unspecified.
func SignalFromText(text string) (Signal, bool) {
	s, ok := signals[strings.ToLower(strings.TrimSpace(text))]
	return s, ok
}

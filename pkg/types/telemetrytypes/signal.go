package telemetrytypes

import (
	"github.com/SigNoz/signoz/pkg/types/coretypes"
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

// FieldResource is the authz resource guarding the signal's field configuration.
func (signal Signal) FieldResource() (coretypes.Resource, bool) {
	switch signal {
	case SignalLogs:
		return coretypes.ResourceMetaResourceLogsField, true
	case SignalTraces:
		return coretypes.ResourceMetaResourceTracesField, true
	default:
		return nil, false
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

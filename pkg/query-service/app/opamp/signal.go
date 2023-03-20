package opamp

type Signal string

const (
	Metrics Signal = "metrics"
	Traces  Signal = "traces"
	Logs    Signal = "logs"
)

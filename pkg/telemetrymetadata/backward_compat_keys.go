package telemetrymetadata

import "github.com/SigNoz/signoz/pkg/types/telemetrytypes"

type BackwardCompatibleKeyMap map[string]string

var (
	TracesBackwardCompatKeys = BackwardCompatibleKeyMap{
		"net.peer.name":  "server.address",
		"server.address": "net.peer.name",
		"http.url":       "url.full",
		"url.full":       "http.url",
	}

	// LogsBackwardCompatKeys contains bidirectional mappings for logs
	// Currently empty, can be extended in the future
	LogsBackwardCompatKeys = BackwardCompatibleKeyMap{}

	// MetricsBackwardCompatKeys contains bidirectional mappings for metrics
	// Currently empty, can be extended in the future
	MetricsBackwardCompatKeys = BackwardCompatibleKeyMap{}
)

func GetBackwardCompatKeysForSignal(signal telemetrytypes.Signal) BackwardCompatibleKeyMap {
	switch signal {
	case telemetrytypes.SignalTraces:
		return TracesBackwardCompatKeys
	case telemetrytypes.SignalLogs:
		return LogsBackwardCompatKeys
	case telemetrytypes.SignalMetrics:
		return MetricsBackwardCompatKeys
	default:
		return BackwardCompatibleKeyMap{}
	}
}

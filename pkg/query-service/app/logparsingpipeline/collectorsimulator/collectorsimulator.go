package collectorsimulator

import (
	"go.opentelemetry.io/collector/pdata/plog"
	"go.signoz.io/signoz/pkg/query-service/model"
)

type SignozLog model.GetLogsResponse

type CollectorConfProviderFn func(baseConfYaml []byte) ([]byte, error)

func SimulateLogsProcessing(configProvider CollectorConfProviderFn, logs plog.Logs) (
	plog.Logs, error,
) {
	return logs, nil
}

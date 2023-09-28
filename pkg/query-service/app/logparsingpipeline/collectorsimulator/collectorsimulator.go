package collectorsimulator

import (
	"go.opentelemetry.io/collector/pdata/plog"
	"go.signoz.io/signoz/pkg/query-service/model"
)

type SignozLog model.GetLogsResponse

type CollectorConfGeneratorFn func(baseConfYaml []byte) ([]byte, error)

func SimulateLogsProcessing(configProvider CollectorConfGeneratorFn, logs []plog.Logs) (
	[]plog.Logs, *model.ApiError,
) {
	return logs, nil
}

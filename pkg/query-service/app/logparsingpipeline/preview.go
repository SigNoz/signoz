package logparsingpipeline

import "go.signoz.io/signoz/pkg/query-service/model"

func SimulatePipelinesProcessing(
	pipelines []Pipeline,
	logs []model.SignozLog,
) ([]model.SignozLog, error) {
	return logs, nil
}

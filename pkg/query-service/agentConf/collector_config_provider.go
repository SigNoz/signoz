package agentConf

import (
	"go.signoz.io/signoz/pkg/query-service/app/opamp"
	"go.signoz.io/signoz/pkg/query-service/model"
)

// Implementation for a opamp.CollectorConfigProvider
func NewCollectorConfigProvider() (
	*opamp.CollectorConfigProvider, *model.ApiError,
) {
	return &opamp.CollectorConfigProvider{
		GenerateConfigRecommendation: RecommendCollectorConfig,
		SubscribeToConfigUpdates:     SubscribeToConfigUpdates,
		ReportDeploymentStatus:       HandleConfigDeploymentStatus,
	}, nil
}

func RecommendCollectorConfig(
	baseConfYaml []byte,
) (
	recommendedConfYaml []byte,
	configId string,
	apiErr *model.ApiError,
) {
	panic("TODO(Raj): Implement this")
	//return baseConfYaml, ""
}

func SubscribeToConfigUpdates(callback func()) {
	panic("TODO(Raj): Implement this")
}

func HandleConfigDeploymentStatus(status opamp.DeploymentStatus) {
	panic("TODO(Raj): Implement this")
}

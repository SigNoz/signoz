package agentConf

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"
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
	recommendation := baseConfYaml
	settingVersions := []string{}

	// Find latest/active config versions from the DB
	for featureType, configGenerator := range DefaultRegistry.configGenerators {
		latestConfig, apiErr := GetLatestVersion(context.Background(), featureType)
		if apiErr != nil && apiErr.Type() != model.ErrorNotFound {
			return nil, "", model.WrapApiError(apiErr, "failed to get latest agent config version")
		}
		updated, apiErr := configGenerator(m.Repo.db, recommendation, latestConfig)
		if apiErr != nil {
			return nil, "", model.WrapApiError(apiErr, fmt.Sprintf(
				"failed to generate recommendation for %s", featureType,
			))
		}
		recommendation = updated
		settingVersions = append(settingVersions, fmt.Sprintf(
			"%s:%d", featureType, latestConfig.Version,
		))
	}

	return recommendation, strings.Join(settingVersions, ","), nil
}

func HandleConfigDeploymentStatus(status opamp.DeploymentStatus) {
	panic("TODO(Raj): Implement this")
}

var collectorConfigSubscribers = map[string]func(){}

func SubscribeToConfigUpdates(callback func()) (unsubscribe func()) {
	subscriberId := uuid.NewString()
	collectorConfigSubscribers[subscriberId] = callback

	return func() {
		delete(collectorConfigSubscribers, subscriberId)
	}
}

func NotifyCollectorConfSubscribers() {
	for _, handler := range collectorConfigSubscribers {
		handler()
	}
}

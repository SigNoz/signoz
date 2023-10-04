package logparsingpipeline

import (
	"go.signoz.io/signoz/pkg/query-service/agentConf"
	"go.signoz.io/signoz/pkg/query-service/model"
)

// logparsing pipelines are a specific signal pre-processing feature
// implemented on top of agentConf

const LogPipelinesFeatureType agentConf.PreprocessingFeatureType = "log_pipelines"

func CollectorConfigGenerator(
	baseConfYaml []byte,
	configVersion *agentConf.ConfigVersion,
) (recommendedConfYaml []byte, apiErr *model.ApiError) {
	return baseConfYaml, nil
}

func init() {
	agentConf.RegisterSignalPreprocessingFeature(
		LogPipelinesFeatureType, CollectorConfigGenerator,
	)
}

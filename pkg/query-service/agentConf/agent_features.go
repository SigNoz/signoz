package agentConf

import "go.signoz.io/signoz/pkg/query-service/model"

// Interface for features implemented via agent config.
//
// Eg: ingestion side signal pre-processing features like log processing pipelines
type AgentFeature interface {

	// Recommend config for an agent based on its `currentConfYaml` and
	// `configVersion` for the feature's settings
	RecommendAgentConfig(
		currentConfYaml []byte,

		// The recommendation should be made based on this
		// version of the feature's settings.
		configVersion *ConfigVersion,
	) (
		recommendedConfYaml []byte,
		serializedSettingsUsed string,
		apiErr *model.ApiError,
	)
}

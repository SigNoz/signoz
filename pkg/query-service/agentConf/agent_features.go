package agentConf

import "go.signoz.io/signoz/pkg/query-service/model"

// Interface for features implemented via agent config.
// Eg: ingestion side signal pre-processing features like log processing pipelines etc
type AgentFeature interface {
	// Must be unique across `AgentFeature`s
	AgentFeatureType() AgentFeatureType

	// Recommend config for an agent based on its `currentConfYaml` and
	// `configVersion` for the feature's settings
	RecommendAgentConfig(
		currentConfYaml []byte,
		configVersion *ConfigVersion,
	) (
		recommendedConfYaml []byte,

		// stored as agent_config_versions.last_config in current agentConf model
		// TODO(Raj): maybe refactor agentConf further and clean this up
		serializedSettingsUsed string,

		apiErr *model.ApiError,
	)
}

package agentConf

import (
	"github.com/SigNoz/signoz/pkg/types/opamptypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// Interface for features implemented via agent config.
// Eg: ingestion side signal pre-processing features like log processing pipelines etc
type AgentFeature interface {
	// Must be unique across `AgentFeature`s
	AgentFeatureType() AgentFeatureType

	// Recommend config for an agent based on its `currentConfYaml` and
	// `configVersion` for the feature's settings
	RecommendAgentConfig(
		orgId valuer.UUID,
		currentConfYaml []byte,
		configVersion *opamptypes.AgentConfigVersion,
	) (
		recommendedConfYaml []byte,

		// stored as agent_config_version.config in current agentConf model
		// TODO(Raj): maybe refactor agentConf further and clean this up
		serializedSettingsUsed string,

		err error,
	)
}

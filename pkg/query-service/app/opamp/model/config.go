package model

type AgentConfigProvider interface {
	// Generate recommended config for an agent based on its current `baseConfYaml`
	// and the latest settings for agent config based features.
	RecommendAgentConfig(baseConfYaml []byte) (
		recommendedConfYaml []byte,
		// Opaque id for recommended config, used for reporting deployment status updates
		configId string,
		err error,
	)

	// Report deployment status for config recommendations generated by RecommendAgentConfig
	ReportConfigDeploymentStatus(
		agentId string,
		configId string,
		err error,
	)
}

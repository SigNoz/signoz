package opamp

type CollectorConfigProvider interface {
	// Generate recommended collector config by combining `baseConfYaml`
	// with config derived from latest user facing settings for
	// signal pre-processing features.
	//
	// The OpAMP server will call this method to generate recommended
	// config when an opamp client connects to it or when it needs to deploy
	// latest config after being notified by `OnConfigChanged` handler.
	GenerateRecommendedCollectorConfig(
		baseConfYaml []byte,
	) (recommendedConfYaml []byte, confId string)

	// Subscribe to changes to config provided by this provider.
	//
	// When notified, OpAMP server rolls out the latest config to all connected agents
	SubscribeToConfigChanges(callback func())

	// Called by OpAMP server to report changes in deployment status of
	// config recommended to OpAMP server.
	// Useful for providing user feedback about deployment status of
	// various signal pre-processing features.
	ReportDeploymentStatus(confId string, success bool, message string)
}

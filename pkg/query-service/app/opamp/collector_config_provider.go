package opamp

import (
	"github.com/open-telemetry/opamp-go/protobufs"
	"go.signoz.io/signoz/pkg/query-service/app/opamp/model"
	coreModel "go.signoz.io/signoz/pkg/query-service/model"
	"go.uber.org/zap"
)

// Generate recommended collector config by combining `baseConfYaml`
// with config derived from latest user facing settings.
type RecommendedConfigGeneratorFn func(
	baseConfYaml []byte,
) (
	recommendedConfYaml []byte,
	// opaque id for recommended config. Used for reporting deployment status
	configId string,
	apiErr *coreModel.ApiError,
)

type SubscribeFn func(callback func()) (unsubscribe func())

type DeploymentStatus struct {
	AgentId string

	// Received from RecommendedConfigGeneratorFn
	ConfigId string

	// Does this status represent a success or a failure.
	IsOk bool

	Description string
}

type DeploymentStatusReceiverFn func(agentId string, configId string, status DeploymentStatus)

type CollectorConfigProvider struct {
	// The OpAMP server will call this method to generate recommended
	// config when an opamp client connects to it or when it needs to deploy
	// latest config after being notified of updates to the config.
	GenerateConfigRecommendation RecommendedConfigGeneratorFn

	// Subscribe to changes to config provided by this provider.
	//
	// OpAMP server will subscribe to config updates with RecommendLatestConfigToAllAgents,
	// rolling out the latest config recommendation to all connected agents.
	SubscribeToConfigUpdates SubscribeFn

	// Called by OpAMP server to report changes in deployment status of
	// config recommended to OpAMP server.
	// Useful for providing user feedback about deployment status of
	// various signal pre-processing features.
	ReportDeploymentStatus DeploymentStatusReceiverFn
}

func RecommendLatestConfigToAllAgents(configProvider *CollectorConfigProvider) {
	agents := opAmpServer.agents.GetAllAgents()
	if len(agents) < 0 {
		return
	}

	for _, agent := range agents {
		newConfig, confId, apiErr := configProvider.GenerateConfigRecommendation(
			[]byte(agent.EffectiveConfig),
		)
		if apiErr != nil {
			zap.S().Errorf(
				"Could not generate config recommendation for agent %s: %w",
				agent.ID, apiErr.ToError(),
			)
			return
		}

		agent.SendToAgent(&protobufs.ServerToAgent{
			RemoteConfig: &protobufs.AgentRemoteConfig{
				Config: &protobufs.AgentConfigMap{
					ConfigMap: map[string]*protobufs.AgentConfigFile{
						"collector.yaml": {
							Body:        newConfig,
							ContentType: "application/x-yaml",
						},
					},
				},
				ConfigHash: []byte(confId),
			},
		})

		model.ListenToConfigUpdate(agent.ID, confId, func(
			agentId string, configId string, err error,
		) {
			status := DeploymentStatus{
				AgentId:  agentId,
				ConfigId: configId,
				IsOk:     err == nil,
			}
			if err != nil {
				status.Description = err.Error()
			}
			configProvider.ReportDeploymentStatus(agentId, configId, status)
		})
	}
}

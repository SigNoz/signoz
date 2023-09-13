package opamp

import (
	"context"
	"crypto/sha256"
	"fmt"

	"github.com/open-telemetry/opamp-go/protobufs"
	model "go.signoz.io/signoz/pkg/query-service/app/opamp/model"
	coreModel "go.signoz.io/signoz/pkg/query-service/model"
)

func UpsertLogsParsingProcessor(
	ctx context.Context,
	parsingProcessors map[string]interface{},
	parsingProcessorsNames []string,
	callback func(string, string, error),
) (string, *coreModel.ApiError) {
	confHash := ""
	if opAmpServer == nil {
		return confHash, coreModel.UnavailableError(fmt.Errorf(
			"opamp server is down, unable to push config to agent at this moment",
		))
	}

	agents := opAmpServer.agents.GetAllAgents()
	if len(agents) == 0 {
		return confHash, coreModel.UnavailableError(fmt.Errorf(
			"no agents available at the moment",
		))
	}

	for _, agent := range agents {
		config := agent.EffectiveConfig

		updatedConf, err := model.GenerateEffectiveConfigWithPipelines(
			config, parsingProcessors, parsingProcessorsNames,
		)
		if err != nil {
			return confHash, coreModel.WrapApiError(err, "Failed to combine agent's effective config with log pipelines")
		}

		// zap.S().Infof("sending new config", string(updatedConf))
		hash := sha256.New()
		_, hashErr := hash.Write(updatedConf)
		if hashErr != nil {
			return confHash, coreModel.InternalError(hashErr)
		}
		agent.EffectiveConfig = string(updatedConf)
		upsertErr := agent.Upsert()
		if upsertErr != nil {
			return confHash, coreModel.InternalError(upsertErr)
		}

		agent.SendToAgent(&protobufs.ServerToAgent{
			RemoteConfig: &protobufs.AgentRemoteConfig{
				Config: &protobufs.AgentConfigMap{
					ConfigMap: map[string]*protobufs.AgentConfigFile{
						"otel-collector-config.yaml": {
							Body:        updatedConf,
							ContentType: "application/x-yaml",
						},
					},
				},
				ConfigHash: hash.Sum(nil),
			},
		})

		if confHash == "" {
			confHash = string(hash.Sum(nil))
			model.ListenToConfigUpdate(agent.ID, confHash, callback)
		}
	}

	return confHash, nil
}

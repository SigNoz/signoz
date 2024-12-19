package opamp

import (
	"context"
	"crypto/sha256"
	"fmt"

	"github.com/knadh/koanf/parsers/yaml"
	"github.com/open-telemetry/opamp-go/protobufs"
	"go.opentelemetry.io/collector/confmap"
	model "go.signoz.io/signoz/pkg/query-service/app/opamp/model"
	"go.signoz.io/signoz/pkg/query-service/app/opamp/otelconfig"
	coreModel "go.signoz.io/signoz/pkg/query-service/model"
	"go.uber.org/zap"
)

// inserts or updates ingestion controller processors depending
// on the signal (metrics or traces)
func UpsertControlProcessors(
	ctx context.Context,
	signal string,
	processors map[string]interface{},
	callback model.OnChangeCallback,
) (hash string, fnerr *coreModel.ApiError) {
	// note: only processors enabled through tracesPipelinePlan will be added
	// to pipeline. To enable or disable processors from pipeline, call
	// AddToTracePipeline() or RemoveFromTracesPipeline() prior to calling
	// this method

	zap.L().Debug("initiating ingestion rules deployment config", zap.String("signal", signal), zap.Any("processors", processors))

	if signal != string(Metrics) && signal != string(Traces) {
		zap.L().Error("received invalid signal int UpsertControlProcessors", zap.String("signal", signal))
		fnerr = coreModel.BadRequest(fmt.Errorf(
			"signal not supported in ingestion rules: %s", signal,
		))
		return
	}

	if opAmpServer == nil {
		fnerr = coreModel.UnavailableError(fmt.Errorf(
			"opamp server is down, unable to push config to agent at this moment",
		))
		return
	}

	agents := opAmpServer.agents.GetAllAgents()
	if len(agents) == 0 {
		fnerr = coreModel.UnavailableError(fmt.Errorf("no agents available at the moment"))
		return
	}

	if len(agents) > 1 && signal == string(Traces) {
		zap.L().Debug("found multiple agents. this feature is not supported for traces pipeline (sampling rules)")
		fnerr = coreModel.BadRequest(fmt.Errorf("multiple agents not supported in sampling rules"))
		return
	}

	for _, agent := range agents {

		agenthash, err := addIngestionControlToAgent(agent, signal, processors, false)
		if err != nil {
			zap.L().Error("failed to push ingestion rules config to agent", zap.String("agentID", agent.ID), zap.Error(err))
			continue
		}

		if agenthash != "" {
			// subscribe callback
			model.ListenToConfigUpdate(agent.ID, agenthash, callback)
		}

		hash = agenthash
	}

	return hash, nil
}

// addIngestionControlToAgent adds ingestion contorl rules to agent config
func addIngestionControlToAgent(agent *model.Agent, signal string, processors map[string]interface{}, withLB bool) (string, error) {
	confHash := ""
	config := agent.EffectiveConfig
	c, err := yaml.Parser().Unmarshal([]byte(config))
	if err != nil {
		return confHash, err
	}

	agentConf := confmap.NewFromStringMap(c)

	// add ingestion control spec
	err = makeIngestionControlSpec(agentConf, Signal(signal), processors)
	if err != nil {
		zap.L().Error("failed to prepare ingestion control processors for agent", zap.String("agentID", agent.ID), zap.Error(err))
		return confHash, err
	}

	// ------ complete adding processor
	configR, err := yaml.Parser().Marshal(agentConf.ToStringMap())
	if err != nil {
		return confHash, err
	}

	zap.L().Debug("sending new config", zap.String("config", string(configR)))
	hash := sha256.New()
	_, err = hash.Write(configR)
	if err != nil {
		return confHash, err
	}
	confHash = string(hash.Sum(nil))
	agent.EffectiveConfig = string(configR)
	err = agent.Upsert()
	if err != nil {
		return confHash, err
	}

	agent.SendToAgent(&protobufs.ServerToAgent{
		RemoteConfig: &protobufs.AgentRemoteConfig{
			Config: &protobufs.AgentConfigMap{
				ConfigMap: map[string]*protobufs.AgentConfigFile{
					"collector.yaml": {
						Body:        configR,
						ContentType: "application/x-yaml",
					},
				},
			},
			ConfigHash: []byte(confHash),
		},
	})

	return string(confHash), nil
}

// prepare spec to introduce ingestion control in agent conf
func makeIngestionControlSpec(agentConf *confmap.Conf, signal Signal, processors map[string]interface{}) error {
	configParser := otelconfig.NewConfigParser(agentConf)
	configParser.UpdateProcessors(processors)

	// edit pipeline if processor is missing
	currentPipeline := configParser.PipelineProcessors(string(signal))

	// merge tracesPipelinePlan with current pipeline
	mergedPipeline, err := buildPipeline(signal, currentPipeline)
	if err != nil {
		zap.L().Error("failed to build pipeline", zap.String("signal", string(signal)), zap.Error(err))
		return err
	}

	// add merged pipeline to the service
	configParser.UpdateProcsInPipeline(string(signal), mergedPipeline)

	return nil
}

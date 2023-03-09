package opamp

import (
	"context"
	"crypto/sha256"
	"fmt"

	"github.com/knadh/koanf/parsers/yaml"
	"github.com/open-telemetry/opamp-go/protobufs"
	"go.opentelemetry.io/collector/confmap"
	model "go.signoz.io/signoz/pkg/query-service/app/opamp/model"
	"go.uber.org/zap"
)

// inserts or updates ingestion controller processors depending
// on the signal (metrics or traces)
func UpsertControlProcessors(ctx context.Context, signal string, processors map[string]interface{}, callback model.OnChangeCallback) (hash string, fnerr error) {
	// note: only processors enabled through tracesPipelinePlan will be added
	// to pipeline. To enable or disable processors from pipeline, call
	// AddToTracePipeline() or RemoveFromTracesPipeline() prior to calling
	// this method
	zap.S().Debugf("initiating deployment config", signal, processors)

	if signal != string(Metrics) && signal != string(Traces) {
		zap.S().Errorf("received invalid signal int UpsertControllProcessors", signal)
		fnerr = fmt.Errorf("invalid kind of target to deploy processor")
		return
	}

	if opAmpServer == nil {
		fnerr = fmt.Errorf("opamp server is down, unable to push config to agent at this moment")
		return
	}

	agents := opAmpServer.agents.GetAllAgents()
	if len(agents) == 0 {
		fnerr = fmt.Errorf("no agents available at the moment")
		return
	}

	// flag to indicate if LB needs to be setup
	withLB := false
	if len(agents) > 1 {
		withLB = true
	}

	for _, agent := range agents {

		agenthash, err := addIngestionControlToAgent(agent, signal, processors, withLB)
		if err != nil {
			zap.S().Errorf("failed to push ingestion rules config to agent", agent.ID, err)
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

func checkPipelineExists(agentConf *confmap.Conf, name string) bool {
	service := agentConf.Get("service")

	pipeline := service.(map[string]interface{})["pipelines"].(map[string]interface{})
	if _, ok := pipeline[name]; !ok {
		return false
	}
	return true
}

func checkExporterExists(agentConf *confmap.Conf, signal string, name string) bool {
	service := agentConf.Get("service")
	signalSpec := service.(map[string]interface{})["pipelines"].(map[string]interface{})[signal]
	exporters := signalSpec.(map[string]interface{})["exporters"].([]interface{})
	var found bool
	for _, e := range exporters {
		if e == name {
			found = true
		}
	}

	return found
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

	// check if LB needs to be configured
	if signal == string(Traces) && withLB {

		// check if lb pipeline is setup for lb agents, here we assume
		// that otlp_internal will exist implicitly if traces/lb pipeline exists
		if agent.CanLB && !checkPipelineExists(agentConf, TracesLbPipelineName) {
			zap.S().Debugf("LB not configured for agent. Preparing the lb exporter spec", agent.ID)
			serviceConf, err := prepareLbAgentSpec(agentConf)
			if err != nil {
				zap.S().Errorf("failed to prepare lb exporter spec for agent", agent.ID, err)
				return confHash, err
			}
			if err := agentConf.Merge(serviceConf); err != nil {
				zap.S().Errorf("failed to merge lb exporter spec for agent", agent.ID, err)
				return confHash, err
			}
		}

		// check if otlp_internal is setup for non-lb agents
		if !agent.CanLB && !checkExporterExists(agentConf, string(Traces), OtlpInternalReceiver) {
			zap.S().Debugf("OTLP internal not configured for agent. Preparing the lb exporter spec", agent.ID)
			serviceConf, err := prepareNonLbAgentSpec(agentConf)
			if err != nil {
				zap.S().Errorf("failed to prepare OTLP internal receiver spec for agent", agent.ID, err)
				return confHash, err
			}
			if err := agentConf.Merge(serviceConf); err != nil {
				zap.S().Errorf("failed to merge OTLP internal receiver spec for agent", agent.ID, err)
				return confHash, err
			}
		}
	}

	// add ingestion control
	serviceConf, err := prepareControlProcesorsSpec(agentConf, Signal(signal), processors)
	if err != nil {
		zap.S().Errorf("failed to prepare ingestion control processors for agent ", agent.ID, err)
		return confHash, err
	}

	err = agentConf.Merge(serviceConf)
	if err != nil {
		return confHash, err
	}

	// ------ complete adding processor
	configR, err := yaml.Parser().Marshal(agentConf.ToStringMap())
	if err != nil {
		return confHash, err
	}

	zap.S().Debugf("sending new config", string(configR))
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
func prepareControlProcesorsSpec(agentConf *confmap.Conf, signal Signal, processors map[string]interface{}) (*confmap.Conf, error) {
	agentProcessors := agentConf.Get("processors").(map[string]interface{})

	for key, params := range processors {
		agentProcessors[key] = params
	}

	updatedProcessors := map[string]interface{}{
		"processors": agentProcessors,
	}

	updatedProcessorConf := confmap.NewFromStringMap(updatedProcessors)

	// upsert changed processor parameters in config
	err := agentConf.Merge(updatedProcessorConf)
	if err != nil {
		return agentConf, err
	}

	// edit pipeline if processor is missing
	service := agentConf.Get("service")

	signalSpec := service.(map[string]interface{})["pipelines"].(map[string]interface{})[string(signal)]
	currentPipeline := signalSpec.(map[string]interface{})["processors"].([]interface{})

	// merge tracesPipelinePlan with current pipeline
	mergedPipeline, err := buildPipeline(signal, currentPipeline)
	if err != nil {
		zap.S().Errorf("failed to build pipeline", signal, err)
		return agentConf, err
	}

	// add merged pipeline to the service
	// todo(): check if this overwrites other processors
	serviceConf := map[string]interface{}{
		"service": map[string]interface{}{
			"pipelines": map[string]interface{}{
				string(signal): map[string]interface{}{
					"processors": mergedPipeline,
				},
			},
		},
	}

	return confmap.NewFromStringMap(serviceConf), nil
}

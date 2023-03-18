package opamp

import (
	"context"
	"fmt"

	"go.opentelemetry.io/collector/confmap"
	model "go.signoz.io/signoz/pkg/query-service/app/opamp/model"
	"go.signoz.io/signoz/pkg/query-service/app/opamp/otelconfig"
	"go.uber.org/zap"
)

// inserts or updates ingestion controller processors depending
// on the signal (metrics or traces)
func UpsertControlProcessors(ctx context.Context, signal string, processors map[string]interface{}, callback model.OnChangeCallback) (hash string, fnerr error) {
	// note: only processors enabled through tracesPipelinePlan will be added
	// to pipeline. To enable or disable processors from pipeline, call
	// AddToTracePipeline() or RemoveFromTracesPipeline() prior to calling
	// this method

	zap.S().Debug("initiating ingestion rules deployment config", signal, processors)

	if signal != string(Metrics) && signal != string(Traces) {
		zap.S().Error("received invalid signal int UpsertControlProcessors", signal)
		fnerr = fmt.Errorf("signal not supported in ingestion rules: %s", signal)
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

	withLB := false
	if len(agents) > 1 && signal == string(Traces) {
		// enable LB exporter config
		withLB = true
	}

	for _, agent := range agents {

		agenthash, err := addIngestionControlToAgent(agent, signal, processors, withLB)
		if err != nil {
			zap.S().Error("failed to push ingestion rules config to agent", agent.ID, err)
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
func addIngestionControlToAgent(agent *model.Agent, signal string, processors map[string]interface{}, withLB bool) (confhash string, err error) {
	agentConf, err := agent.GetEffectiveConfMap()
	if err != nil {
		return confhash, err
	}

	if withLB {
		// add LB exporter pipeline and OTLP worker pipeline
		makeLbExporterSpec(agentConf)
	}

	// add ingestion control spec.
	err = makeIngestionControlSpec(agentConf, Signal(signal), processors)
	if err != nil {
		zap.S().Error("failed to prepare ingestion control processors for agent ", agent.ID, err)
		return confhash, err
	}

	return agent.SendConfMap(agentConf)
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
		zap.S().Error("failed to build pipeline", signal, err)
		return err
	}

	// add merged pipeline to the service
	configParser.UpdateProcsInPipeline(string(signal), mergedPipeline)

	return nil
}

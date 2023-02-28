package opamp

import (
	"context"
	"crypto/sha256"
	"fmt"

	"strings"

	"github.com/knadh/koanf/parsers/yaml"
	"github.com/open-telemetry/opamp-go/protobufs"
	"github.com/open-telemetry/opamp-go/server"
	"github.com/open-telemetry/opamp-go/server/types"
	"go.opentelemetry.io/collector/confmap"
	model "go.signoz.io/signoz/pkg/query-service/app/opamp/model"
	"go.uber.org/zap"
)

var opAmpServer *Server

type Server struct {
	server       server.OpAMPServer
	agents       *model.Agents
	logger       *zap.Logger
	capabilities int32
}

const capabilities = protobufs.ServerCapabilities_ServerCapabilities_AcceptsEffectiveConfig |
	protobufs.ServerCapabilities_ServerCapabilities_OffersRemoteConfig |
	protobufs.ServerCapabilities_ServerCapabilities_AcceptsStatus

func InitalizeServer(listener string, agents *model.Agents) error {

	if agents == nil {
		agents = &model.AllAgents
	}

	opAmpServer = &Server{
		agents: agents,
	}
	opAmpServer.server = server.New(zap.S())

	return opAmpServer.Start(listener)
}

func (srv *Server) Start(listener string) error {
	settings := server.StartSettings{
		Settings: server.Settings{
			Callbacks: server.CallbacksStruct{
				OnMessageFunc:         srv.onMessage,
				OnConnectionCloseFunc: srv.onDisconnect,
			},
		},
		ListenEndpoint: listener,
	}

	return srv.server.Start(settings)
}

func (srv *Server) Stop() {
	srv.server.Stop(context.Background())
}

func (srv *Server) onDisconnect(conn types.Connection) {
	srv.agents.RemoveConnection(conn)
}

func (srv *Server) onMessage(conn types.Connection, msg *protobufs.AgentToServer) *protobufs.ServerToAgent {
	agentID := msg.InstanceUid

	agent, err := srv.agents.FindOrCreateAgent(agentID, conn)
	if err != nil {
		zap.S().Errorf("Failed to find or create agent %q: %v", agentID, err)
		// TODO: handle error
	}
	zap.S().Debugf("received a message from agent:", zap.String("ID", agent.ID), zap.Any("status", agent.CurrentStatus))
	var response *protobufs.ServerToAgent
	response = &protobufs.ServerToAgent{
		InstanceUid:  agentID,
		Capabilities: uint64(capabilities),
	}

	agent.UpdateStatus(msg, response)

	return response
}

// global var methods to support singleton pattern. we want to discourage
// allow multiple servers in one installation
func Ready() bool {
	if opAmpServer == nil {
		return false
	}
	if opAmpServer.agents.Count() == 0 {
		zap.S().Warnf("no agents available, all agent config requests will be rejected")
		return false
	}
	return true
}
func Subscribe(hash string, f func(hash string, err error)) {
	model.ListenToConfigUpdate(hash, f)
}

// inserts or updates ingestion controller processors depending
// on the signal (metrics or traces)
func UpsertControlProcessors(ctx context.Context, signal string, processors map[string]interface{}, callback func(string, error)) (hash string, fnerr error) {
	// note: only processors enabled through tracesPipelinePlan will be added
	// to pipeline. To enable or disable processors from pipeline, call
	// AddToTracePipeline() or RemoveFromTracesPipeline() prior to calling
	// this method
	zap.S().Debugf("initiating deployment config", signal, processors)
	confHash := ""

	if signal != "metrics" && signal != "traces" {
		return confHash, fmt.Errorf("invalid kind of target to deploy processor")
	}

	if opAmpServer == nil {
		return confHash, fmt.Errorf("opamp server is down, unable to push config to agent at this moment")
	}

	agents := opAmpServer.agents.GetAllAgents()
	if len(agents) == 0 {
		return confHash, fmt.Errorf("no agents available at the moment")
	}

	for _, agent := range agents {
		config := agent.EffectiveConfig
		c, err := yaml.Parser().Unmarshal([]byte(config))
		if err != nil {
			return confHash, err
		}

		agentConfig := confmap.NewFromStringMap(c)
		agentProcessors := agentConfig.Get("processors").(map[string]interface{})

		for key, params := range processors {
			agentProcessors[key] = params
		}

		updatedProcessors := map[string]interface{}{
			"processors": agentProcessors,
		}

		updatedProcessorConf := confmap.NewFromStringMap(updatedProcessors)

		// upsert changed processor parameters in config
		err = agentConfig.Merge(updatedProcessorConf)
		if err != nil {
			return confHash, err
		}

		// edit pipeline if processor is missing
		service := agentConfig.Get("service")

		targetSpec := service.(map[string]interface{})["pipelines"].(map[string]interface{})[signal]
		currentPipeline := targetSpec.(map[string]interface{})["processors"].([]interface{})

		// merge tracesPipelinePlan with current pipeline
		mergedPipeline, err := buildPipeline(signal, currentPipeline)
		if err != nil {
			zap.S().Errorf("failed to build pipeline", signal, err)
			// improvement: should we continue for other agents?
			return confHash, err
		}

		// add merged pipeline to the service

		s := map[string]interface{}{
			"service": map[string]interface{}{
				"pipelines": map[string]interface{}{
					signal: map[string]interface{}{
						"processors": mergedPipeline,
					},
				},
			},
		}

		serviceC := confmap.NewFromStringMap(s)

		err = agentConfig.Merge(serviceC)
		if err != nil {
			return confHash, err
		}

		// ------ complete adding processor
		configR, err := yaml.Parser().Marshal(agentConfig.ToStringMap())
		if err != nil {
			return confHash, err
		}

		zap.S().Debugf("sending new config", string(configR))
		hash := sha256.New()
		_, err = hash.Write(configR)
		if err != nil {
			return confHash, err
		}
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
				ConfigHash: hash.Sum(nil),
			},
		})

		if confHash != "" {
			// here we return the first agent hash as we don't have multi-agent support
			// in downstream yet
			confHash = string(hash.Sum(nil))
		}
	}
	if confHash != "" {
		// subscribe callback
		model.ListenToConfigUpdate(confHash, callback)
	}
	return confHash, nil
}

func UpsertProcessor(ctx context.Context, processors map[string]interface{}, names []interface{}) error {
	x := map[string]interface{}{
		"processors": processors,
	}

	newConf := confmap.NewFromStringMap(x)

	agents := opAmpServer.agents.GetAllAgents()
	for _, agent := range agents {
		config := agent.EffectiveConfig
		c, err := yaml.Parser().Unmarshal([]byte(config))
		if err != nil {
			return err
		}
		agentConf := confmap.NewFromStringMap(c)

		err = agentConf.Merge(newConf)
		if err != nil {
			return err
		}

		service := agentConf.Get("service")

		logs := service.(map[string]interface{})["pipelines"].(map[string]interface{})["logs"]
		processors := logs.(map[string]interface{})["processors"].([]interface{})
		userProcessors := []interface{}{}
		// remove old ones
		for _, v := range processors {
			if !strings.HasPrefix(v.(string), "logstransform/pipeline_") {
				userProcessors = append(userProcessors, v)
			}
		}
		// all user processors are pushed after pipelines
		processors = append(names, userProcessors...)

		service.(map[string]interface{})["pipelines"].(map[string]interface{})["logs"].(map[string]interface{})["processors"] = processors

		s := map[string]interface{}{
			"service": map[string]interface{}{
				"pipelines": map[string]interface{}{
					"logs": map[string]interface{}{
						"processors": processors,
					},
				},
			},
		}

		serviceC := confmap.NewFromStringMap(s)

		err = agentConf.Merge(serviceC)
		if err != nil {
			return err
		}

		// ------ complete adding processor
		configR, err := yaml.Parser().Marshal(agentConf.ToStringMap())
		if err != nil {
			return err
		}

		zap.S().Infof("sending new config", string(configR))
		hash := sha256.New()
		_, err = hash.Write(configR)
		if err != nil {
			return err
		}
		agent.EffectiveConfig = string(configR)
		err = agent.Upsert()
		if err != nil {
			return err
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
				ConfigHash: hash.Sum(nil),
			},
		})
	}

	return nil
}

func EnableLbForAgents() error {
	// acquire lock on config updater
	agents := opAmpServer.agents.GetAllAgents()
	var lbAgents []*model.Agent
	var nonLbreceivers []*model.Agent

	for _, agent := range agents {
		if agent.CanLB {
			lbAgents = append(lbAgents, agent)
		} else {
			nonLbreceivers = append(nonLbreceivers, agent)
		}
	}

	if len(lbAgents) == 0 {
		return fmt.Errorf("at least one agent with LB exporter support required")
	}

	process := func(dryRun bool) error {
		// todo: build a worker gorup and call agent updates in parallel
		for _, agent := range lbAgents {
			EnableLbExporter(agent, dryRun)
		}

		for _, agent := range nonLbreceivers {
			EnableLbReceivers(agent, dryRun)
		}
		return nil
	}
	if err := process(true); err != nil {
		return err
	}

	process(false)

	// if any of theagents fail, do not apply the config
	return nil
}

// EnableLbReceivers will create internal receivers to
// disable direct traces traffic from outside world.
// only applicable when atleast one lb exporters is enabled
func EnableLbReceivers(agent *model.Agent, dryRun bool) error {
	// fetch agent config

	// add otlp internal receiver to receive traces from lb exporter
	// at 0.0.0.0:4949

	// remove [jaegar, otlp] from pipelines >> traces
	// pipelines
	//	traces:
	//		receivers: [otlp_internal]
	//		....

	// in above update, the non-lb collectors will start
	// listening on internal port to avoid receiving
	// traces traffic directly

}

// EnableLbExporter enables lb exporter in agents which support
// the lb config (canLB == true)
func EnableLbExporter(agent *model.Agent, dryRun bool) error {

	if !agent.CanLB {
		return nil
	}

	// fetch effective config from the agent

	// add a new otlp receiver otlp_internal at 0.0.0.0:4949
	// this receiver will enable collecting traces re-routed by lb exporter

	// add a new pipeline
	//  traces/lb:
	// 		receivers: [otlp, jaeger]
	// 		processors: []
	// 		exporters: [lbExporter]

	// update receiver in service > pipelines > traces
	// traces:
	//		receivers: [otlp_internal]
	//		processors: [signoz_tail_sampling, batch]
	//		exporters: [clickhousetraceexporter]

	// apply updated config

	// perform above in dry-run mode and then final mode
	// if all agents succeed exit success else fail

	return nil
}

// DisableLbExporter in a given agent
func DisableLbExporter(agent *model.Agent, dryRun bool) error {
	// reverse the steps from EnableLbExporter
	// remove otlp_internal from pipelines >> traces
	// move receivers from pipelines>>traces/lb to pipelines >> traces
	// remove pipeline traces/lb
	return nil
}

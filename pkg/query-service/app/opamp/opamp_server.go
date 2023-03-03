package opamp

import (
	"context"
	"crypto/sha256"
	"fmt"

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

func UpsertParsingProcessor(ctx context.Context, parsingProcessors map[string]interface{}, parsingProcessorsNames []interface{}, callback func(string, error)) (string, error) {
	confHash := ""
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

		BuildLogParsingProcessors(c, parsingProcessors)

		// buildLogsPipeline()
		logs := c["service"].(map[string]interface{})["pipelines"].(map[string]interface{})["logs"]
		processors := logs.(map[string]interface{})["processors"].([]interface{})
		updatedProcessorList, _ := buildLogsPipeline(processors, parsingProcessorsNames)
		processors = updatedProcessorList
		c["service"].(map[string]interface{})["pipelines"].(map[string]interface{})["logs"].(map[string]interface{})["processors"] = processors

		updatedConf, err := yaml.Parser().Marshal(c)
		if err != nil {
			return confHash, err
		}

		fmt.Println(string(updatedConf))

		zap.S().Infof("sending new config", string(updatedConf))
		hash := sha256.New()
		_, err = hash.Write(updatedConf)
		if err != nil {
			return confHash, err
		}
		agent.EffectiveConfig = string(updatedConf)
		err = agent.Upsert()
		if err != nil {
			return confHash, err
		}

		agent.SendToAgent(&protobufs.ServerToAgent{
			RemoteConfig: &protobufs.AgentRemoteConfig{
				Config: &protobufs.AgentConfigMap{
					ConfigMap: map[string]*protobufs.AgentConfigFile{
						"collector.yaml": {
							Body:        updatedConf,
							ContentType: "application/x-yaml",
						},
					},
				},
				ConfigHash: hash.Sum(nil),
			},
		})

		if confHash == "" {
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

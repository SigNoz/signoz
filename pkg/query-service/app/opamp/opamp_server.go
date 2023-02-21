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

func InitalizeServer(agents *model.Agents) error {
	opAmpServer = &Server{
		agents: agents,
	}
	opAmpServer.server = server.New(zap.S())
	return opAmpServer.Start()
}

func (srv *Server) Start() error {
	settings := server.StartSettings{
		Settings: server.Settings{
			Callbacks: server.CallbacksStruct{
				OnMessageFunc:         srv.onMessage,
				OnConnectionCloseFunc: srv.onDisconnect,
			},
		},
		ListenEndpoint: "127.0.0.1:4320",
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

func Subscribe(hash string, f func(hash string, err error)) {
	model.ListenToConfigUpdate(hash, f)
}

func UpsertTraceProcessors(ctx context.Context, processors []interface{}, callback func(string, error)) (hash string, fnerr error) {
	// note: only processors enabled through tracesPipelinePlan will be added
	// to pipeline. To enable or disable processors from pipeline, call
	// AddToTracePipeline() or RemoveFromTracesPipeline() prior to calling
	// this method

	fmt.Println("processors:", processors)
	fmt.Println("trace pipeline:", tracesPipelinePlan)

	confHash := ""
	x := map[string]interface{}{
		"processors": processors,
	}

	updatedProcessors := confmap.NewFromStringMap(x)

	agents := opAmpServer.agents.GetAllAgents()
	for _, agent := range agents {
		config := agent.EffectiveConfig
		c, err := yaml.Parser().Unmarshal([]byte(config))
		if err != nil {
			return confHash, err
		}

		agentConf := confmap.NewFromStringMap(c)

		// upsert changed processor parameters in config
		err = agentConf.Merge(updatedProcessors)
		if err != nil {
			return confHash, err
		}

		// edit pipeline if processor is missing
		service := agentConf.Get("service")

		traces := service.(map[string]interface{})["pipelines"].(map[string]interface{})["traces"]
		currentPipeline := traces.(map[string]interface{})["processors"].([]interface{})

		// merge tracesPipelinePlan with current pipeline
		mergedPipeline, err := buildTracesPipeline(currentPipeline)
		if err != nil {
			zap.S().Errorf("failed to build traces pipeline", err)
			// improvement: should we continue for other agents?
			return confHash, err
		}

		// add merged pipeline to the service
		s := map[string]interface{}{
			"service": map[string]interface{}{
				"pipelines": map[string]interface{}{
					"traces": map[string]interface{}{
						"processors": mergedPipeline,
					},
				},
			},
		}

		serviceC := confmap.NewFromStringMap(s)

		err = agentConf.Merge(serviceC)
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

		fmt.Println("sending new config", string(configR))
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

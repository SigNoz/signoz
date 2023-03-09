package opamp

import (
	"context"
	"crypto/sha256"

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

func StopServer() {
	if opAmpServer != nil {
		opAmpServer.Stop()
	}
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

	agent, created, err := srv.agents.FindOrCreateAgent(agentID, conn)
	if err != nil {
		zap.S().Error("Failed to find or create agent %q: %v", agentID, err)
		// TODO: handle error
	}

	if created {
		agent.CanLB = model.ExtractLbFlag(msg.AgentDescription)
		zap.S().Debugf("New agent added:", zap.Bool("canLb", agent.CanLB), zap.String("ID", agent.ID), zap.Any("status", agent.CurrentStatus))
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

func Subscribe(agentId string, hash string, f model.OnChangeCallback) {
	model.ListenToConfigUpdate(agentId, hash, f)
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

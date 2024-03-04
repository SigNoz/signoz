package opamp

import (
	"context"
	"fmt"
	"math/rand"
	"os"
	"runtime"
	"sync"
	"time"

	"github.com/SigNoz/signoz-otel-collector/constants"
	"github.com/SigNoz/signoz-otel-collector/signozcol"
	"github.com/oklog/ulid"
	"github.com/open-telemetry/opamp-go/client"
	"github.com/open-telemetry/opamp-go/client/types"
	"github.com/open-telemetry/opamp-go/protobufs"
	"go.uber.org/multierr"
	"go.uber.org/zap"
)

// serverClient is the implementation of the Opamp client
// that connects to the Opamp server and manages the agent configuration
// and the collector lifecycle.
// It implements the client.OpAMPClient interface.
// It is responsible for:
// 1. Connecting to the Opamp server
// 2. Sending the current agent configuration to the Opamp server
// 3. Receiving the remote configuration from the Opamp server
// 4. Applying the remote configuration to the agent
// 5. Sending the updated agent configuration to the Opamp server
type serverClient struct {
	baseClient
	logger                *zap.Logger
	opampClient           client.OpAMPClient
	configManager         *agentConfigManager
	managerConfig         AgentManagerConfig
	instanceId            ulid.ULID
	receivedInitialConfig bool
	mux                   sync.Mutex
}

type NewServerClientOpts struct {
	Logger           *zap.Logger
	Config           *AgentManagerConfig
	WrappedCollector *signozcol.WrappedCollector

	CollectorConfgPath string
}

// NewServerClient creates a new OpAmp client
func NewServerClient(args *NewServerClientOpts) (Client, error) {
	clientLogger := args.Logger.With(zap.String("component", "opamp-server-client"))

	configManager := NewAgentConfigManager(args.Logger)

	svrClient := &serverClient{
		baseClient: baseClient{
			coll:    args.WrappedCollector,
			err:     make(chan error, 1),
			stopped: make(chan bool),
			logger:  clientLogger,
		},
		logger:        clientLogger,
		configManager: configManager,
		managerConfig: *args.Config,
		mux:           sync.Mutex{},
	}
	svrClient.createInstanceId()

	dynamicConfig, err := NewDynamicConfig(args.CollectorConfgPath, svrClient.reload, clientLogger)
	if err != nil {
		return nil, fmt.Errorf("failed to create collector config: %v", err)
	}
	svrClient.configManager.Set(dynamicConfig)

	svrClient.opampClient = client.NewWebSocket(clientLogger.Sugar())

	return svrClient, nil
}

func keyVal(key, val string) *protobufs.KeyValue {
	return &protobufs.KeyValue{
		Key: key,
		Value: &protobufs.AnyValue{
			Value: &protobufs.AnyValue_StringValue{StringValue: val},
		},
	}
}

func (s *serverClient) createInstanceId() {
	entropy := ulid.Monotonic(rand.New(rand.NewSource(0)), 0)
	s.instanceId = ulid.MustNew(ulid.Timestamp(time.Now()), entropy)
}

func (s *serverClient) createAgentDescription() *protobufs.AgentDescription {
	hostname, _ := os.Hostname()

	// Create Agent description.
	return &protobufs.AgentDescription{
		IdentifyingAttributes: []*protobufs.KeyValue{
			keyVal("service.name", "signoz-otel-collector"),
			keyVal("service.version", constants.Version),
		},
		NonIdentifyingAttributes: []*protobufs.KeyValue{
			keyVal("os.family", runtime.GOOS),
			keyVal("host.name", hostname),
			keyVal("capabilities.lbexporter", constants.SupportLbExporterConfig),
		},
	}
}

// Start starts the Opamp client
// It connects to the Opamp server and starts the Opamp client
func (s *serverClient) Start(ctx context.Context) error {
	if err := s.opampClient.SetAgentDescription(s.createAgentDescription()); err != nil {
		s.logger.Error("error while setting agent description", zap.Error(err))

		return err
	}

	settings := types.StartSettings{
		OpAMPServerURL: s.managerConfig.ServerEndpoint,
		InstanceUid:    s.instanceId.String(),
		Callbacks: types.CallbacksStruct{
			OnConnectFunc: func() {
				s.logger.Info("Connected to the server.")
			},
			OnConnectFailedFunc: func(err error) {
				s.logger.Error("Failed to connect to the server: %v", zap.Error(err))
			},
			OnErrorFunc: func(err *protobufs.ServerErrorResponse) {
				s.logger.Error("Server returned an error response: %v", zap.String("", err.ErrorMessage))
			},
			GetEffectiveConfigFunc: func(ctx context.Context) (*protobufs.EffectiveConfig, error) {
				cfg, err := s.configManager.CreateEffectiveConfigMsg()
				if err != nil {
					return nil, err
				}
				return cfg, nil
			},
			OnMessageFunc: s.onMessageFuncHandler,
		},
		Capabilities: protobufs.AgentCapabilities_AgentCapabilities_ReportsStatus |
			protobufs.AgentCapabilities_AgentCapabilities_AcceptsRemoteConfig |
			protobufs.AgentCapabilities_AgentCapabilities_ReportsRemoteConfig |
			protobufs.AgentCapabilities_AgentCapabilities_ReportsEffectiveConfig |
			protobufs.AgentCapabilities_AgentCapabilities_ReportsHealth,
	}

	err := s.opampClient.SetHealth(&protobufs.AgentHealth{Healthy: false})
	if err != nil {
		return err
	}

	err = s.opampClient.Start(ctx, settings)
	if err != nil {
		s.logger.Error("Error while starting opamp client", zap.Error(err))
		return err
	}
	// Wait for the initial remote config to be received
	// before starting the collector.
	s.waitForInitialRemoteConfig()
	// Watch for any async errors from the collector and initiate a shutdown
	go s.ensureRunning()
	return nil
}

func (s *serverClient) waitForInitialRemoteConfig() {
	for {
		s.logger.Info("Waiting for initial remote config")
		time.Sleep(1 * time.Second)
		s.mux.Lock()
		if s.receivedInitialConfig {
			s.mux.Unlock()
			break
		}
		s.mux.Unlock()
	}
}

// Stop stops the Opamp client
// It stops the Opamp client and disconnects from the Opamp server
func (s *serverClient) Stop(ctx context.Context) error {
	s.logger.Info("Stopping OpAMP server client")
	close(s.stopped)
	s.coll.Shutdown()
	opampErr := s.opampClient.Stop(ctx)
	collErr := <-s.coll.ErrorChan()
	return multierr.Combine(opampErr, collErr)
}

// onMessageFuncHandler is the callback function that is called when the Opamp client receives a message from the Opamp server
func (s *serverClient) onMessageFuncHandler(ctx context.Context, msg *types.MessageData) {
	if msg.RemoteConfig != nil {
		s.mux.Lock()
		s.receivedInitialConfig = true
		s.mux.Unlock()
		if err := s.onRemoteConfigHandler(ctx, msg.RemoteConfig); err != nil {
			s.logger.Error("error while onRemoteConfigHandler", zap.Error(err))
		}
	}
	// TODO: Handle other message types.
}

// onRemoteConfigHandler is the callback function that is called when the Opamp client receives a remote configuration from the Opamp server
func (s *serverClient) onRemoteConfigHandler(ctx context.Context, remoteConfig *protobufs.AgentRemoteConfig) error {

	changed, err := s.configManager.Apply(remoteConfig)
	remoteCfgStatus := &protobufs.RemoteConfigStatus{
		LastRemoteConfigHash: remoteConfig.GetConfigHash(),
		Status:               protobufs.RemoteConfigStatuses_RemoteConfigStatuses_APPLIED,
	}

	if err != nil {
		s.logger.Error("failed to apply config", zap.Error(err))

		remoteCfgStatus.Status = protobufs.RemoteConfigStatuses_RemoteConfigStatuses_FAILED
		remoteCfgStatus.ErrorMessage = fmt.Sprintf("failed to apply config changes: %s", err.Error())
	}

	if err := s.opampClient.SetRemoteConfigStatus(remoteCfgStatus); err != nil {
		return fmt.Errorf("failed to set remote config status: %w", err)
	}

	if changed {
		if err := s.opampClient.UpdateEffectiveConfig(ctx); err != nil {
			return fmt.Errorf("failed to update effective config: %w", err)
		}
	}
	return nil
}

// reload is the callback function that is called when the agent configuration file changes
func (s *serverClient) reload(contents []byte) error {
	s.reloadMux.Lock()
	s.isReloading = true
	defer func() {
		s.isReloading = false
		s.reloadMux.Unlock()
	}()

	collectorConfigPath := s.configManager.agentConfig.path
	rollbackPath := fmt.Sprintf("%s.rollback", collectorConfigPath)

	err := copy(collectorConfigPath, rollbackPath)
	if err != nil {
		return fmt.Errorf("failed to create backup of collector config: %w", err)
	}

	// Create rollback func
	rollbackFunc := func() error {
		return copy(rollbackPath, collectorConfigPath)
	}

	if err := os.WriteFile(collectorConfigPath, contents, 0600); err != nil {
		return fmt.Errorf("failed to update config file %s: %w", collectorConfigPath, err)
	}

	if err := s.coll.Restart(context.Background()); err != nil {

		if rollbackErr := rollbackFunc(); rollbackErr != nil {
			s.logger.Error("Failed to rollbakc the config", zap.Error(rollbackErr))
		}

		// Restart collector with original file
		if rollbackErr := s.coll.Restart(context.Background()); rollbackErr != nil {
			s.logger.Error("Collector failed for restart during rollback", zap.Error(rollbackErr))
		}

		return fmt.Errorf("collector failed to restart: %w", err)
	}

	return nil
}

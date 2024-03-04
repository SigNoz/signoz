package opamp

import (
	"bytes"
	"fmt"
	"os"

	"github.com/google/uuid"
	"github.com/knadh/koanf"
	"github.com/knadh/koanf/parsers/yaml"
	"github.com/knadh/koanf/providers/file"
	"github.com/knadh/koanf/providers/rawbytes"
	"github.com/open-telemetry/opamp-go/protobufs"
	"go.uber.org/zap"
)

const collectorConfigKey = "collector.yaml"

var k = koanf.New("::")

// agentConfigManager is responsible for managing the agent configuration
// It is responsible for:
// 1. Reading the agent configuration from the file
// 2. Reloading the agent configuration when the file changes
// 3. Providing the current agent configuration to the Opamp client
type agentConfigManager struct {
	agentConfig           *remoteControlledConfig
	logger                *zap.Logger
	initialConfigReceived bool
}

type reloadFunc func([]byte) error

type remoteControlledConfig struct {
	path        string     // path to the agent config file
	reloader    reloadFunc // function to reload the agent config
	currentHash []byte     // hash of the current agent config, used to determine if the config has changed
	logger      *zap.Logger
}

func NewDynamicConfig(configPath string, reloader reloadFunc, logger *zap.Logger) (*remoteControlledConfig, error) {
	if logger == nil {
		logger = zap.NewNop()
	}
	remoteControlledConfig := &remoteControlledConfig{
		path:     configPath,
		reloader: reloader,
		logger:   logger.Named("dynamic-config"),
	}

	err := remoteControlledConfig.UpsertInstanceID()

	if err != nil {
		return nil, fmt.Errorf("failed to upsert instance id %w", err)
	}

	if err := remoteControlledConfig.UpdateCurrentHash(); err != nil {
		return nil, fmt.Errorf("failed to compute hash for the current config %w", err)
	}

	return remoteControlledConfig, nil
}

// UpsertInstanceID adds a unique instance id to the config file if it is not present
func (m *remoteControlledConfig) UpsertInstanceID() error {
	// Parse the config file
	if err := k.Load(file.Provider(m.path), yaml.Parser()); err != nil {
		return fmt.Errorf("failed to parse config file %s: %w", m.path, err)
	}
	instanceID := k.String("service::telemetry::resource::service.instance.id")
	if instanceID == "" {
		instanceID = uuid.New().String()
	}
	servicePartialConfig := `
service:
  telemetry:
    resource:
      service.instance.id: ` + instanceID
	if err := k.Load(rawbytes.Provider([]byte(servicePartialConfig)), yaml.Parser()); err != nil {
		return fmt.Errorf("failed to parse service instance id config: %w", err)
	}
	bytes, err := k.Marshal(yaml.Parser())
	if err != nil {
		return fmt.Errorf("failed to marshal config: %w", err)
	}
	if err := os.WriteFile(m.path, bytes, 0644); err != nil {
		return fmt.Errorf("failed to write config file %s: %w", m.path, err)
	}
	m.logger.Info("Added instance id to config file", zap.String("instance_id", instanceID))
	return nil
}

func (m *remoteControlledConfig) UpdateCurrentHash() error {
	contents, err := os.ReadFile(m.path)
	if err != nil {
		m.currentHash = fileHash([]byte{})
		return fmt.Errorf("failed to read config file %s: %w", m.path, err)
	}
	m.currentHash = fileHash(contents)
	return nil
}

func NewAgentConfigManager(logger *zap.Logger) *agentConfigManager {
	if logger == nil {
		logger = zap.NewNop()
	}
	return &agentConfigManager{
		logger: logger.Named("agent-config-manager"),
	}
}

func (a *agentConfigManager) Set(remoteControlledConfig *remoteControlledConfig) {
	a.agentConfig = remoteControlledConfig
}

// createEffectiveConfigMsg creates a protobuf message that contains the effective config.
func (a *agentConfigManager) CreateEffectiveConfigMsg() (*protobufs.EffectiveConfig, error) {
	configMap := make(map[string]*protobufs.AgentConfigFile, 1)

	body, err := os.ReadFile(a.agentConfig.path)
	if err != nil {
		return nil, fmt.Errorf("error reading config file %s: %w", a.agentConfig.path, err)
	}

	configMap[collectorConfigKey] = &protobufs.AgentConfigFile{
		Body:        body,
		ContentType: "text/yaml",
	}

	return &protobufs.EffectiveConfig{
		ConfigMap: &protobufs.AgentConfigMap{
			ConfigMap: configMap,
		},
	}, nil
}

// Apply applies the remote configuration to the agent.
// By comparing the current hash with the hash in the remote configuration,
// it determines if the configuration has changed.
// If the configuration has changed, it reloads the configuration and returns true.
// If the configuration has not changed, it returns false.
// If there is an error, it returns an error.
// The caller is responsible for sending the updated configuration to the Opamp server.
func (a *agentConfigManager) Apply(remoteConfig *protobufs.AgentRemoteConfig) (bool, error) {
	remoteConfigMap := remoteConfig.GetConfig().GetConfigMap()

	if remoteConfigMap == nil {
		a.logger.Debug("No remote config received")
		return false, nil
	}

	remoteCollectorConfig, ok := remoteConfigMap[collectorConfigKey]

	if !ok {
		a.logger.Info("No remote collector config found with key", zap.String("key", collectorConfigKey))
		return false, nil
	}

	return a.applyRemoteConfig(a.agentConfig, remoteCollectorConfig.GetBody())
}

// applyRemoteConfig applies the remote config to the agent.
func (a *agentConfigManager) applyRemoteConfig(currentConfig *remoteControlledConfig, newContents []byte) (changed bool, err error) {
	newConfigHash := fileHash(newContents)

	// Always reload the config if this is the first config received.
	if a.initialConfigReceived && bytes.Equal(currentConfig.currentHash, newConfigHash) {
		a.logger.Info("Config has not changed")
		return false, nil
	}

	a.logger.Info("Config has changed, reloading", zap.String("path", currentConfig.path))
	err = currentConfig.reloader(newContents)
	if err != nil {
		return false, fmt.Errorf("failed to reload config: %s: %w", currentConfig.path, err)
	}

	err = currentConfig.UpdateCurrentHash()
	if err != nil {
		err = fmt.Errorf("failed hash compute for config %s: %w", currentConfig.path, err)
		return true, err
	}

	if !a.initialConfigReceived {
		a.initialConfigReceived = true
	}

	return true, nil
}

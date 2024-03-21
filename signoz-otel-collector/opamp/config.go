package opamp

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/oklog/ulid"
	"gopkg.in/yaml.v2"
)

type AgentManagerConfig struct {
	ServerEndpoint string `yaml:"server_endpoint"`
	ID             string `yaml:"id,omitempty"`
}

func ParseAgentManagerConfig(configLocation string) (*AgentManagerConfig, error) {
	data, err := os.ReadFile(filepath.Clean(configLocation))
	if err != nil {
		return nil, fmt.Errorf("failed to read agent manager config file: %w", err)
	}

	var config AgentManagerConfig
	if err := yaml.Unmarshal(data, &config); err != nil {
		return nil, fmt.Errorf("failed to unmarshal file contents: %w", err)
	}

	if config.ServerEndpoint == "" {
		return nil, fmt.Errorf("server_endpoint is required")
	}
	if config.ID == "" {
		// generate ulid if not provided
		config.ID = ulid.MustNew(ulid.Now(), nil).String()
	}

	return &config, nil
}

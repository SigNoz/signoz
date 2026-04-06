package cloudintegration

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/types/cloudintegrationtypes"
)

type Config struct {
	// Agent config for cloud integration
	Agent AgentConfig `mapstructure:"agent"`
}

type AgentConfig struct {
	Version string `mapstructure:"version"`
}

func NewConfigFactory() factory.ConfigFactory {
	return factory.NewConfigFactory(factory.MustNewName("cloudintegration"), newConfig)
}

func newConfig() factory.Config {
	return &Config{
		Agent: AgentConfig{
			Version: "",
		},
	}
}

func (c Config) Validate() error {
	if c.Agent.Version == "" {
		return errors.New(errors.TypeInvalidInput, cloudintegrationtypes.ErrCodeCloudIntegrationInvalidConfig, "agent version cannot be empty")
	}

	return nil
}

package cloudintegration

import (
	"github.com/SigNoz/signoz/pkg/factory"
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
			// Agent version is required to deploy the Cloud Integration Agent
			// Which is required only for Cloud And Self-hosted enterprises for now.
			Version: "", // TODO: should we set default version here?
		},
	}
}

func (c Config) Validate() error {
	return nil
}

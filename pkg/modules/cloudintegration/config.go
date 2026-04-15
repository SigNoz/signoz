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
			// we will maintain the latest version of cloud integration agent from here,
			// till we automate it externally or figure out a way to validate it.
			Version: "v0.0.9",
		},
	}
}

func (c Config) Validate() error {
	return nil
}

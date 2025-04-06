package flagger

import "github.com/SigNoz/signoz/pkg/factory"

var _ factory.Config = Config{}

type Config struct {
	Provider string `json:"provider"`
	Memory   Memory `json:"memory"`
}

type Memory struct {
	Boolean Boolean `json:"boolean"`
}

type Boolean struct {
	Enabled  []string `json:"enabled"`
	Disabled []string `json:"disabled"`
}

func NewConfigFactory() factory.ConfigFactory {
	return factory.NewConfigFactory(factory.MustNewName("flagger"), newConfig)
}

func newConfig() factory.Config {
	return &Config{
		Provider: "memory",
		Memory:   Memory{},
	}

}

func (c Config) Validate() error {
	return nil
}

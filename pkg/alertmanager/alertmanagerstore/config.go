package alertmanagerstore

import "go.signoz.io/signoz/pkg/factory"

type Config struct {
	Provider string `mapstructure:"provider"`
}

func NewConfig() factory.Config {
	return Config{
		Provider: "sql",
	}
}

func (c Config) Validate() error {
	return nil
}

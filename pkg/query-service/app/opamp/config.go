package opamp

import "github.com/SigNoz/signoz/pkg/factory"

// Config holds the configuration for the opamp websocket server.
type Config struct {
	// Address is the TCP address the opamp websocket server listens on, in the form "host:port".
	Address string `mapstructure:"address"`
}

func NewConfigFactory() factory.ConfigFactory {
	return factory.NewConfigFactory(factory.MustNewName("opamp"), newConfig)
}

func newConfig() factory.Config {
	return &Config{
		Address: "0.0.0.0:4320",
	}
}

func (c Config) Validate() error {
	return nil
}

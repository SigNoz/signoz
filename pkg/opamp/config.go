package opamp

import (
	"net"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
)

type Config struct {
	// Address is the TCP address the OpAMP websocket server listens on, in the form "host:port".
	Address string `mapstructure:"address"`
}

func NewConfigFactory() factory.ConfigFactory {
	return factory.NewConfigFactory(factory.MustNewName("opamp"), newConfig)
}

func newConfig() factory.Config {
	return Config{
		Address: "0.0.0.0:4320",
	}
}

func (c Config) Validate() error {
	if _, _, err := net.SplitHostPort(c.Address); err != nil {
		return errors.WrapInvalidInputf(err, errors.CodeInvalidInput, "opamp::address must be of the form host:port, got %q", c.Address)
	}

	return nil
}

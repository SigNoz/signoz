package featurecontrol

import "github.com/SigNoz/signoz/pkg/factory"

var _ factory.Config = Config{}

type Config struct{}

func (c Config) Validate() error {
	return nil
}

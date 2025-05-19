package licensing

import (
	"time"

	"github.com/SigNoz/signoz/pkg/factory"
)

var _ factory.Config = (*Config)(nil)

type Config struct {
	ValidationFrequency time.Duration `mapstructure:"validation_frequency"`
}

func (c Config) Validate() error {
	return nil
}

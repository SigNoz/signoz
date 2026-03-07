package licensing

import (
	"time"

	"github.com/SigNoz/signoz/pkg/factory"
)

var _ factory.Config = (*Config)(nil)

type Config struct {
	PollInterval     time.Duration `mapstructure:"poll_interval"`
	FailureThreshold int           `mapstructure:"failure_threshold"`
}

func (c Config) Validate() error {
	return nil
}

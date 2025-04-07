package licensingserver

import (
	"time"

	"github.com/SigNoz/signoz/pkg/licensing"
)

type Config struct {
	PollingConfig PollingConfig `mapstructure:"polling"`
}

type PollingConfig struct {
	Interval time.Duration `mapstructure:"interval"`
}

func NewConfig() Config {
	return Config{
		PollingConfig: PollingConfig{
			Interval: 24 * time.Hour,
		},
	}
}

func NewConfigFromLicensingConfig(config licensing.Config) Config {
	return Config{
		PollingConfig: PollingConfig{
			Interval: config.PollingConfig.Interval,
		},
	}
}

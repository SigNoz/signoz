package licensing

import "time"

type Config struct {
	Provider string `mapstructure:"provider"`

	PollingConfig PollingConfig `mapstructure:"polling"`
}

type PollingConfig struct {
	Interval time.Duration `mapstructure:"interval"`
}

func (c Config) Validate() error {
	return nil
}

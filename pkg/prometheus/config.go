package prometheus

import "github.com/SigNoz/signoz/pkg/factory"

type ActiveQueryTrackerConfig struct {
	Enabled       bool   `mapstructure:"enabled"`
	Path          string `mapstructure:"path"`
	MaxConcurrent int    `mapstructure:"max_concurrent"`
}

type Config struct {
	ActiveQueryTrackerConfig ActiveQueryTrackerConfig `mapstructure:"active_query_tracker"`
}

func NewConfigFactory() factory.ConfigFactory {
	return factory.NewConfigFactory(factory.MustNewName("prometheus"), newConfig)
}

func newConfig() factory.Config {
	return Config{
		ActiveQueryTrackerConfig: ActiveQueryTrackerConfig{
			Enabled:       true,
			Path:          "",
			MaxConcurrent: 20,
		},
	}
}

func (c Config) Validate() error {
	return nil
}

func (c Config) Provider() string {
	return "clickhouse"
}

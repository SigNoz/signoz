package prometheus

import (
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
)

type ActiveQueryTrackerConfig struct {
	Enabled       bool   `mapstructure:"enabled"`
	Path          string `mapstructure:"path"`
	MaxConcurrent int    `mapstructure:"max_concurrent"`
}

type Config struct {
	ActiveQueryTrackerConfig ActiveQueryTrackerConfig `mapstructure:"active_query_tracker"`

	// LookbackDelta determines the time since the last sample after which a time
	// series is considered stale.
	//
	// If not set, the prometheus default is used (currently 5m).
	LookbackDelta time.Duration `mapstructure:"lookback_delta"`

	// Timeout is the maximum time a query is allowed to run before being aborted.
	Timeout time.Duration `mapstructure:"timeout"`
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
		Timeout: 2 * time.Minute,
	}
}

func (c Config) Validate() error {
	if c.Timeout <= 0 {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "prometheus::timeout must be greater than 0")
	}
	return nil
}

func (c Config) Provider() string {
	return "clickhouse"
}

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

type ClickhouseV2Config struct {
	MaxFetchedSeries  int   `mapstructure:"max_fetched_series"`
	MaxFetchedSamples int64 `mapstructure:"max_fetched_samples"`
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

	// ProviderName selects the storage provider: "clickhouse" (default) or
	// "clickhousev2".
	ProviderName string `mapstructure:"provider"`

	// ClickhouseV2 configures the clickhousev2 provider.
	ClickhouseV2 ClickhouseV2Config `mapstructure:"clickhousev2"`
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
		Timeout:      2 * time.Minute,
		ProviderName: "clickhouse",
		ClickhouseV2: ClickhouseV2Config{
			MaxFetchedSeries:  500_000,
			MaxFetchedSamples: 50_000_000,
		},
	}
}

func (c Config) Validate() error {
	if c.Timeout <= 0 {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "prometheus::timeout must be greater than 0")
	}
	if c.ProviderName != "" && c.ProviderName != "clickhouse" && c.ProviderName != "clickhousev2" {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "prometheus::provider must be one of [clickhouse, clickhousev2], got %q", c.ProviderName)
	}
	if c.ClickhouseV2.MaxFetchedSeries < 0 || c.ClickhouseV2.MaxFetchedSamples < 0 {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "prometheus::clickhousev2 limits must not be negative")
	}
	return nil
}

func (c Config) Provider() string {
	if c.ProviderName == "" {
		return "clickhouse"
	}
	return c.ProviderName
}

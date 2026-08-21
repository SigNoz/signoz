package apiserver

import (
	"time"

	"github.com/SigNoz/signoz/pkg/factory"
)

// Config holds the configuration for config.
type Config struct {
	// Address is the TCP address the API server listens on, in the form "host:port".
	Address string  `mapstructure:"address"`
	Timeout Timeout `mapstructure:"timeout"`
	Logging Logging `mapstructure:"logging"`
}

type Timeout struct {
	// The default context timeout that can be overridden by the request
	Default time.Duration `mapstructure:"default"`
	// The maximum allowed context timeout
	Max time.Duration `mapstructure:"max"`
	// The list of routes that are excluded from the timeout
	ExcludedRoutes []string `mapstructure:"excluded_routes"`
}

type Logging struct {
	// The list of routes that are excluded from the logging
	ExcludedRoutes []string `mapstructure:"excluded_routes"`
}

func NewConfigFactory() factory.ConfigFactory {
	return factory.NewConfigFactory(factory.MustNewName("apiserver"), newConfig)
}

func newConfig() factory.Config {
	return &Config{
		Address: "0.0.0.0:8080",
		Timeout: Timeout{
			Default: 60 * time.Second,
			Max:     600 * time.Second,
			ExcludedRoutes: []string{
				"/api/v1/logs/tail",
				"/api/v3/logs/livetail",
				"/api/v1/export_raw_data",
			},
		},
		Logging: Logging{
			ExcludedRoutes: []string{
				"/api/v1/health",
				"/api/v1/version",
				"/",
			},
		},
	}
}

func (c Config) Validate() error {
	return nil
}

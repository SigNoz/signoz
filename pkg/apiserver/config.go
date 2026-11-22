package apiserver

import (
	"compress/gzip"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	httpserver "github.com/SigNoz/signoz/pkg/http/server"
)

// Config holds the configuration for config.
type Config struct {
	httpserver.Config `mapstructure:",squash" yaml:",squash"`
	Timeout           Timeout     `mapstructure:"timeout"`
	Logging           Logging     `mapstructure:"logging"`
	Compression       Compression `mapstructure:"compression"`
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

type Compression struct {
	// Whether to gzip responses on the fly
	Enabled bool `mapstructure:"enabled"`
	// The gzip level, from 1 (fastest) to 9 (smallest), or -1 for the default
	Level int `mapstructure:"level"`
}

func NewConfigFactory() factory.ConfigFactory {
	return factory.NewConfigFactory(factory.MustNewName("apiserver"), newConfig)
}

func newConfig() factory.Config {
	return &Config{
		Config: httpserver.Config{
			Address:     "0.0.0.0:8080",
			ReadTimeout: 60 * time.Second,
		},
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
		Compression: Compression{
			Enabled: true,
			Level:   gzip.DefaultCompression,
		},
	}
}

func (c Config) Validate() error {
	if err := c.Config.Validate(); err != nil {
		return err
	}

	if c.Address == "" {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "apiserver.address is required")
	}

	if level := c.Compression.Level; level != gzip.DefaultCompression && (level < gzip.BestSpeed || level > gzip.BestCompression) {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "apiserver.compression.level must be -1 or between 1 and 9")
	}

	return nil
}

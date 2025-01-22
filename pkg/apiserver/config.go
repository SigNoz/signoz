package apiserver

import (
	"time"

	"go.signoz.io/signoz/pkg/factory"
)

// Config holds the configuration for web.
type Config struct {
	// Whether the web package is enabled.
	Enabled bool `mapstructure:"enabled"`
	// The default context timeout that can be overridden by the request
	ContextTimeout time.Duration `mapstructure:"context_timeout"`
	// The maximum allowed context timeout
	ContextTimeoutMaxAllowed time.Duration `mapstructure:"context_timeout_max_allowed"`
	// Timeout Excluded Routes
	TimeoutExcludedRoutes []string `mapstructure:"timeout_excluded_routes"`
}

func NewConfigFactory() factory.ConfigFactory {
	return factory.NewConfigFactory(factory.MustNewName("apiserver"), newConfig)
}

func newConfig() factory.Config {
	return &Config{
		Enabled:                  true,
		ContextTimeout:           60 * time.Second,
		ContextTimeoutMaxAllowed: 600 * time.Second,
		TimeoutExcludedRoutes: []string{
			"/api/v1/logs/tail",
			"/api/v3/logs/livetail",
		},
	}
}

func (c Config) Validate() error {
	return nil
}

func (c Config) Provider() string {
	return "apiserver"

}

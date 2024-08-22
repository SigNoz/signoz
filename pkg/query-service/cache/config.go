package cache

import (
	"time"

	"go.signoz.io/signoz/pkg/confmap"
	inmemory "go.signoz.io/signoz/pkg/query-service/cache/inmemory"
	redis "go.signoz.io/signoz/pkg/query-service/cache/redis"
)

// Config satisfies the confmap.Config interface
var _ confmap.Config = (*Config)(nil)

type Config struct {
	Provider string            `mapstructure:"provider"`
	Redis    *redis.Options    `yaml:"redis,omitempty"`
	Memory   *inmemory.Options `yaml:"memory,omitempty"`
}

func (c *Config) NewWithDefaults() confmap.Config {
	return &Config{
		Provider: "memory",
		Memory: &inmemory.Options{
			TTL:             -1,
			CleanupInterval: 1 * time.Minute,
		},
	}
}

func (c *Config) Validate() error {
	return nil
}

package cache

import (
	"time"

	go_cache "github.com/patrickmn/go-cache"
	"go.signoz.io/signoz/pkg/confmap"
)

// Config satisfies the confmap.Config interface
var _ confmap.Config = (*Config)(nil)

type Memory struct {
	TTL             time.Duration `mapstructure:"ttl"`
	CleanupInterval time.Duration `mapstructure:"cleanupInterval"`
}

type Redis struct {
	Host     string `mapstructure:"host"`
	Port     int    `mapstructure:"port"`
	Password string `mapstructure:"password"`
	DB       int    `mapstructure:"db"`
}

type Config struct {
	Provider string `mapstructure:"provider"`
	Memory   Memory `mapstructure:"memory"`
	Redis    Redis  `mapstructure:"redis"`
}

func (c *Config) NewWithDefaults() confmap.Config {
	return &Config{
		Provider: "memory",
		Memory: Memory{
			TTL:             go_cache.NoExpiration,
			CleanupInterval: 1 * time.Minute,
		},
		Redis: Redis{
			Host:     "localhost",
			Port:     6379,
			Password: "",
			DB:       0,
		},
	}
}

func (c *Config) Validate() error {
	return nil
}

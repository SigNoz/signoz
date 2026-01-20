package cache

import (
	"github.com/SigNoz/signoz/pkg/factory"
)

type Memory struct {
	NumCounters int64 `mapstructure:"num_counters"`
	MaxCost     int64 `mapstructure:"max_cost"`
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

func NewConfigFactory() factory.ConfigFactory {
	return factory.NewConfigFactory(factory.MustNewName("cache"), newConfig)
}

func newConfig() factory.Config {
	return &Config{
		Provider: "memory",
		Memory: Memory{
			NumCounters: 10 * 10000, // 10k cache entries * 10x as per ristretto
			MaxCost:     1 << 27,    // 128 MB
		},
		Redis: Redis{
			Host:     "localhost",
			Port:     6379,
			Password: "",
			DB:       0,
		},
	}

}

func (c Config) Validate() error {
	return nil
}

package cache

import (
	"os"
	"time"

	"go.signoz.io/signoz/pkg/cache/entity"
	"go.signoz.io/signoz/pkg/cache/status"
	"go.signoz.io/signoz/pkg/cache/strategy/memory"
	"go.signoz.io/signoz/pkg/cache/strategy/redis"
	"gopkg.in/yaml.v2"
)

type Options struct {
	Name     string          `yaml:"-"`
	Provider string          `yaml:"provider"`
	Redis    *redis.Options  `yaml:"redis,omitempty"`
	Memory   *memory.Options `yaml:"memory,omitempty"`
}

type Cache interface {
	Connect() error
	Store(cacheKey string, data entity.CacheableEntity, ttl time.Duration) error
	Retrieve(cacheKey string, dest entity.CacheableEntity, allowExpired bool) (status.RetrieveStatus, error)
	SetTTL(cacheKey string, ttl time.Duration)
	Remove(cacheKey string)
	BulkRemove(cacheKeys []string)
	Close() error
}

// LoadFromYAMLCacheConfig loads the cache options from the given YAML config bytes
func LoadFromYAMLCacheConfig(yamlConfig []byte) (*Options, error) {
	var options Options
	err := yaml.Unmarshal(yamlConfig, &options)
	if err != nil {
		return nil, err
	}
	return &options, nil
}

// LoadFromYAMLCacheConfigFile loads the cache options from the given YAML config file
func LoadFromYAMLCacheConfigFile(configFile string) (*Options, error) {
	bytes, err := os.ReadFile(configFile)
	if err != nil {
		return nil, err
	}
	return LoadFromYAMLCacheConfig(bytes)
}

func NewCache(opts *Options) Cache {
	switch opts.Provider {
	case "memory":
		return memory.New(opts.Memory)
	case "redis":
		return redis.New(opts.Redis)
	default:
		return nil
	}
}

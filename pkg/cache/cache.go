package generic_cache

import (
	"os"
	"time"

	generic_cache_entity "go.signoz.io/signoz/pkg/cache/entity"
	generic_cache_inmemory "go.signoz.io/signoz/pkg/cache/strategy/inmemory"
	generic_cache_redis "go.signoz.io/signoz/pkg/cache/strategy/redis"
	"go.signoz.io/signoz/pkg/query-service/cache/status"
	"gopkg.in/yaml.v2"
)

type Options struct {
	Name     string                          `yaml:"-"`
	Provider string                          `yaml:"provider"`
	Redis    *generic_cache_redis.Options    `yaml:"redis,omitempty"`
	InMemory *generic_cache_inmemory.Options `yaml:"inmemory,omitempty"`
}

type Cache interface {
	Connect() error
	Store(cacheKey string, data *generic_cache_entity.CacheableEntity, ttl time.Duration) error
	Retrieve(cacheKey string, dest *generic_cache_entity.CacheableEntity, allowExpired bool) (status.RetrieveStatus, error)
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
	case "inmemory":
		return generic_cache_inmemory.New(opts.InMemory)
	case "redis":
		return generic_cache_redis.New(opts.Redis)
	default:
		return nil
	}
}

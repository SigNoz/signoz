package cache

import (
	"os"
	"time"

	inmemory "go.signoz.io/signoz/pkg/query-service/cache/inmemory"
	redis "go.signoz.io/signoz/pkg/query-service/cache/redis"
	"go.signoz.io/signoz/pkg/query-service/cache/status"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"gopkg.in/yaml.v2"
)

type Options struct {
	Name     string            `yaml:"-"`
	Provider string            `yaml:"provider"`
	Redis    *redis.Options    `yaml:"redis,omitempty"`
	InMemory *inmemory.Options `yaml:"inmemory,omitempty"`
}

// Cache is the interface for the storage backend
type Cache interface {
	Connect() error
	Store(cacheKey string, data []byte, ttl time.Duration) error
	Retrieve(cacheKey string, allowExpired bool) ([]byte, status.RetrieveStatus, error)
	SetTTL(cacheKey string, ttl time.Duration)
	Remove(cacheKey string)
	BulkRemove(cacheKeys []string)
	Close() error
}

// KeyGenerator is the interface for the key generator
// The key generator is used to generate the cache keys for the cache entries
type KeyGenerator interface {
	// GenerateKeys generates the cache keys for the given query range params
	// The keys are returned as a map where the key is the query name and the value is the cache key
	GenerateKeys(*v3.QueryRangeParamsV3) map[string]string
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

// NewCache creates a new cache based on the given options
func NewCache(options *Options) Cache {
	switch options.Provider {
	case "redis":
		return redis.New(options.Redis)
	case "inmemory":
		return inmemory.New(options.InMemory)
	default:
		return nil
	}
}

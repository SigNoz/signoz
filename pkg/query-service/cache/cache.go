package cache

import (
	"os"
	"time"

	filesystem "go.signoz.io/signoz/pkg/query-service/cache/filesystem"
	inmemory "go.signoz.io/signoz/pkg/query-service/cache/inmemory"
	redis "go.signoz.io/signoz/pkg/query-service/cache/redis"
	"go.signoz.io/signoz/pkg/query-service/cache/status"
	"go.signoz.io/signoz/pkg/query-service/model"
	"gopkg.in/yaml.v2"
)

type Options struct {
	Name       string              `yaml:"-"`
	Provider   string              `yaml:"provider"`
	Redis      *redis.Options      `yaml:"redis,omitempty"`
	Filesystem *filesystem.Options `yaml:"filesystem,omitempty"`
	InMemory   *inmemory.Options   `yaml:"inmemory,omitempty"`
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

type KeyGenerator interface {
	GenerateKeys(*model.QueryRangeParamsV2) map[string]string
}

func LoadFromYAMLCacheConfig(yamlConfig []byte) (*Options, error) {
	var options Options
	err := yaml.Unmarshal(yamlConfig, &options)
	if err != nil {
		return nil, err
	}
	return &options, nil
}

func LoadFromYAMLCacheConfigFile(configFile string) (*Options, error) {
	bytes, err := os.ReadFile(configFile)
	if err != nil {
		return nil, err
	}
	return LoadFromYAMLCacheConfig(bytes)
}

func NewCache(options *Options) Cache {
	switch options.Provider {
	case "redis":
		return redis.New(options.Redis)
	case "filesystem":
		// TODO: implement filesystem cache
		return nil
	case "inmemory":
		return inmemory.New(options.InMemory)
	default:
		return nil
	}
}

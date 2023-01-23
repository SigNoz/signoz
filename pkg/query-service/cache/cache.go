package cache

import (
	"time"

	filesystem "go.signoz.io/signoz/pkg/query-service/cache/filesystem"
	inmemory "go.signoz.io/signoz/pkg/query-service/cache/inmemory"
	redis "go.signoz.io/signoz/pkg/query-service/cache/redis"
	"go.signoz.io/signoz/pkg/query-service/cache/status"
)

type Options struct {
	Name       string              `yaml:"-"`
	Provider   string              `yaml:"provider,omitempty"`
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
	Configuration() *Options
}

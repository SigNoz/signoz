package inmemory

import (
	"time"
)

type Options struct {
	// TTL is the time to live for the cache entries
	TTL time.Duration `yaml:"ttl,omitempty"`
}

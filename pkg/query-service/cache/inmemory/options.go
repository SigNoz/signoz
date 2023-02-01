package inmemory

import (
	"time"
)

const (
	defaultTTL             = 5 * time.Minute
	defaultCleanupInterval = 1 * time.Minute
)

// Options holds the options for the in-memory cache
type Options struct {
	// TTL is the time to live for the cache entries
	TTL             time.Duration `yaml:"ttl,omitempty"`
	CleanupInterval time.Duration `yaml:"cleanupInterval,omitempty"`
}

func defaultOptions() *Options {
	return &Options{TTL: defaultTTL, CleanupInterval: defaultCleanupInterval}
}

package signoz

import (
	"go.signoz.io/signoz/pkg/cache"
	"go.signoz.io/signoz/pkg/cache/strategy/memory"
	"go.signoz.io/signoz/pkg/cache/strategy/redis"
	"go.signoz.io/signoz/pkg/config"
	"go.signoz.io/signoz/pkg/web"
	"go.uber.org/zap"
)

type SigNoz struct {
	Cache cache.Cache
	Web   *web.Web
}

func New(config *config.Config, skipWebFrontend bool) (*SigNoz, error) {
	var cache cache.Cache

	// init for the cache
	switch config.Cache.Provider {
	case "memory":
		cache = memory.New(&config.Cache.Memory)
	case "redis":
		cache = redis.New(&config.Cache.Redis)
	}

	web, err := web.New(zap.L(), config.Web)
	if err != nil && !skipWebFrontend {
		return nil, err
	}

	return &SigNoz{
		Cache: cache,
		Web:   web,
	}, nil
}

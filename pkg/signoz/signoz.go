package signoz

import (
	"go.signoz.io/signoz/pkg/cache"
	"go.signoz.io/signoz/pkg/cache/memorycache"
	"go.signoz.io/signoz/pkg/cache/rediscache"
	"go.signoz.io/signoz/pkg/config"
	"go.signoz.io/signoz/pkg/web"
	"go.signoz.io/signoz/pkg/web/routerweb"
	"go.uber.org/zap"
)

type SigNoz struct {
	Cache cache.Cache
	Web   web.Web
}

func New(config config.Config, skipWebFrontend bool) (*SigNoz, error) {
	var cache cache.Cache

	// init for the cache
	switch config.Cache.Provider {
	case "memory":
		cache = memorycache.New(&config.Cache.Memory)
	case "redis":
		cache = rediscache.New(&config.Cache.Redis)
	}

	web, err := routerweb.New(zap.L(), config.Web)
	if err != nil && !skipWebFrontend {
		return nil, err
	}

	return &SigNoz{
		Cache: cache,
		Web:   web,
	}, nil
}

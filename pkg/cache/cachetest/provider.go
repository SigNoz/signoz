package cachetest

import (
	"context"

	"github.com/SigNoz/signoz/pkg/cache"
	"github.com/SigNoz/signoz/pkg/cache/memorycache"
	"github.com/SigNoz/signoz/pkg/factory/factorytest"
)

func New(config cache.Config) (cache.Cache, error) {
	cache, err := memorycache.New(context.TODO(), factorytest.NewSettings(), config)
	if err != nil {
		return nil, err
	}

	return cache, nil
}

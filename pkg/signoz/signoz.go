package signoz

import (
	"context"

	"go.signoz.io/signoz/pkg/cache"
	"go.signoz.io/signoz/pkg/cache/strategy/memory"
	"go.signoz.io/signoz/pkg/cache/strategy/redis"
	"go.signoz.io/signoz/pkg/sqlstore"
	"go.signoz.io/signoz/pkg/sqlstore/migrations"
	sqlstoreprovider "go.signoz.io/signoz/pkg/sqlstore/provider"
	"go.signoz.io/signoz/pkg/web"
	"go.signoz.io/signoz/pkg/web/noop"
	"go.signoz.io/signoz/pkg/web/router"
	"go.uber.org/zap"
)

type SigNoz struct {
	Cache    cache.Cache
	Web      web.Web
	SqlStore sqlstore.SqlStore
}

func New(config Config) (*SigNoz, error) {
	var cache cache.Cache
	var web web.Web

	// init for the cache
	switch config.Cache.Provider {
	case "memory":
		cache = memory.New(&config.Cache.Memory)
	case "redis":
		cache = redis.New(&config.Cache.Redis)
	}

	switch config.Web.Enabled {
	case true:
		_web, err := router.New(zap.L(), config.Web)
		if err != nil {
			return nil, err
		}
		web = _web
	case false:
		web = noop.New()
	}

	sqlStoreProvider, err := sqlstoreprovider.New(config.SqlStore, sqlstore.ProviderConfig{Logger: zap.L()})
	if err != nil {
		return nil, err
	}

	migrations, err := migrations.New(sqlstore.MigrationConfig{Logger: zap.L()})
	if err != nil {
		return nil, err
	}

	sqlStore := sqlstore.NewSqlStore(sqlStoreProvider, migrations)
	err = sqlStore.Migrate(context.Background())
	if err != nil {
		return nil, err
	}

	return &SigNoz{
		Cache:    cache,
		Web:      web,
		SqlStore: sqlStore,
	}, nil
}

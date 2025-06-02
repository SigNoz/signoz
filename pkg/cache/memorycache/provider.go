package memorycache

import (
	"context"
	"reflect"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/cache"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/types/cachetypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	go_cache "github.com/patrickmn/go-cache"
)

type provider struct {
	cc       *go_cache.Cache
	config   cache.Config
	settings factory.ScopedProviderSettings
}

func NewFactory() factory.ProviderFactory[cache.Cache, cache.Config] {
	return factory.NewProviderFactory(factory.MustNewName("memory"), New)
}

func New(ctx context.Context, settings factory.ProviderSettings, config cache.Config) (cache.Cache, error) {
	scopedProviderSettings := factory.NewScopedProviderSettings(settings, "github.com/SigNoz/signoz/pkg/cache/memorycache")
	return &provider{cc: go_cache.New(config.Memory.TTL, config.Memory.CleanupInterval), settings: scopedProviderSettings, config: config}, nil
}

func (provider *provider) Set(ctx context.Context, orgID valuer.UUID, cacheKey string, data cachetypes.Cacheable, ttl time.Duration) error {
	// check if the data being passed is a pointer and is not nil
	err := cachetypes.ValidatePointer(data, "inmemory")
	if err != nil {
		return err
	}

	if ttl == 0 {
		provider.settings.Logger().WarnContext(ctx, "zero value for TTL found. defaulting to the base TTL", "cache_key", cacheKey, "default_ttl", provider.config.Memory.TTL)
	}
	provider.cc.Set(strings.Join([]string{orgID.StringValue(), cacheKey}, "::"), data, ttl)
	return nil
}

func (provider *provider) Get(_ context.Context, orgID valuer.UUID, cacheKey string, dest cachetypes.Cacheable, allowExpired bool) error {
	// check if the destination being passed is a pointer and is not nil
	err := cachetypes.ValidatePointer(dest, "inmemory")
	if err != nil {
		return err
	}

	// check if the destination value is settable
	dstv := reflect.ValueOf(dest)
	if !dstv.Elem().CanSet() {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "destination value is not settable, %s", dstv.Elem())
	}

	data, found := provider.cc.Get(strings.Join([]string{orgID.StringValue(), cacheKey}, "::"))
	if !found {
		return errors.Newf(errors.TypeNotFound, errors.CodeNotFound, "key miss")
	}

	// check the type compatbility between the src and dest
	srcv := reflect.ValueOf(data)
	if !srcv.Type().AssignableTo(dstv.Type()) {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "src type is not assignable to dst type")
	}

	// set the value to from src to dest
	dstv.Elem().Set(srcv.Elem())
	return nil
}

func (provider *provider) Delete(_ context.Context, orgID valuer.UUID, cacheKey string) {
	provider.cc.Delete(strings.Join([]string{orgID.StringValue(), cacheKey}, "::"))
}

func (provider *provider) DeleteMany(_ context.Context, orgID valuer.UUID, cacheKeys []string) {
	for _, cacheKey := range cacheKeys {
		provider.cc.Delete(strings.Join([]string{orgID.StringValue(), cacheKey}, "::"))
	}
}

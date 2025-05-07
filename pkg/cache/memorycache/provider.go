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
	cc *go_cache.Cache
}

func NewFactory() factory.ProviderFactory[cache.Cache, cache.Config] {
	return factory.NewProviderFactory(factory.MustNewName("memory"), New)
}

func New(ctx context.Context, settings factory.ProviderSettings, config cache.Config) (cache.Cache, error) {
	return &provider{cc: go_cache.New(config.Memory.TTL, config.Memory.CleanupInterval)}, nil
}

func (c *provider) Set(_ context.Context, orgID valuer.UUID, cacheKey string, data cachetypes.Cacheable, ttl time.Duration) error {
	// check if the data being passed is a pointer and is not nil
	err := cachetypes.ValidatePointer(data, "inmemory")
	if err != nil {
		return err
	}

	c.cc.Set(strings.Join([]string{orgID.StringValue(), cacheKey}, "::"), data, ttl)
	return nil
}

func (c *provider) Get(_ context.Context, orgID valuer.UUID, cacheKey string, dest cachetypes.Cacheable, allowExpired bool) error {
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

	data, found := c.cc.Get(strings.Join([]string{orgID.StringValue(), cacheKey}, "::"))
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

func (c *provider) Delete(_ context.Context, orgID valuer.UUID, cacheKey string) {
	c.cc.Delete(strings.Join([]string{orgID.StringValue(), cacheKey}, "::"))
}

func (c *provider) DeleteMany(_ context.Context, orgID valuer.UUID, cacheKeys []string) {
	for _, cacheKey := range cacheKeys {
		c.cc.Delete(strings.Join([]string{orgID.StringValue(), cacheKey}, "::"))
	}
}

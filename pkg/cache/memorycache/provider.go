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
	gocache "github.com/patrickmn/go-cache"
	semconv "go.opentelemetry.io/collector/semconv/v1.6.1"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"
)

type provider struct {
	cc       *gocache.Cache
	config   cache.Config
	settings factory.ScopedProviderSettings
}

func NewFactory() factory.ProviderFactory[cache.Cache, cache.Config] {
	return factory.NewProviderFactory(factory.MustNewName("memory"), New)
}

func New(ctx context.Context, settings factory.ProviderSettings, config cache.Config) (cache.Cache, error) {
	scopedProviderSettings := factory.NewScopedProviderSettings(settings, "github.com/SigNoz/signoz/pkg/cache/memorycache")

	return &provider{
		cc:       gocache.New(config.Memory.TTL, config.Memory.CleanupInterval),
		settings: scopedProviderSettings,
		config:   config,
	}, nil
}

func (provider *provider) Set(ctx context.Context, orgID valuer.UUID, cacheKey string, data cachetypes.Cacheable, ttl time.Duration) error {
	_, span := provider.settings.Tracer().Start(ctx, "memory.set", trace.WithAttributes(
		attribute.String(semconv.AttributeDBSystem, "memory"),
		attribute.String(semconv.AttributeDBStatement, "set "+strings.Join([]string{orgID.StringValue(), cacheKey}, "::")),
		attribute.String(semconv.AttributeDBOperation, "SET"),
	))
	defer span.End()

	err := cachetypes.CheckCacheablePointer(data)
	if err != nil {
		return err
	}

	if cloneable, ok := data.(cachetypes.Cloneable); ok {
		span.SetAttributes(attribute.Bool("db.cloneable", true))
		toCache := cloneable.Clone()
		provider.cc.Set(strings.Join([]string{orgID.StringValue(), cacheKey}, "::"), toCache, ttl)
		return nil
	}

	span.SetAttributes(attribute.Bool("db.cloneable", false))
	toCache, err := data.MarshalBinary()
	if err != nil {
		return err
	}

	provider.cc.Set(strings.Join([]string{orgID.StringValue(), cacheKey}, "::"), toCache, ttl)
	return nil
}

func (provider *provider) Get(ctx context.Context, orgID valuer.UUID, cacheKey string, dest cachetypes.Cacheable, allowExpired bool) error {
	_, span := provider.settings.Tracer().Start(ctx, "memory.get", trace.WithAttributes(
		attribute.String(semconv.AttributeDBSystem, "memory"),
		attribute.String(semconv.AttributeDBStatement, "get "+strings.Join([]string{orgID.StringValue(), cacheKey}, "::")),
		attribute.String(semconv.AttributeDBOperation, "GET"),
	))
	defer span.End()

	err := cachetypes.CheckCacheablePointer(dest)
	if err != nil {
		return err
	}

	cachedData, found := provider.cc.Get(strings.Join([]string{orgID.StringValue(), cacheKey}, "::"))
	if !found {
		return errors.Newf(errors.TypeNotFound, errors.CodeNotFound, "key miss")
	}

	if cloneable, ok := cachedData.(cachetypes.Cloneable); ok {
		span.SetAttributes(attribute.Bool("db.cloneable", true))
		// check if the destination value is settable
		dstv := reflect.ValueOf(dest)
		if !dstv.Elem().CanSet() {
			return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "unsettable: (value: \"%s\")", dstv.Elem())
		}

		fromCache := cloneable.Clone()

		// check the type compatbility between the src and dest
		srcv := reflect.ValueOf(fromCache)
		if !srcv.Type().AssignableTo(dstv.Type()) {
			return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "unassignable: (src: \"%s\", dst: \"%s\")", srcv.Type().String(), dstv.Type().String())
		}

		// set the value to from src to dest
		dstv.Elem().Set(srcv.Elem())
		return nil
	}

	if fromCache, ok := cachedData.([]byte); ok {
		span.SetAttributes(attribute.Bool("db.cloneable", false))
		if err = dest.UnmarshalBinary(fromCache); err != nil {
			return err
		}

		return nil
	}

	return errors.NewInternalf(errors.CodeInternal, "unrecognized: (value: \"%s\")", reflect.TypeOf(cachedData).String())
}

func (provider *provider) Delete(ctx context.Context, orgID valuer.UUID, cacheKey string) {
	_, span := provider.settings.Tracer().Start(ctx, "memory.delete", trace.WithAttributes(
		attribute.String(semconv.AttributeDBSystem, "memory"),
		attribute.String(semconv.AttributeDBStatement, "delete "+strings.Join([]string{orgID.StringValue(), cacheKey}, "::")),
		attribute.String(semconv.AttributeDBOperation, "DELETE"),
	))
	defer span.End()

	provider.cc.Delete(strings.Join([]string{orgID.StringValue(), cacheKey}, "::"))
}

func (provider *provider) DeleteMany(_ context.Context, orgID valuer.UUID, cacheKeys []string) {
	for _, cacheKey := range cacheKeys {
		provider.cc.Delete(strings.Join([]string{orgID.StringValue(), cacheKey}, "::"))
	}
}

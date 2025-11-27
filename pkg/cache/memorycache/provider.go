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
	"github.com/dgraph-io/ristretto/v2"
	semconv "go.opentelemetry.io/collector/semconv/v1.6.1"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/metric"
	"go.opentelemetry.io/otel/trace"
)

type provider struct {
	cc       *ristretto.Cache[string, any]
	config   cache.Config
	settings factory.ScopedProviderSettings
}

func NewFactory() factory.ProviderFactory[cache.Cache, cache.Config] {
	return factory.NewProviderFactory(factory.MustNewName("memory"), New)
}

func New(ctx context.Context, settings factory.ProviderSettings, config cache.Config) (cache.Cache, error) {
	scopedProviderSettings := factory.NewScopedProviderSettings(settings, "github.com/SigNoz/signoz/pkg/cache/memorycache")

	cc, err := ristretto.NewCache(&ristretto.Config[string, any]{
		NumCounters: config.Memory.NumCounters,
		MaxCost:     config.Memory.MaxCost,
		BufferItems: 64,
		Metrics:     true,
	})
	if err != nil {
		return nil, err
	}

	meter := scopedProviderSettings.Meter()
	telemetry, err := newMetrics(meter)
	if err != nil {
		return nil, err
	}

	_, err = meter.RegisterCallback(func(ctx context.Context, o metric.Observer) error {
		metrics := cc.Metrics
		attributes := []attribute.KeyValue{
			attribute.String("provider", "memorycache"),
		}
		o.ObserveFloat64(telemetry.cacheRatio, metrics.Ratio(), metric.WithAttributes(attributes...))
		o.ObserveInt64(telemetry.cacheHits, int64(metrics.Hits()), metric.WithAttributes(attributes...))
		o.ObserveInt64(telemetry.cacheMisses, int64(metrics.Misses()), metric.WithAttributes(attributes...))
		o.ObserveInt64(telemetry.costAdded, int64(metrics.CostAdded()), metric.WithAttributes(attributes...))
		o.ObserveInt64(telemetry.costEvicted, int64(metrics.CostEvicted()), metric.WithAttributes(attributes...))
		o.ObserveInt64(telemetry.keysAdded, int64(metrics.KeysAdded()), metric.WithAttributes(attributes...))
		o.ObserveInt64(telemetry.keysEvicted, int64(metrics.KeysEvicted()), metric.WithAttributes(attributes...))
		o.ObserveInt64(telemetry.keysUpdated, int64(metrics.KeysUpdated()), metric.WithAttributes(attributes...))
		o.ObserveInt64(telemetry.setsDropped, int64(metrics.SetsDropped()), metric.WithAttributes(attributes...))
		o.ObserveInt64(telemetry.setsRejected, int64(metrics.SetsRejected()), metric.WithAttributes(attributes...))
		o.ObserveInt64(telemetry.getsDropped, int64(metrics.GetsDropped()), metric.WithAttributes(attributes...))
		o.ObserveInt64(telemetry.getsKept, int64(metrics.GetsKept()), metric.WithAttributes(attributes...))
		o.ObserveInt64(telemetry.totalCost, int64(cc.MaxCost()), metric.WithAttributes(attributes...))
		return nil
	},
		telemetry.cacheRatio,
		telemetry.cacheHits,
		telemetry.cacheMisses,
		telemetry.costAdded,
		telemetry.costEvicted,
		telemetry.keysAdded,
		telemetry.keysEvicted,
		telemetry.keysUpdated,
		telemetry.setsDropped,
		telemetry.setsRejected,
		telemetry.getsDropped,
		telemetry.getsKept,
		telemetry.totalCost,
	)
	if err != nil {
		return nil, err
	}

	return &provider{
		cc:       cc,
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
		span.SetAttributes(attribute.Bool("memory.cloneable", true))
		span.SetAttributes(attribute.Int64("memory.cost", 1))
		toCache := cloneable.Clone()
		// In case of contention we are choosing to evict the cloneable entries first hence cost is set to 1
		if ok := provider.cc.SetWithTTL(strings.Join([]string{orgID.StringValue(), cacheKey}, "::"), toCache, 1, ttl); !ok {
			return errors.New(errors.TypeInternal, errors.CodeInternal, "error writing to cache")
		}
		
		provider.cc.Wait()
		return nil
	}

	toCache, err := data.MarshalBinary()
	cost := int64(len(toCache))
	if err != nil {
		return err
	}

	span.SetAttributes(attribute.Bool("memory.cloneable", false))
	span.SetAttributes(attribute.Int64("memory.cost", cost))

	if ok := provider.cc.SetWithTTL(strings.Join([]string{orgID.StringValue(), cacheKey}, "::"), toCache, 1, ttl); !ok {
		return errors.New(errors.TypeInternal, errors.CodeInternal, "error writing to cache")
	}

	provider.cc.Wait()
	return nil
}

func (provider *provider) Get(ctx context.Context, orgID valuer.UUID, cacheKey string, dest cachetypes.Cacheable) error {
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
		span.SetAttributes(attribute.Bool("memory.cloneable", true))
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
		span.SetAttributes(attribute.Bool("memory.cloneable", false))
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

	provider.cc.Del(strings.Join([]string{orgID.StringValue(), cacheKey}, "::"))
}

func (provider *provider) DeleteMany(_ context.Context, orgID valuer.UUID, cacheKeys []string) {
	for _, cacheKey := range cacheKeys {
		provider.cc.Del(strings.Join([]string{orgID.StringValue(), cacheKey}, "::"))
	}
}

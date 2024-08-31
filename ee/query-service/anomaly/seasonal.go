package anomaly

import (
	"context"

	"go.signoz.io/signoz/pkg/query-service/cache"
	"go.signoz.io/signoz/pkg/query-service/interfaces"
)

// BaseProvider is an interface that includes common methods for all provider types
type BaseProvider interface {
	GetBaseSeasonalProvider() *BaseSeasonalProvider
}

// GenericProviderOption is a generic type for provider options
type GenericProviderOption[T BaseProvider] func(T)

func WithCache[T BaseProvider](cache cache.Cache) GenericProviderOption[T] {
	return func(p T) {
		p.GetBaseSeasonalProvider().cache = cache
	}
}

func WithKeyGenerator[T BaseProvider](keyGenerator cache.KeyGenerator) GenericProviderOption[T] {
	return func(p T) {
		p.GetBaseSeasonalProvider().keyGenerator = keyGenerator
	}
}

func WithFeatureLookup[T BaseProvider](ff interfaces.FeatureLookup) GenericProviderOption[T] {
	return func(p T) {
		p.GetBaseSeasonalProvider().ff = ff
	}
}

func WithReader[T BaseProvider](reader interfaces.Reader) GenericProviderOption[T] {
	return func(p T) {
		p.GetBaseSeasonalProvider().reader = reader
	}
}

type BaseSeasonalProvider struct {
	querierV2    interfaces.Querier
	reader       interfaces.Reader
	cache        cache.Cache
	keyGenerator cache.KeyGenerator
	ff           interfaces.FeatureLookup
}

func (p *BaseSeasonalProvider) getQueryParams(req *GetAnomaliesRequest) *anomalyQueryParams {
	return prepareAnomalyQueryParams(req.Params, req.Seasonality)
}

func (p *BaseSeasonalProvider) getQueryResults(ctx context.Context, req *GetAnomaliesRequest) (*anomalyQueryResults, error) {
	return nil, nil
}

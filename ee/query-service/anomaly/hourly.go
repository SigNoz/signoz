package anomaly

import (
	"context"

	querierV2 "go.signoz.io/signoz/pkg/query-service/app/querier/v2"
	"go.signoz.io/signoz/pkg/query-service/app/queryBuilder"
)

type HourlyProvider struct {
	BaseSeasonalProvider
}

var _ BaseProvider = (*HourlyProvider)(nil)

func (hp *HourlyProvider) GetBaseSeasonalProvider() *BaseSeasonalProvider {
	return &hp.BaseSeasonalProvider
}

// NewHourlyProvider now uses the generic option type
func NewHourlyProvider(opts ...GenericProviderOption[*HourlyProvider]) *HourlyProvider {
	hp := &HourlyProvider{
		BaseSeasonalProvider: BaseSeasonalProvider{},
	}

	for _, opt := range opts {
		opt(hp)
	}

	hp.querierV2 = querierV2.NewQuerier(querierV2.QuerierOptions{
		Reader:        hp.reader,
		Cache:         hp.cache,
		KeyGenerator:  queryBuilder.NewKeyGenerator(),
		FluxInterval:  hp.fluxInterval,
		FeatureLookup: hp.ff,
	})

	return hp
}

func (p *HourlyProvider) GetAnomalies(ctx context.Context, req *GetAnomaliesRequest) (*GetAnomaliesResponse, error) {
	req.Seasonality = SeasonalityHourly
	return p.getAnomalies(ctx, req)
}

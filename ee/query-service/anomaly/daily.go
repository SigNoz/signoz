package anomaly

import (
	"context"

	querierV2 "go.signoz.io/signoz/pkg/query-service/app/querier/v2"
	"go.signoz.io/signoz/pkg/query-service/app/queryBuilder"
)

type DailyProvider struct {
	BaseSeasonalProvider
}

var _ BaseProvider = (*DailyProvider)(nil)

func (dp *DailyProvider) GetBaseSeasonalProvider() *BaseSeasonalProvider {
	return &dp.BaseSeasonalProvider
}

// NewDailyProvider uses the same generic option type
func NewDailyProvider(opts ...GenericProviderOption[*DailyProvider]) *DailyProvider {
	dp := &DailyProvider{
		BaseSeasonalProvider: BaseSeasonalProvider{},
	}

	for _, opt := range opts {
		opt(dp)
	}

	dp.querierV2 = querierV2.NewQuerier(querierV2.QuerierOptions{
		Reader:        dp.reader,
		Cache:         dp.cache,
		KeyGenerator:  queryBuilder.NewKeyGenerator(),
		FluxInterval:  dp.fluxInterval,
		FeatureLookup: dp.ff,
	})

	return dp
}

func (p *DailyProvider) GetAnomalies(ctx context.Context, req *GetAnomaliesRequest) (*GetAnomaliesResponse, error) {
	req.Seasonality = SeasonalityDaily
	return p.getAnomalies(ctx, req)
}

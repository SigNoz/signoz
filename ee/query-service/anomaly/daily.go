package anomaly

import (
	"context"

	querierV2 "github.com/SigNoz/signoz/pkg/query-service/app/querier/v2"
	"github.com/SigNoz/signoz/pkg/query-service/app/queryBuilder"
	"github.com/SigNoz/signoz/pkg/valuer"
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
		Reader:       dp.reader,
		Cache:        dp.cache,
		KeyGenerator: queryBuilder.NewKeyGenerator(),
		FluxInterval: dp.fluxInterval,
	})

	return dp
}

func (p *DailyProvider) GetAnomalies(ctx context.Context, orgID valuer.UUID, req *GetAnomaliesRequest) (*GetAnomaliesResponse, error) {
	req.Seasonality = SeasonalityDaily
	return p.getAnomalies(ctx, orgID, req)
}

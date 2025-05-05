package anomaly

import (
	"context"

	querierV2 "github.com/SigNoz/signoz/pkg/query-service/app/querier/v2"
	"github.com/SigNoz/signoz/pkg/query-service/app/queryBuilder"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type WeeklyProvider struct {
	BaseSeasonalProvider
}

var _ BaseProvider = (*WeeklyProvider)(nil)

func (wp *WeeklyProvider) GetBaseSeasonalProvider() *BaseSeasonalProvider {
	return &wp.BaseSeasonalProvider
}

func NewWeeklyProvider(opts ...GenericProviderOption[*WeeklyProvider]) *WeeklyProvider {
	wp := &WeeklyProvider{
		BaseSeasonalProvider: BaseSeasonalProvider{},
	}

	for _, opt := range opts {
		opt(wp)
	}

	wp.querierV2 = querierV2.NewQuerier(querierV2.QuerierOptions{
		Reader:       wp.reader,
		Cache:        wp.cache,
		KeyGenerator: queryBuilder.NewKeyGenerator(),
		FluxInterval: wp.fluxInterval,
	})

	return wp
}

func (p *WeeklyProvider) GetAnomalies(ctx context.Context, orgID valuer.UUID, req *GetAnomaliesRequest) (*GetAnomaliesResponse, error) {
	req.Seasonality = SeasonalityWeekly
	return p.getAnomalies(ctx, orgID, req)
}

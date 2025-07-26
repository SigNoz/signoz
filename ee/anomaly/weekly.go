package anomaly

import (
	"context"

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

	return wp
}

func (p *WeeklyProvider) GetAnomalies(ctx context.Context, orgID valuer.UUID, req *AnomaliesRequest) (*AnomaliesResponse, error) {
	req.Seasonality = SeasonalityWeekly
	return p.getAnomalies(ctx, orgID, req)
}

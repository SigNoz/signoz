package anomaly

import (
	"context"

	"github.com/SigNoz/signoz/pkg/valuer"
)

type DailyProvider struct {
	BaseSeasonalProvider
}

var _ BaseProvider = (*DailyProvider)(nil)

func (dp *DailyProvider) GetBaseSeasonalProvider() *BaseSeasonalProvider {
	return &dp.BaseSeasonalProvider
}

func NewDailyProvider(opts ...GenericProviderOption[*DailyProvider]) *DailyProvider {
	dp := &DailyProvider{
		BaseSeasonalProvider: BaseSeasonalProvider{},
	}

	for _, opt := range opts {
		opt(dp)
	}

	return dp
}

func (p *DailyProvider) GetAnomalies(ctx context.Context, orgID valuer.UUID, req *AnomaliesRequest) (*AnomaliesResponse, error) {
	req.Seasonality = SeasonalityDaily
	return p.getAnomalies(ctx, orgID, req)
}

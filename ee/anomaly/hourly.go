package anomaly

import (
	"context"

	"github.com/SigNoz/signoz/pkg/valuer"
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

	return hp
}

func (p *HourlyProvider) GetAnomalies(ctx context.Context, orgID valuer.UUID, req *AnomaliesRequest) (*AnomaliesResponse, error) {
	req.Seasonality = SeasonalityHourly
	return p.getAnomalies(ctx, orgID, req)
}

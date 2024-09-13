package anomaly

import (
	"context"
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

func (p *WeeklyProvider) GetAnomalies(ctx context.Context, req *GetAnomaliesRequest) (*GetAnomaliesResponse, error) {
	return nil, nil
}

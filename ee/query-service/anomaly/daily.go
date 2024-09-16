package anomaly

import (
	"context"
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

	return dp
}

func (p *DailyProvider) GetAnomalies(ctx context.Context, req *GetAnomaliesRequest) (*GetAnomaliesResponse, error) {
	return nil, nil
}

package anomaly

import (
"context"
"fmt"
"log/slog"

"github.com/SigNoz/signoz/pkg/querier"
"github.com/SigNoz/signoz/pkg/valuer"
)

type MLProvider struct {
baseProvider Provider
querier      querier.Querier
logger       *slog.Logger
}

var _ Provider = (*MLProvider)(nil)

func NewMLProvider(
baseProvider Provider,
querier querier.Querier,
logger *slog.Logger,
) *MLProvider {
if logger == nil {
logger = slog.Default()
}

return &MLProvider{
baseProvider: baseProvider,
querier:      querier,
logger:       logger,
}
}

func (provider *MLProvider) GetAnomalies(
ctx context.Context,
orgID valuer.UUID,
request *AnomaliesRequest,
) (*AnomaliesResponse, error) {
if request == nil {
return nil, fmt.Errorf("anomalies request is required")
}

if request.Params == nil {
return nil, fmt.Errorf("anomaly query parameters are required")
}

if provider.baseProvider == nil {
return nil, fmt.Errorf("base anomaly provider is required")
}

provider.logger.InfoContext(
ctx,
"running ML anomaly provider",
slog.String("ml.implementation", "zscore_stub"),
slog.String("ml.seasonality", request.Seasonality.StringValue()),
)

requestCopy := *request

response, err := provider.baseProvider.GetAnomalies(
ctx,
orgID,
&requestCopy,
)
if err != nil {
return nil, fmt.Errorf("run base anomaly provider: %w", err)
}

return response, nil
}

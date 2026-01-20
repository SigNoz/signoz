package anomaly

import (
	"context"

	"github.com/SigNoz/signoz/pkg/valuer"
)

type Provider interface {
	GetAnomalies(ctx context.Context, orgID valuer.UUID, req *AnomaliesRequest) (*AnomaliesResponse, error)
}

package anomaly

import (
	"context"
)

type Provider interface {
	GetAnomalies(ctx context.Context, req *GetAnomaliesRequest) (*GetAnomaliesResponse, error)
}

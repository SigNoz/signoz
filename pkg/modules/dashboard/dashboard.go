package dashboard

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/types"
)

type Module interface {
	Create(ctx context.Context, orgID string, email string, data map[string]interface{}) (*types.Dashboard, error)

	List(ctx context.Context, orgID string) ([]*types.Dashboard, error)

	Delete(ctx context.Context, orgID, uuid string) error

	Get(ctx context.Context, orgID, uuid string) (*types.Dashboard, error)

	GetByMetricNames(ctx context.Context, orgID string, metricNames []string) (map[string][]map[string]string, error)

	Update(ctx context.Context, orgID, userEmail, uuid string, data map[string]interface{}) (*types.Dashboard, error)

	LockUnlock(ctx context.Context, orgID, uuid string, lock bool) error
}

type Handler interface {
	Delete(http.ResponseWriter, *http.Request)
}

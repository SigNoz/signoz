package dashboard

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Module interface {
	Create(ctx context.Context, orgID valuer.UUID, data *dashboardtypes.Dashboard) error

	List(ctx context.Context, orgID valuer.UUID) ([]*dashboardtypes.Dashboard, error)

	Delete(ctx context.Context, orgID valuer.UUID, id valuer.UUID) error

	Get(ctx context.Context, orgID valuer.UUID, id valuer.UUID) (*dashboardtypes.Dashboard, error)

	GetByMetricNames(ctx context.Context, orgID valuer.UUID, metricNames []string) (map[string][]map[string]string, error)

	Update(ctx context.Context, orgID valuer.UUID, data *dashboardtypes.Dashboard) error

	LockUnlock(ctx context.Context, orgID valuer.UUID, uuid valuer.UUID, lock bool) error
}

type Handler interface {
	Create(http.ResponseWriter, *http.Request)
	Get(http.ResponseWriter, *http.Request)
	GetAll(http.ResponseWriter, *http.Request)
	Update(http.ResponseWriter, *http.Request)
	Delete(http.ResponseWriter, *http.Request)
}

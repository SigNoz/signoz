package dashboard

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Module interface {
	Create(ctx context.Context, orgID valuer.UUID, createdBy string, data dashboardtypes.PostableDashboard) (*dashboardtypes.Dashboard, error)

	Get(ctx context.Context, orgID valuer.UUID, id string) (*dashboardtypes.Dashboard, error)

	GetAll(ctx context.Context, orgID valuer.UUID) ([]*dashboardtypes.Dashboard, error)

	Update(ctx context.Context, orgID valuer.UUID, id string, updatedBy string, data dashboardtypes.UpdatableDashboard) (*dashboardtypes.Dashboard, error)

	Delete(ctx context.Context, orgID valuer.UUID, id string) error

	GetByMetricNames(ctx context.Context, orgID valuer.UUID, metricNames []string) (map[string][]map[string]string, error)
}

type Handler interface {
	Create(http.ResponseWriter, *http.Request)

	Get(http.ResponseWriter, *http.Request)

	GetAll(http.ResponseWriter, *http.Request)

	Update(http.ResponseWriter, *http.Request)

	Delete(http.ResponseWriter, *http.Request)
}

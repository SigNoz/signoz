package dashboard

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/statsreporter"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Module interface {
	Create(ctx context.Context, orgID valuer.UUID, createdBy string, creator valuer.UUID, data dashboardtypes.PostableDashboard) (*dashboardtypes.Dashboard, error)

	Get(ctx context.Context, orgID valuer.UUID, id valuer.UUID) (*dashboardtypes.Dashboard, error)

	List(ctx context.Context, orgID valuer.UUID) ([]*dashboardtypes.Dashboard, error)

	Update(ctx context.Context, orgID valuer.UUID, id valuer.UUID, updatedBy string, data dashboardtypes.UpdatableDashboard) (*dashboardtypes.Dashboard, error)

	LockUnlock(ctx context.Context, orgID valuer.UUID, id valuer.UUID, updatedBy string, lock bool) error

	Delete(ctx context.Context, orgID valuer.UUID, id valuer.UUID) error

	GetByMetricNames(ctx context.Context, orgID valuer.UUID, metricNames []string) (map[string][]map[string]string, error)

	statsreporter.StatsCollector
}

type Handler interface {
	Create(http.ResponseWriter, *http.Request)

	Update(http.ResponseWriter, *http.Request)

	LockUnlock(http.ResponseWriter, *http.Request)

	Delete(http.ResponseWriter, *http.Request)
}

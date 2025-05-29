package dashboard

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Module interface {
	Create(ctx context.Context, data *dashboardtypes.Dashboard) error

	Get(ctx context.Context, orgID valuer.UUID, id valuer.UUID) (*dashboardtypes.Dashboard, error)

	GetAll(ctx context.Context, orgID valuer.UUID) ([]*dashboardtypes.Dashboard, error)

	Update(ctx context.Context, orgID valuer.UUID, data *dashboardtypes.Dashboard) error

	Delete(ctx context.Context, orgID valuer.UUID, id valuer.UUID) error

	// check the need for these two
	GetByMetricNames(ctx context.Context, orgID valuer.UUID, metricNames []string) (map[string][]map[string]string, error)

	// this might have been present separately due to requirement in EE codebase but it's anyways not behind license so doesn't make sense.
	LockUnlock(ctx context.Context, orgID valuer.UUID, uuid valuer.UUID, lock bool) error
}

type Handler interface {
	Create(http.ResponseWriter, *http.Request)

	Get(http.ResponseWriter, *http.Request)

	GetAll(http.ResponseWriter, *http.Request)

	Update(http.ResponseWriter, *http.Request)

	Delete(http.ResponseWriter, *http.Request)
}

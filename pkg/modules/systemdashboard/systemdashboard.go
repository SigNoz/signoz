package systemdashboard

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Module interface {
	Get(ctx context.Context, orgID valuer.UUID, source dashboardtypes.Source) (*dashboardtypes.Dashboard, error)
	Update(ctx context.Context, orgID valuer.UUID, source dashboardtypes.Source, dashboard *dashboardtypes.Dashboard) (*dashboardtypes.Dashboard, error)
	Reset(ctx context.Context, orgID valuer.UUID, source dashboardtypes.Source) (*dashboardtypes.Dashboard, error)
	SetDefaultConfig(ctx context.Context, orgID valuer.UUID) error
}

// Handler defines the HTTP handler interface for system dashboard endpoints.
// /api/v1/system/{source}       — Get / Update
// /api/v1/system/{source}/reset — Reset.
type Handler interface {
	Get(http.ResponseWriter, *http.Request)
	Update(http.ResponseWriter, *http.Request)
	Reset(http.ResponseWriter, *http.Request)
}

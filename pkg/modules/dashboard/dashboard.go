package dashboard

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/modules/role"
	"github.com/SigNoz/signoz/pkg/statsreporter"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Module interface {
	// enables public sharing for dashboard.
	CreatePublic(context.Context, valuer.UUID, *dashboardtypes.PublicDashboard) error

	// gets the config for public sharing by org_id and dashboard_id.
	GetPublic(context.Context, valuer.UUID, valuer.UUID) (*dashboardtypes.PublicDashboard, error)

	// get the dashboard data by public dashboard id
	GetDashboardByPublicID(context.Context, valuer.UUID) (*dashboardtypes.Dashboard, error)

	// gets the org for the given public dashboard
	GetPublicDashboardOrgAndSelectors(ctx context.Context, id valuer.UUID, orgs []*types.Organization) ([]authtypes.Selector, valuer.UUID, error)

	// updates the config for public sharing.
	UpdatePublic(context.Context, *dashboardtypes.PublicDashboard) error

	// disables the public sharing for the dashboard.
	DeletePublic(context.Context, valuer.UUID, valuer.UUID) error

	Create(ctx context.Context, orgID valuer.UUID, createdBy string, creator valuer.UUID, data dashboardtypes.PostableDashboard) (*dashboardtypes.Dashboard, error)

	Get(ctx context.Context, orgID valuer.UUID, id valuer.UUID) (*dashboardtypes.Dashboard, error)

	List(ctx context.Context, orgID valuer.UUID) ([]*dashboardtypes.Dashboard, error)

	Update(ctx context.Context, orgID valuer.UUID, id valuer.UUID, updatedBy string, data dashboardtypes.UpdatableDashboard, diff int) (*dashboardtypes.Dashboard, error)

	LockUnlock(ctx context.Context, orgID valuer.UUID, id valuer.UUID, updatedBy string, role types.Role, lock bool) error

	Delete(ctx context.Context, orgID valuer.UUID, id valuer.UUID) error

	GetByMetricNames(ctx context.Context, orgID valuer.UUID, metricNames []string) (map[string][]map[string]string, error)

	statsreporter.StatsCollector

	role.RegisterTypeable
}

type Handler interface {
	CreatePublic(http.ResponseWriter, *http.Request)

	GetPublic(http.ResponseWriter, *http.Request)

	GetPublicData(http.ResponseWriter, *http.Request)

	GetPublicWidgetQueryRange(http.ResponseWriter, *http.Request)

	UpdatePublic(http.ResponseWriter, *http.Request)

	DeletePublic(http.ResponseWriter, *http.Request)

	Create(http.ResponseWriter, *http.Request)

	Update(http.ResponseWriter, *http.Request)

	LockUnlock(http.ResponseWriter, *http.Request)

	Delete(http.ResponseWriter, *http.Request)
}

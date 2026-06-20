package dashboard

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/statsreporter"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	"github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Module interface {
	// creates public sharing config and enables public sharing for the dashboard
	CreatePublic(context.Context, valuer.UUID, *dashboardtypes.PublicDashboard) error

	// gets the public sharing config for the dashboard
	GetPublic(context.Context, valuer.UUID, valuer.UUID) (*dashboardtypes.PublicDashboard, error)

	// get the dashboard data by public dashboard id
	GetDashboardByPublicID(context.Context, valuer.UUID) (*dashboardtypes.Dashboard, error)

	// gets the query results by widget index and public shared id for a dashboard
	GetPublicWidgetQueryRange(context.Context, valuer.UUID, uint64, uint64, uint64) (*querybuildertypesv5.QueryRangeResponse, error)

	// gets the selectors and org for the given public dashboard
	GetPublicDashboardSelectorsAndOrg(context.Context, valuer.UUID, []*types.Organization) ([]coretypes.Selector, valuer.UUID, error)

	// updates the public sharing config for a dashboard
	UpdatePublic(context.Context, valuer.UUID, *dashboardtypes.PublicDashboard) error

	// deletes the public sharing config and disables public sharing for the dashboard
	DeletePublic(context.Context, valuer.UUID, valuer.UUID) error

	Create(ctx context.Context, orgID valuer.UUID, createdBy string, creator valuer.UUID, source dashboardtypes.Source, data dashboardtypes.PostableDashboard) (*dashboardtypes.Dashboard, error)

	Get(ctx context.Context, orgID valuer.UUID, id valuer.UUID) (*dashboardtypes.Dashboard, error)

	List(ctx context.Context, orgID valuer.UUID) ([]*dashboardtypes.Dashboard, error)

	Update(ctx context.Context, orgID valuer.UUID, id valuer.UUID, updatedBy string, data dashboardtypes.UpdatableDashboard, diff int) (*dashboardtypes.Dashboard, error)

	LockUnlock(ctx context.Context, orgID valuer.UUID, id valuer.UUID, updatedBy string, isAdmin bool, lock bool) error

	Delete(ctx context.Context, orgID valuer.UUID, id valuer.UUID) error

	// DeleteUnsafe deletes a dashboard bypassing the guards. Intended for internal system callers.
	DeleteUnsafe(ctx context.Context, orgID valuer.UUID, id valuer.UUID) error

	GetByMetricNames(ctx context.Context, orgID valuer.UUID, metricNames []string) (map[string][]map[string]string, error)

	statsreporter.StatsCollector

	// ════════════════════════════════════════════════════════════════════════
	// v2 dashboard methods
	// ════════════════════════════════════════════════════════════════════════

	CreateV2(ctx context.Context, orgID valuer.UUID, createdBy string, creator valuer.UUID, source dashboardtypes.Source, postable dashboardtypes.PostableDashboardV2) (*dashboardtypes.DashboardV2, error)

	CloneV2(ctx context.Context, orgID valuer.UUID, createdBy string, creator valuer.UUID, id valuer.UUID) (*dashboardtypes.DashboardV2, error)

	GetV2(ctx context.Context, orgID valuer.UUID, id valuer.UUID) (*dashboardtypes.DashboardV2, error)

	ListV2(ctx context.Context, orgID valuer.UUID, params *dashboardtypes.ListDashboardsV2Params) (*dashboardtypes.ListableDashboardV2, error)

	ListForUserV2(ctx context.Context, orgID valuer.UUID, userID valuer.UUID, params *dashboardtypes.ListDashboardsV2Params) (*dashboardtypes.ListableDashboardForUserV2, error)

	UpdateV2(ctx context.Context, orgID valuer.UUID, id valuer.UUID, updatedBy string, updatable dashboardtypes.UpdatableDashboardV2) (*dashboardtypes.DashboardV2, error)

	LockUnlockV2(ctx context.Context, orgID valuer.UUID, id valuer.UUID, updatedBy string, isAdmin bool, lock bool) error

	PatchV2(ctx context.Context, orgID valuer.UUID, id valuer.UUID, updatedBy string, patch dashboardtypes.PatchableDashboardV2) (*dashboardtypes.DashboardV2, error)

	PinV2(ctx context.Context, orgID valuer.UUID, userID valuer.UUID, id valuer.UUID) error

	UnpinV2(ctx context.Context, orgID valuer.UUID, userID valuer.UUID, id valuer.UUID) error

	DeleteV2(ctx context.Context, orgID valuer.UUID, id valuer.UUID) error

	DeletePreferencesForUser(ctx context.Context, orgID valuer.UUID, userID valuer.UUID) error

	CreateView(ctx context.Context, orgID valuer.UUID, postable dashboardtypes.PostableDashboardView) (*dashboardtypes.DashboardView, error)

	ListViews(ctx context.Context, orgID valuer.UUID) (*dashboardtypes.ListableDashboardView, error)

	UpdateView(ctx context.Context, orgID valuer.UUID, id valuer.UUID, updateable dashboardtypes.UpdatableDashboardView) (*dashboardtypes.DashboardView, error)

	DeleteView(ctx context.Context, orgID valuer.UUID, id valuer.UUID) error
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

	// ════════════════════════════════════════════════════════════════════════
	// v2 dashboard methods
	// ════════════════════════════════════════════════════════════════════════
	CreateV2(http.ResponseWriter, *http.Request)

	CloneV2(http.ResponseWriter, *http.Request)

	GetV2(http.ResponseWriter, *http.Request)

	ListV2(http.ResponseWriter, *http.Request)

	ListForUserV2(http.ResponseWriter, *http.Request)

	UpdateV2(http.ResponseWriter, *http.Request)

	LockV2(http.ResponseWriter, *http.Request)

	UnlockV2(http.ResponseWriter, *http.Request)

	PatchV2(http.ResponseWriter, *http.Request)

	PinV2(http.ResponseWriter, *http.Request)

	UnpinV2(http.ResponseWriter, *http.Request)

	DeleteV2(http.ResponseWriter, *http.Request)

	CreateView(http.ResponseWriter, *http.Request)

	ListViews(http.ResponseWriter, *http.Request)

	UpdateView(http.ResponseWriter, *http.Request)

	DeleteView(http.ResponseWriter, *http.Request)
}

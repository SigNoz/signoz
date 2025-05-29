package impldashboard

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/modules/dashboard"
	"github.com/SigNoz/signoz/pkg/query-service/app/cloudintegrations"
	"github.com/SigNoz/signoz/pkg/query-service/app/integrations"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/gorilla/mux"
)

type handler struct {
	module   dashboard.Module
	settings factory.ScopedProviderSettings

	// TODO we need to move DIs from pointers of structs to interfaces
	integrationsController      *integrations.Controller
	cloudIntegrationsController *cloudintegrations.Controller
}

func NewHandler(module dashboard.Module, settings factory.ProviderSettings, integrationsController *integrations.Controller, cloudIntegrationsController *cloudintegrations.Controller) dashboard.Handler {
	scopedProviderSettings := factory.NewScopedProviderSettings(settings, "github.com/SigNoz/signoz/pkg/modules/impldashboard")
	return &handler{module: module, settings: scopedProviderSettings, integrationsController: integrationsController, cloudIntegrationsController: cloudIntegrationsController}
}

func (handler *handler) Create(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(rw, err)
		return
	}

	req := dashboardtypes.PostableDashboard{}
	err = json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		render.Error(rw, err)
		return
	}

	dashboard, err := dashboardtypes.NewDashboard(orgID, claims.Email, req)
	if err != nil {
		render.Error(rw, err)
		return
	}

	err = handler.module.Create(ctx, dashboard)
	if err != nil {
		render.Error(rw, err)
		return
	}

	gettableDashboard, err := dashboardtypes.NewGettableDashboardFromDashboard(dashboard)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusCreated, gettableDashboard)
}

func (handler *handler) Get(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(rw, err)
		return
	}

	idStr := mux.Vars(r)["id"]
	dashboardID, err := valuer.NewUUID(idStr)
	if err != nil {
		render.Error(rw, err)
		return
	}

	dashboard, err := handler.module.Get(ctx, orgID, dashboardID)
	if err != nil {
		if !errors.Ast(err, errors.TypeNotFound) {
			render.Error(rw, err)
			return
		}
		if handler.cloudIntegrationsController.IsCloudIntegrationDashboardUuid(idStr) {
			_dashboard, apiErr := handler.cloudIntegrationsController.GetDashboardById(r.Context(), orgID, idStr)
			if apiErr != nil {
				render.Error(rw, apiErr)
				return
			}
			dashboard = _dashboard
		} else {
			_dashboard, apiErr := handler.integrationsController.GetInstalledIntegrationDashboardById(r.Context(), orgID, idStr)
			if apiErr != nil {
				render.Error(rw, apiErr)
				return
			}
			dashboard = _dashboard
		}
	}
	gettableDashboard, err := dashboardtypes.NewGettableDashboardFromDashboard(dashboard)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, gettableDashboard)
}

func (handler *handler) GetAll(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(rw, err)
		return
	}

	dashboards, err := handler.module.GetAll(ctx, orgID)
	if err != nil {
		render.Error(rw, err)
		return
	}

	installedIntegrationDashboards, apiErr := handler.integrationsController.GetDashboardsForInstalledIntegrations(r.Context(), orgID)
	if apiErr != nil {
		handler.settings.Logger().ErrorContext(ctx, "failed to get dashboards for installed integrations", "error", apiErr)
	} else {
		dashboards = append(dashboards, installedIntegrationDashboards...)
	}

	cloudIntegrationDashboards, apiErr := handler.cloudIntegrationsController.AvailableDashboards(r.Context(), orgID)
	if apiErr != nil {
		handler.settings.Logger().ErrorContext(ctx, "failed to get cloud dashboards", "error", apiErr)
	} else {
		dashboards = append(dashboards, cloudIntegrationDashboards...)
	}

	tagsFromReq, ok := r.URL.Query()["tags"]
	if !ok || len(tagsFromReq) == 0 || tagsFromReq[0] == "" {
		render.Success(rw, http.StatusOK, dashboards)
		return
	}

	tags2Dash := make(map[string][]int)
	for i := 0; i < len(dashboards); i++ {
		tags, ok := (dashboards)[i].Data["tags"].([]interface{})
		if !ok {
			continue
		}

		tagsArray := make([]string, len(tags))
		for i, v := range tags {
			tagsArray[i] = v.(string)
		}

		for _, tag := range tagsArray {
			tags2Dash[tag] = append(tags2Dash[tag], i)
		}

	}

	inter := make([]int, len(dashboards))
	for i := range inter {
		inter[i] = i
	}

	for _, tag := range tagsFromReq {
		inter = dashboardtypes.Intersection(inter, tags2Dash[tag])
	}

	filteredDashboards := []*dashboardtypes.Dashboard{}
	for _, val := range inter {
		dash := (dashboards)[val]
		filteredDashboards = append(filteredDashboards, dash)
	}

	gettableDashboards, err := dashboardtypes.NewGettableDashboardsFromDashboards(filteredDashboards)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, gettableDashboards)
}

func (handler *handler) Update(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(rw, err)
		return
	}

	idStr := mux.Vars(r)["id"]
	dashboardID, err := valuer.NewUUID(idStr)
	if err != nil {
		render.Error(rw, err)
		return
	}

	req := new(dashboardtypes.UpdatableDashboard)
	err = json.NewDecoder(r.Body).Decode(req)
	if err != nil {
		render.Error(rw, err)
		return
	}

	dashboard, err := handler.module.Get(ctx, orgID, dashboardID)
	if err != nil {
		render.Error(rw, err)
		return
	}

	err = dashboard.Update(req)
	if err != nil {
		render.Error(rw, err)
		return
	}

	err = handler.module.Update(ctx, dashboard)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusAccepted, dashboard)
}

func (handler *handler) Delete(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}
	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(rw, err)
		return
	}

	idStr := mux.Vars(r)["id"]
	dashboardID, err := valuer.NewUUID(idStr)
	if err != nil {
		render.Error(rw, err)
		return
	}

	err = handler.module.Delete(ctx, orgID, dashboardID)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, nil)
}

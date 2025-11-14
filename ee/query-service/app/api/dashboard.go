package api

import (
	"context"
	"net/http"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/binding"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/gorilla/mux"
)

func (aH *APIHandler) CreatePublicDashboard(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	_, err = aH.Signoz.Licensing.GetActive(ctx, valuer.MustNewUUID(claims.OrgID))
	if err != nil {
		render.Error(rw, errors.New(errors.TypeLicenseUnavailable, errors.CodeLicenseUnavailable, "a valid license is not available").WithAdditional("this feature requires a valid license").WithAdditional(err.Error()))
	}

	id := mux.Vars(r)["id"]
	if id == "" {
		render.Error(rw, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "id is missing in the path"))
		return
	}

	_, err = aH.getDashboard(ctx, valuer.MustNewUUID(claims.OrgID), id)
	if err != nil {
		render.Error(rw, err)
		return
	}

	req := new(dashboardtypes.PostablePublicDashboard)
	if err := binding.JSON.BindBody(r.Body, req); err != nil {
		render.Error(rw, err)
		return
	}

	publicDashboard := dashboardtypes.NewPublicDashboard(req.TimeRangeEnabled, id, valuer.MustNewUUID(claims.OrgID))
	err = aH.Signoz.Modules.Dashboard.CreatePublic(ctx, publicDashboard)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusCreated, nil)
}

func (aH *APIHandler) GetPublicDashboard(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	_, err = aH.Signoz.Licensing.GetActive(ctx, valuer.MustNewUUID(claims.OrgID))
	if err != nil {
		render.Error(rw, errors.New(errors.TypeLicenseUnavailable, errors.CodeLicenseUnavailable, "a valid license is not available").WithAdditional("this feature requires a valid license").WithAdditional(err.Error()))
	}

	id, ok := mux.Vars(r)["id"]
	if !ok {
		render.Error(rw, errors.New(errors.TypeInvalidInput, dashboardtypes.ErrCodeDashboardInvalidInput, "id is missing in path"))
		return
	}

	_, err = aH.getDashboard(ctx, valuer.MustNewUUID(claims.OrgID), id)
	if err != nil {
		render.Error(rw, err)
		return
	}

	publicDashboard, err := aH.Signoz.Modules.Dashboard.GetPublic(ctx, valuer.MustNewUUID(claims.OrgID), id)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, publicDashboard)
}

func (aH *APIHandler) UpdatePublicDashboard(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	_, err = aH.Signoz.Licensing.GetActive(ctx, valuer.MustNewUUID(claims.OrgID))
	if err != nil {
		render.Error(rw, errors.New(errors.TypeLicenseUnavailable, errors.CodeLicenseUnavailable, "a valid license is not available").WithAdditional("this feature requires a valid license").WithAdditional(err.Error()))
	}

	id, ok := mux.Vars(r)["id"]
	if !ok {
		render.Error(rw, errors.New(errors.TypeInvalidInput, dashboardtypes.ErrCodeDashboardInvalidInput, "id is missing in path"))
		return
	}

	_, err = aH.getDashboard(ctx, valuer.MustNewUUID(claims.OrgID), id)
	if err != nil {
		render.Error(rw, err)
		return
	}

	req := new(dashboardtypes.UpdatablePublicDashboard)
	if err := binding.JSON.BindBody(r.Body, req); err != nil {
		render.Error(rw, err)
		return
	}

	publicDashboard, err := aH.Signoz.Modules.Dashboard.GetPublic(ctx, valuer.MustNewUUID(claims.OrgID), id)
	if err != nil {
		render.Error(rw, err)
		return
	}

	publicDashboard.Update(req.TimeRangeEnabled)
	err = aH.Signoz.Modules.Dashboard.UpdatePublic(ctx, publicDashboard)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusNoContent, nil)
}

func (aH *APIHandler) DeletePublicDashboard(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	_, err = aH.Signoz.Licensing.GetActive(ctx, valuer.MustNewUUID(claims.OrgID))
	if err != nil {
		render.Error(rw, errors.New(errors.TypeLicenseUnavailable, errors.CodeLicenseUnavailable, "a valid license is not available").WithAdditional("this feature requires a valid license").WithAdditional(err.Error()))
	}

	id, ok := mux.Vars(r)["id"]
	if !ok {
		render.Error(rw, errors.New(errors.TypeInvalidInput, dashboardtypes.ErrCodeDashboardInvalidInput, "id is missing in path"))
		return
	}

	_, err = aH.getDashboard(ctx, valuer.MustNewUUID(claims.OrgID), id)
	if err != nil {
		render.Error(rw, err)
		return
	}

	err = aH.Signoz.Modules.Dashboard.DeletePublic(ctx, valuer.MustNewUUID(claims.OrgID), id)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusNoContent, nil)
}

func (aH *APIHandler) GetPublicDashboardData(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	orgs, err := aH.Signoz.Modules.OrgGetter.ListByOwnedKeyRange(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	id, ok := mux.Vars(r)["id"]
	if !ok {
		render.Error(rw, errors.New(errors.TypeInvalidInput, dashboardtypes.ErrCodeDashboardInvalidInput, "id is missing in path"))
		return
	}

	publicDashboard, err := aH.Signoz.Modules.Dashboard.GetPublicByOrgsAndId(ctx, orgs, id)
	if err != nil {
		render.Error(rw, err)
		return
	}

	dashboard, err := aH.getDashboard(ctx, publicDashboard.OrgID, publicDashboard.DashboardID)
	if err != nil {
		render.Error(rw, err)
		return
	}

	dashboard.MaskForPublicSharing()
	render.Success(rw, http.StatusOK, dashboard)
}

func (aH *APIHandler) GetPublicDashboardWidgetQueryRange(rw http.ResponseWriter, r *http.Request) {}

func (aH *APIHandler) getDashboard(ctx context.Context, orgID valuer.UUID, id string) (*dashboardtypes.Dashboard, error) {
	dashboard := new(dashboardtypes.Dashboard)
	if aH.CloudIntegrationsController.IsCloudIntegrationDashboardUuid(id) {
		cloudintegrationDashboard, apiErr := aH.CloudIntegrationsController.GetDashboardById(ctx, orgID, id)
		if apiErr != nil {
			// figure out how to throw the correct error here!
			return nil, errors.Wrapf(apiErr, errors.TypeInternal, errors.CodeInternal, "failed to get dashboard")
		}
		dashboard = cloudintegrationDashboard
	} else if aH.IntegrationsController.IsInstalledIntegrationDashboardID(id) {
		integrationDashboard, apiErr := aH.IntegrationsController.GetInstalledIntegrationDashboardById(ctx, orgID, id)
		if apiErr != nil {
			// figure out how to throw the correct error here!
			return nil, errors.Wrapf(apiErr, errors.TypeInternal, errors.CodeInternal, "failed to get dashboard")
		}
		dashboard = integrationDashboard
	} else {
		dashboardID, err := valuer.NewUUID(id)
		if err != nil {
			return nil, err
		}
		sqlDashboard, err := aH.Signoz.Modules.Dashboard.Get(ctx, orgID, dashboardID)
		if err != nil {
			return nil, err
		}
		dashboard = sqlDashboard
	}

	return dashboard, nil
}

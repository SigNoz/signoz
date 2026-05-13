package signozapiserver

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	"github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/gorilla/mux"
)

func (provider *provider) addDashboardRoutes(router *mux.Router) error {
	if err := router.Handle("/api/v2/dashboards", handler.New(provider.authzMiddleware.ViewAccess(provider.dashboardHandler.ListV2), handler.OpenAPIDef{
		ID:                  "ListDashboardsV2",
		Tags:                []string{"dashboard"},
		Summary:             "List dashboards (v2)",
		Description:         "Returns a page of v2-shape dashboards for the calling user's org. Supports a filter DSL (`query`), sort (`updated_at`/`created_at`/`title`), order (`asc`/`desc`), and offset-based pagination (`limit`/`offset`). Pinned dashboards float to the top of each page.",
		Request:             nil,
		RequestContentType:  "",
		Response:            new(dashboardtypes.ListableDashboardV2),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleViewer),
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/dashboards", handler.New(provider.authzMiddleware.EditAccess(provider.dashboardHandler.CreateV2), handler.OpenAPIDef{
		ID:                  "CreateDashboardV2",
		Tags:                []string{"dashboard"},
		Summary:             "Create dashboard (v2)",
		Description:         "This endpoint creates a v2-shape dashboard with structured metadata, a typed data tree, and resolved tags.",
		Request:             new(dashboardtypes.PostableDashboardV2),
		RequestContentType:  "application/json",
		Response:            new(dashboardtypes.GettableDashboardV2),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusCreated,
		ErrorStatusCodes:    []int{},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleEditor),
	})).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/dashboards/{id}", handler.New(provider.authzMiddleware.ViewAccess(provider.dashboardHandler.GetV2), handler.OpenAPIDef{
		ID:                  "GetDashboardV2",
		Tags:                []string{"dashboard"},
		Summary:             "Get dashboard (v2)",
		Description:         "This endpoint returns a v2-shape dashboard with its tags and public sharing config (if any).",
		Request:             nil,
		RequestContentType:  "",
		Response:            new(dashboardtypes.GettableDashboardV2),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleViewer),
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/dashboards/{id}", handler.New(provider.authzMiddleware.EditAccess(provider.dashboardHandler.UpdateV2), handler.OpenAPIDef{
		ID:                  "UpdateDashboardV2",
		Tags:                []string{"dashboard"},
		Summary:             "Update dashboard (v2)",
		Description:         "This endpoint updates a v2-shape dashboard's metadata, data, and tag set. Locked dashboards are rejected.",
		Request:             new(dashboardtypes.UpdateableDashboardV2),
		RequestContentType:  "application/json",
		Response:            new(dashboardtypes.GettableDashboardV2),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleEditor),
	})).Methods(http.MethodPut).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/dashboards/{id}", handler.New(provider.authzMiddleware.EditAccess(provider.dashboardHandler.PatchV2), handler.OpenAPIDef{
		ID:          "PatchDashboardV2",
		Tags:        []string{"dashboard"},
		Summary:     "Patch dashboard (v2)",
		Description: "This endpoint applies an RFC 6902 JSON Patch to a v2-shape dashboard. The patch is applied against the postable view of the dashboard (metadata, data, tags), so individual panels, queries, variables, layouts, or tags can be updated without re-sending the rest of the dashboard. Locked dashboards are rejected.",
		Request:     new(dashboardtypes.JSONPatchDocument),
		// Strictly per RFC 6902 the content type is `application/json-patch+json`,
		// but our OpenAPI generator only reflects schemas for content types it
		// understands (application/json, form-urlencoded, multipart) — anything
		// else degrades to `type: string`. Declaring application/json here keeps
		// the array-of-ops schema visible to spec consumers; the runtime decoder
		// parses JSON regardless of the request's actual Content-Type header.
		RequestContentType:  "application/json",
		Response:            new(dashboardtypes.GettableDashboardV2),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleEditor),
	})).Methods(http.MethodPatch).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/dashboards/{id}", handler.New(provider.authzMiddleware.EditAccess(provider.dashboardHandler.DeleteV2), handler.OpenAPIDef{
		ID:                  "DeleteDashboardV2",
		Tags:                []string{"dashboard"},
		Summary:             "Delete dashboard (v2)",
		Description:         "This endpoint deletes a v2-shape dashboard along with its tag relations. Locked dashboards are rejected.",
		Request:             nil,
		RequestContentType:  "",
		Response:            nil,
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusNoContent,
		ErrorStatusCodes:    []int{},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleEditor),
	})).Methods(http.MethodDelete).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/dashboards/{id}/lock", handler.New(provider.authzMiddleware.EditAccess(provider.dashboardHandler.LockV2), handler.OpenAPIDef{
		ID:                  "LockDashboardV2",
		Tags:                []string{"dashboard"},
		Summary:             "Lock dashboard (v2)",
		Description:         "This endpoint locks a v2-shape dashboard. Only the dashboard's creator or an org admin may lock or unlock.",
		Request:             nil,
		RequestContentType:  "",
		Response:            nil,
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusNoContent,
		ErrorStatusCodes:    []int{},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleEditor),
	})).Methods(http.MethodPut).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/dashboards/{id}/lock", handler.New(provider.authzMiddleware.EditAccess(provider.dashboardHandler.UnlockV2), handler.OpenAPIDef{
		ID:                  "UnlockDashboardV2",
		Tags:                []string{"dashboard"},
		Summary:             "Unlock dashboard (v2)",
		Description:         "This endpoint unlocks a v2-shape dashboard. Only the dashboard's creator or an org admin may lock or unlock.",
		Request:             nil,
		RequestContentType:  "",
		Response:            nil,
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusNoContent,
		ErrorStatusCodes:    []int{},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleEditor),
	})).Methods(http.MethodDelete).GetError(); err != nil {
		return err
	}

	// ViewAccess: pinning only mutates the calling user's pin list, not the
	// dashboard itself — anyone who can view a dashboard can bookmark it.
	if err := router.Handle("/api/v2/dashboards/{id}/pins/me", handler.New(provider.authzMiddleware.ViewAccess(provider.dashboardHandler.PinV2), handler.OpenAPIDef{
		ID:                  "PinDashboardV2",
		Tags:                []string{"dashboard"},
		Summary:             "Pin a dashboard for the current user (v2)",
		Description:         "Pins the dashboard for the calling user. A user can pin at most 10 dashboards; pinning when at the limit returns 409. Re-pinning an already-pinned dashboard is a no-op success.",
		Request:             nil,
		RequestContentType:  "",
		Response:            nil,
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusNoContent,
		ErrorStatusCodes:    []int{},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleViewer),
	})).Methods(http.MethodPut).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/dashboards/{id}/pins/me", handler.New(provider.authzMiddleware.ViewAccess(provider.dashboardHandler.UnpinV2), handler.OpenAPIDef{
		ID:                  "UnpinDashboardV2",
		Tags:                []string{"dashboard"},
		Summary:             "Unpin a dashboard for the current user (v2)",
		Description:         "Removes the pin for the calling user. Idempotent — unpinning a dashboard that wasn't pinned still returns 204.",
		Request:             nil,
		RequestContentType:  "",
		Response:            nil,
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusNoContent,
		ErrorStatusCodes:    []int{},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleViewer),
	})).Methods(http.MethodDelete).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/dashboards/{id}/public", handler.New(provider.authzMiddleware.AdminAccess(provider.dashboardHandler.CreatePublicV2), handler.OpenAPIDef{
		ID:                  "CreatePublicDashboardV2",
		Tags:                []string{"dashboard"},
		Summary:             "Make a dashboard v2 public",
		Description:         "This endpoint creates the public sharing config for a v2 dashboard and returns the dashboard with the new public config attached. Lock state does not gate this endpoint.",
		Request:             new(dashboardtypes.PostablePublicDashboard),
		RequestContentType:  "application/json",
		Response:            new(dashboardtypes.GettableDashboardV2),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
	})).Methods(http.MethodPatch).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/dashboards/{id}/public", handler.New(provider.authzMiddleware.AdminAccess(provider.dashboardHandler.UpdatePublicV2), handler.OpenAPIDef{
		ID:                  "UpdatePublicDashboardV2",
		Tags:                []string{"dashboard"},
		Summary:             "Update public sharing config for a dashboard v2",
		Description:         "This endpoint updates the public sharing config (time range settings) of an already-public v2 dashboard. Lock state does not gate this endpoint.",
		Request:             new(dashboardtypes.UpdatablePublicDashboard),
		RequestContentType:  "application/json",
		Response:            new(dashboardtypes.GettableDashboardV2),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
	})).Methods(http.MethodPut).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/dashboards/{id}/public", handler.New(provider.authzMiddleware.AdminAccess(provider.dashboardHandler.CreatePublic), handler.OpenAPIDef{
		ID:                  "CreatePublicDashboard",
		Tags:                []string{"dashboard"},
		Summary:             "Create public dashboard",
		Description:         "This endpoint creates public sharing config and enables public sharing of the dashboard",
		Request:             new(dashboardtypes.PostablePublicDashboard),
		RequestContentType:  "",
		Response:            new(types.Identifiable),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusCreated,
		ErrorStatusCodes:    []int{},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
	})).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/dashboards/{id}/public", handler.New(provider.authzMiddleware.AdminAccess(provider.dashboardHandler.GetPublic), handler.OpenAPIDef{
		ID:                  "GetPublicDashboard",
		Tags:                []string{"dashboard"},
		Summary:             "Get public dashboard",
		Description:         "This endpoint returns public sharing config for a dashboard",
		Request:             nil,
		RequestContentType:  "",
		Response:            new(dashboardtypes.GettablePublicDasbhboard),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/dashboards/{id}/public", handler.New(provider.authzMiddleware.AdminAccess(provider.dashboardHandler.UpdatePublic), handler.OpenAPIDef{
		ID:                  "UpdatePublicDashboard",
		Tags:                []string{"dashboard"},
		Summary:             "Update public dashboard",
		Description:         "This endpoint updates the public sharing config for a dashboard",
		Request:             new(dashboardtypes.UpdatablePublicDashboard),
		RequestContentType:  "",
		Response:            nil,
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusNoContent,
		ErrorStatusCodes:    []int{},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
	})).Methods(http.MethodPut).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/dashboards/{id}/public", handler.New(provider.authzMiddleware.AdminAccess(provider.dashboardHandler.DeletePublic), handler.OpenAPIDef{
		ID:                  "DeletePublicDashboard",
		Tags:                []string{"dashboard"},
		Summary:             "Delete public dashboard",
		Description:         "This endpoint deletes the public sharing config and disables the public sharing of a dashboard",
		Request:             nil,
		RequestContentType:  "",
		Response:            nil,
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusNoContent,
		ErrorStatusCodes:    []int{},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
	})).Methods(http.MethodDelete).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/public/dashboards/{id}", handler.New(provider.authzMiddleware.CheckWithoutClaims(
		provider.dashboardHandler.GetPublicData,
		authtypes.Relation{Verb: coretypes.VerbRead},
		coretypes.ResourceMetaResourcePublicDashboard,
		func(req *http.Request, orgs []*types.Organization) ([]coretypes.Selector, valuer.UUID, error) {
			id, err := valuer.NewUUID(mux.Vars(req)["id"])
			if err != nil {
				return nil, valuer.UUID{}, err
			}

			return provider.dashboardModule.GetPublicDashboardSelectorsAndOrg(req.Context(), id, orgs)
		}, []string{}), handler.OpenAPIDef{
		ID:                  "GetPublicDashboardData",
		Tags:                []string{"dashboard"},
		Summary:             "Get public dashboard data",
		Description:         "This endpoint returns the sanitized dashboard data for public access",
		Request:             nil,
		RequestContentType:  "",
		Response:            new(dashboardtypes.GettablePublicDashboardData),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{},
		Deprecated:          false,
		SecuritySchemes:     newAnonymousSecuritySchemes([]string{coretypes.ResourceMetaResourcePublicDashboard.Scope(coretypes.VerbRead)}),
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/public/dashboards/{id}/widgets/{idx}/query_range", handler.New(provider.authzMiddleware.CheckWithoutClaims(
		provider.dashboardHandler.GetPublicWidgetQueryRange,
		authtypes.Relation{Verb: coretypes.VerbRead},
		coretypes.ResourceMetaResourcePublicDashboard,
		func(req *http.Request, orgs []*types.Organization) ([]coretypes.Selector, valuer.UUID, error) {
			id, err := valuer.NewUUID(mux.Vars(req)["id"])
			if err != nil {
				return nil, valuer.UUID{}, err
			}

			return provider.dashboardModule.GetPublicDashboardSelectorsAndOrg(req.Context(), id, orgs)
		}, []string{}), handler.OpenAPIDef{
		ID:                  "GetPublicDashboardWidgetQueryRange",
		Tags:                []string{"dashboard"},
		Summary:             "Get query range result",
		Description:         "This endpoint return query range results for a widget of public dashboard",
		Request:             nil,
		RequestContentType:  "",
		Response:            new(querybuildertypesv5.QueryRangeResponse),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{},
		Deprecated:          false,
		SecuritySchemes:     newAnonymousSecuritySchemes([]string{coretypes.ResourceMetaResourcePublicDashboard.Scope(coretypes.VerbRead)}),
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	return nil
}

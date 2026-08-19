package signozapiserver

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/types/systemdashboardtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/gorilla/mux"
)

func (provider *provider) addSystemDashboardRoutes(router *mux.Router) error {
	if err := router.Handle("/api/v2/system/dashboards/{name}", handler.New(
		provider.authzMiddleware.CheckResources(provider.systemDashboardHandler.Get, authtypes.SigNozAdminRoleName, authtypes.SigNozEditorRoleName, authtypes.SigNozViewerRoleName),
		handler.OpenAPIDef{
			ID:                  "GetSystemDashboard",
			Tags:                []string{"dashboard"},
			Summary:             "Get system dashboard",
			Description:         "Returns a dashboard SigNoz ships and owns, addressed by its stable name rather than its id. System dashboards are read-only and upgraded through releases. The response is the v2 dashboard plus a `system` object carrying the shipped version this copy was provisioned at, whether a newer version is available, and whether the copy has diverged from what the provisioner wrote.",
			Request:             nil,
			RequestContentType:  "",
			Response:            new(systemdashboardtypes.GettableSystemDashboard),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusNotFound},
			Deprecated:          false,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceDashboard.Scope(coretypes.VerbRead)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceMetaResourceDashboard,
			Verb:     coretypes.VerbRead,
			Category: coretypes.ActionCategoryDataAccess,
			ID:       provider.systemDashboardID(),
			Selector: coretypes.IDSelector,
		}),
	)).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	return nil
}

// systemDashboardID resolves the {name} path param to the dashboard's id. Authz
// tuples and audit records are written against ids, so the name has to be
// resolved before either runs.
func (provider *provider) systemDashboardID() coretypes.ResourceIDExtractor {
	return coretypes.NewResourceIDExtractor(coretypes.PhaseRequest, func(ec coretypes.ExtractorContext) (string, error) {
		ctx := ec.Request.Context()
		claims, err := authtypes.ClaimsFromContext(ctx)
		if err != nil {
			return "", err
		}

		id, err := provider.systemDashboardModule.ResolveID(ctx, valuer.MustNewUUID(claims.OrgID), mux.Vars(ec.Request)["name"])
		if err != nil {
			return "", err
		}

		return id.StringValue(), nil
	})
}

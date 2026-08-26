package signozapiserver

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/types/quickfiltertypes"
	"github.com/gorilla/mux"
)

func (provider *provider) addQuickFilterRoutes(router *mux.Router) error {
	if err := router.Handle("/api/v2/orgs/me/filters", handler.New(
		provider.authzMiddleware.CheckResources(provider.quickFilterHandler.GetQuickFiltersV2, authtypes.SigNozAdminRoleName, authtypes.SigNozEditorRoleName, authtypes.SigNozViewerRoleName),
		handler.OpenAPIDef{
			ID:                  "ListQuickFilters",
			Tags:                []string{"quick_filter"},
			Summary:             "List quick filters",
			Description:         "Returns the org's quick filters for every signal, each filter as a telemetry field key.",
			Request:             nil,
			RequestContentType:  "",
			Response:            new([]*quickfiltertypes.SignalFilters),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusBadRequest},
			Deprecated:          false,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceQuickFilter.Scope(coretypes.VerbList)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceMetaResourceQuickFilter,
			Verb:     coretypes.VerbList,
			Category: coretypes.ActionCategoryDataAccess,
			Selector: coretypes.WildcardSelector,
		}),
	)).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/orgs/me/filters/{signal_name}", handler.New(
		provider.authzMiddleware.CheckResources(provider.quickFilterHandler.GetSignalFiltersV2, authtypes.SigNozAdminRoleName, authtypes.SigNozEditorRoleName, authtypes.SigNozViewerRoleName),
		handler.OpenAPIDef{
			ID:                  "GetSignalQuickFilters",
			Tags:                []string{"quick_filter"},
			Summary:             "Get a signal's quick filters",
			Description:         "Returns the org's quick filters for one signal, each filter as a telemetry field key.",
			Request:             nil,
			RequestContentType:  "",
			Response:            new(quickfiltertypes.SignalFilters),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusBadRequest},
			Deprecated:          false,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceQuickFilter.Scope(coretypes.VerbRead)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceMetaResourceQuickFilter,
			Verb:     coretypes.VerbRead,
			Category: coretypes.ActionCategoryDataAccess,
			Selector: coretypes.WildcardSelector,
		}),
	)).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/orgs/me/filters", handler.New(
		provider.authzMiddleware.CheckResources(provider.quickFilterHandler.UpdateQuickFiltersV2, authtypes.SigNozAdminRoleName),
		handler.OpenAPIDef{
			ID:                  "UpdateQuickFilters",
			Tags:                []string{"quick_filter"},
			Summary:             "Update quick filters",
			Description:         "Replaces the org's quick filters for the signal named in the body.",
			Request:             new(quickfiltertypes.UpdatableQuickFilters),
			RequestContentType:  "application/json",
			Response:            nil,
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusNoContent,
			ErrorStatusCodes:    []int{http.StatusBadRequest},
			Deprecated:          false,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceQuickFilter.Scope(coretypes.VerbUpdate)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceMetaResourceQuickFilter,
			Verb:     coretypes.VerbUpdate,
			Category: coretypes.ActionCategoryConfigurationChange,
			Selector: coretypes.WildcardSelector,
		}),
	)).Methods(http.MethodPut).GetError(); err != nil {
		return err
	}

	return nil
}

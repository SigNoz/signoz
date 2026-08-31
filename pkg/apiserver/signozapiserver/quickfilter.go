package signozapiserver

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/types/quickfiltertypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/gorilla/mux"
)

func (provider *provider) addQuickFilterRoutes(router *mux.Router) error {
	if err := router.Handle("/api/v2/quick_filters", handler.New(
		provider.authzMiddleware.CheckResources(provider.quickFilterHandler.ListQuickFiltersV2, authtypes.SigNozAdminRoleName, authtypes.SigNozEditorRoleName, authtypes.SigNozViewerRoleName),
		handler.OpenAPIDef{
			ID:                  "ListQuickFilters",
			Tags:                []string{"quick_filter"},
			Summary:             "List quick filters",
			Description:         "Returns the org's quick filters for every source, each filter as a telemetry field key.",
			Request:             nil,
			RequestContentType:  "",
			Response:            new([]*quickfiltertypes.SourceFilters),
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

	if err := router.Handle("/api/v2/quick_filters/{source}", handler.New(
		provider.authzMiddleware.CheckResources(provider.quickFilterHandler.GetQuickFiltersV2, authtypes.SigNozAdminRoleName, authtypes.SigNozEditorRoleName, authtypes.SigNozViewerRoleName),
		handler.OpenAPIDef{
			ID:                  "GetQuickFilters",
			Tags:                []string{"quick_filter"},
			Summary:             "Get a source's quick filters",
			Description:         "Returns the org's quick filters for one source, each filter as a telemetry field key.",
			Request:             nil,
			RequestContentType:  "",
			Response:            new(quickfiltertypes.SourceFilters),
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
			ID:       coretypes.PathParam("source"),
			Selector: provider.quickFilterSelector,
		}),
	)).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/quick_filters/{source}", handler.New(
		provider.authzMiddleware.CheckResources(provider.quickFilterHandler.UpdateQuickFiltersV2, authtypes.SigNozAdminRoleName),
		handler.OpenAPIDef{
			ID:                  "UpdateQuickFilters",
			Tags:                []string{"quick_filter"},
			Summary:             "Update quick filters",
			Description:         "Replaces the org's quick filters for the source named in the path.",
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
			ID:       coretypes.PathParam("source"),
			Selector: provider.quickFilterSelector,
		}),
	)).Methods(http.MethodPut).GetError(); err != nil {
		return err
	}

	return nil
}

func (provider *provider) quickFilterSelector(ctx context.Context, resource coretypes.Resource, source string, orgID valuer.UUID) ([]coretypes.Selector, error) {
	validatedSource, err := quickfiltertypes.NewSource(source)
	if err != nil {
		return nil, err
	}

	// A source can have no stored row yet: GET serves it as empty and PUT
	// creates it, so only the wildcard grant applies until the row exists.
	quickFilter, err := provider.quickFilterModule.Get(ctx, orgID, validatedSource)
	if err != nil {
		if errors.Ast(err, errors.TypeNotFound) {
			return []coretypes.Selector{resource.Type().MustSelector(coretypes.WildCardSelectorString)}, nil
		}
		return nil, err
	}

	return []coretypes.Selector{
		resource.Type().MustSelector(quickFilter.ID.StringValue()),
		resource.Type().MustSelector(coretypes.WildCardSelectorString),
	}, nil
}

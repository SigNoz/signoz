package signozapiserver

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/types/savedviewtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/gorilla/mux"
)

func (provider *provider) addSavedViewRoutes(router *mux.Router) error {
	if err := router.Handle("/api/v2/saved_views", handler.New(
		provider.authzMiddleware.CheckResources(provider.savedViewHandler.ListV2, authtypes.SigNozAdminRoleName, authtypes.SigNozEditorRoleName, authtypes.SigNozViewerRoleName),
		handler.OpenAPIDef{
			ID:                  "ListSavedViews",
			Tags:                []string{"saved_view"},
			Summary:             "List saved views",
			Description:         "Returns saved views, optionally filtered by source page and name.",
			Request:             nil,
			RequestQuery:        new(savedviewtypes.ListSavedViewsParams),
			RequestContentType:  "",
			Response:            new([]*savedviewtypes.SavedView),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusBadRequest},
			Deprecated:          false,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceSavedView.Scope(coretypes.VerbList)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceMetaResourceSavedView,
			Verb:     coretypes.VerbList,
			Category: coretypes.ActionCategoryDataAccess,
			Selector: coretypes.WildcardSelector,
		}),
	)).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/saved_views", handler.New(
		provider.authzMiddleware.CheckResources(provider.savedViewHandler.CreateV2, authtypes.SigNozAdminRoleName, authtypes.SigNozEditorRoleName),
		handler.OpenAPIDef{
			ID:                  "CreateSavedView",
			Tags:                []string{"saved_view"},
			Summary:             "Create saved view",
			Description:         "Persists a saved view for the explore page. Returns the id of the created view.",
			Request:             new(savedviewtypes.PostableSavedView),
			RequestContentType:  "application/json",
			Response:            new(valuer.UUID),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusBadRequest},
			Deprecated:          false,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceSavedView.Scope(coretypes.VerbCreate)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceMetaResourceSavedView,
			Verb:     coretypes.VerbCreate,
			Category: coretypes.ActionCategoryDataAccess,
			ID:       coretypes.ResponseJSONPath("data"),
			Selector: coretypes.WildcardSelector,
		}),
	)).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/saved_views/{id}", handler.New(
		provider.authzMiddleware.CheckResources(provider.savedViewHandler.GetV2, authtypes.SigNozAdminRoleName, authtypes.SigNozEditorRoleName, authtypes.SigNozViewerRoleName),
		handler.OpenAPIDef{
			ID:                  "GetSavedView",
			Tags:                []string{"saved_view"},
			Summary:             "Get saved view",
			Description:         "Returns a saved view by id.",
			Request:             nil,
			RequestContentType:  "",
			Response:            new(savedviewtypes.SavedView),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusNotFound},
			Deprecated:          false,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceSavedView.Scope(coretypes.VerbRead)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceMetaResourceSavedView,
			Verb:     coretypes.VerbRead,
			Category: coretypes.ActionCategoryDataAccess,
			ID:       coretypes.PathParam("id"),
			Selector: coretypes.IDSelector,
		}),
	)).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/saved_views/{id}", handler.New(
		provider.authzMiddleware.CheckResources(provider.savedViewHandler.UpdateV2, authtypes.SigNozAdminRoleName, authtypes.SigNozEditorRoleName),
		handler.OpenAPIDef{
			ID:                  "UpdateSavedView",
			Tags:                []string{"saved_view"},
			Summary:             "Update saved view",
			Description:         "Replaces a saved view's name and query.",
			Request:             new(savedviewtypes.UpdatableSavedView),
			RequestContentType:  "application/json",
			Response:            nil,
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusNotFound},
			Deprecated:          false,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceSavedView.Scope(coretypes.VerbUpdate)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceMetaResourceSavedView,
			Verb:     coretypes.VerbUpdate,
			Category: coretypes.ActionCategoryDataAccess,
			ID:       coretypes.PathParam("id"),
			Selector: coretypes.IDSelector,
		}),
	)).Methods(http.MethodPut).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/saved_views/{id}", handler.New(
		provider.authzMiddleware.CheckResources(provider.savedViewHandler.Delete, authtypes.SigNozAdminRoleName, authtypes.SigNozEditorRoleName),
		handler.OpenAPIDef{
			ID:                  "DeleteSavedView",
			Tags:                []string{"saved_view"},
			Summary:             "Delete saved view",
			Description:         "Deletes a saved view by id.",
			Request:             nil,
			RequestContentType:  "",
			Response:            nil,
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusNotFound},
			Deprecated:          false,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceSavedView.Scope(coretypes.VerbDelete)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceMetaResourceSavedView,
			Verb:     coretypes.VerbDelete,
			Category: coretypes.ActionCategoryDataAccess,
			ID:       coretypes.PathParam("id"),
			Selector: coretypes.IDSelector,
		}),
	)).Methods(http.MethodDelete).GetError(); err != nil {
		return err
	}

	return nil
}

package signozapiserver

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/savedviewtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/gorilla/mux"
)

func (provider *provider) addSavedViewRoutes(router *mux.Router) error {
	if err := router.Handle("/api/v2/saved_views", handler.New(provider.authzMiddleware.ViewAccess(provider.savedViewHandler.List), handler.OpenAPIDef{
		ID:                  "ListSavedViews",
		Tags:                []string{"saved_view"},
		Summary:             "List saved views",
		Description:         "Returns saved views for the calling user's org, optionally filtered by source page, name, and category.",
		Request:             nil,
		RequestQuery:        new(savedviewtypes.ListSavedViewsParams),
		RequestContentType:  "",
		Response:            new([]*savedviewtypes.GettableSavedView),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{http.StatusBadRequest},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleViewer),
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/saved_views", handler.New(provider.authzMiddleware.EditAccess(provider.savedViewHandler.Create), handler.OpenAPIDef{
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
		SecuritySchemes:     newSecuritySchemes(types.RoleEditor),
	})).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/saved_views/{viewId}", handler.New(provider.authzMiddleware.ViewAccess(provider.savedViewHandler.Get), handler.OpenAPIDef{
		ID:                  "GetSavedView",
		Tags:                []string{"saved_view"},
		Summary:             "Get saved view",
		Description:         "Returns a saved view by id.",
		Request:             nil,
		RequestContentType:  "",
		Response:            new(savedviewtypes.GettableSavedView),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusNotFound},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleViewer),
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/saved_views/{viewId}", handler.New(provider.authzMiddleware.EditAccess(provider.savedViewHandler.Update), handler.OpenAPIDef{
		ID:                  "UpdateSavedView",
		Tags:                []string{"saved_view"},
		Summary:             "Update saved view",
		Description:         "Replaces a saved view's name, tags, and query.",
		Request:             new(savedviewtypes.UpdatableSavedView),
		RequestContentType:  "application/json",
		Response:            nil,
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusNotFound},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleEditor),
	})).Methods(http.MethodPut).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/saved_views/{viewId}", handler.New(provider.authzMiddleware.EditAccess(provider.savedViewHandler.Delete), handler.OpenAPIDef{
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
		SecuritySchemes:     newSecuritySchemes(types.RoleEditor),
	})).Methods(http.MethodDelete).GetError(); err != nil {
		return err
	}

	return nil
}

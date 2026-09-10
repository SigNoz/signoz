package signozapiserver

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/promotetypes"
	"github.com/gorilla/mux"
)

func (provider *provider) addPromoteRoutes(router *mux.Router) error {
	if err := router.Handle("/api/v1/logs/promote_paths", handler.New(provider.authzMiddleware.EditAccess(provider.promoteHandler.HandlePromoteAndIndexPaths), handler.OpenAPIDef{
		ID:                  "HandlePromoteAndIndexPaths",
		Tags:                []string{"logs"},
		Summary:             "Promote and index paths",
		Description:         "This endpoints promotes and indexes paths",
		Request:             new([]*promotetypes.PromotePath),
		RequestContentType:  "application/json",
		Response:            nil,
		ResponseContentType: "",
		SuccessStatusCode:   http.StatusCreated,
		ErrorStatusCodes:    []int{http.StatusBadRequest},
		SecuritySchemes:     newSecuritySchemes(types.RoleEditor),
	})).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/logs/promote_paths", handler.New(provider.authzMiddleware.ViewAccess(provider.promoteHandler.ListPromotedAndIndexedPaths), handler.OpenAPIDef{
		ID:                  "ListPromotedAndIndexedPaths",
		Tags:                []string{"logs"},
		Summary:             "Promote and index paths",
		Description:         "This endpoints promotes and indexes paths",
		Request:             nil,
		RequestContentType:  "",
		Response:            new([]*promotetypes.PromotePath),
		ResponseContentType: "",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{http.StatusBadRequest},
		SecuritySchemes:     newSecuritySchemes(types.RoleViewer),
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/traces/promote_paths", handler.New(provider.authzMiddleware.EditAccess(provider.promoteHandler.HandlePromoteAttributes), handler.OpenAPIDef{
		ID:                  "HandlePromoteAttributes",
		Tags:                []string{"traces"},
		Summary:             "Promote attributes",
		Description:         "This endpoint promotes attributes from the spans attributes JSON column to attributes_promoted",
		Request:             new([]*promotetypes.PromotePath),
		RequestContentType:  "application/json",
		Response:            nil,
		ResponseContentType: "",
		SuccessStatusCode:   http.StatusCreated,
		ErrorStatusCodes:    []int{http.StatusBadRequest},
		SecuritySchemes:     newSecuritySchemes(types.RoleEditor),
	})).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/traces/promote_paths", handler.New(provider.authzMiddleware.ViewAccess(provider.promoteHandler.ListPromotedAttributes), handler.OpenAPIDef{
		ID:                  "ListPromotedAttributes",
		Tags:                []string{"traces"},
		Summary:             "List promoted attributes",
		Description:         "This endpoint lists the promoted attributes of the spans attributes JSON column",
		Request:             nil,
		RequestContentType:  "",
		Response:            new([]*promotetypes.PromotePath),
		ResponseContentType: "",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{http.StatusBadRequest},
		SecuritySchemes:     newSecuritySchemes(types.RoleViewer),
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	return nil
}

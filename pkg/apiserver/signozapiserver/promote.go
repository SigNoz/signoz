package signozapiserver

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/types/promotetypes"
	"github.com/gorilla/mux"
)

func (provider *provider) addPromoteRoutes(router *mux.Router) error {
	if err := router.Handle("/api/v1/logs/promote_paths", handler.New(provider.authZ.EditAccess(provider.promoteHandler.HandlePromoteAndIndexPaths), handler.OpenAPIDef{
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
	})).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/logs/promote_paths", handler.New(provider.authZ.ViewAccess(provider.promoteHandler.ListPromotedAndIndexedPaths), handler.OpenAPIDef{
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
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	return nil
}

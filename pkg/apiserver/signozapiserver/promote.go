package signozapiserver

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/promotetypes"
	"github.com/gorilla/mux"
)

func (provider *provider) addPromoteRoutes(router *mux.Router) error {
	if err := router.Handle("/api/v1/promote_paths/{telemetry_signal}/{context}", handler.New(provider.authzMiddleware.EditAccess(provider.promoteHandler.PromotePaths), handler.OpenAPIDef{
		ID:                  "PromotePaths",
		Tags:                []string{"promote"},
		Summary:             "Promote paths",
		Description:         "This endpoint promotes paths of a JSON column to its promoted column. The promotion domain is identified by the telemetry_signal and context path variables, e.g. traces/attribute.",
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

	if err := router.Handle("/api/v1/promote_paths/{telemetry_signal}/{context}", handler.New(provider.authzMiddleware.ViewAccess(provider.promoteHandler.ListPromotedPaths), handler.OpenAPIDef{
		ID:                  "ListPromotedPaths",
		Tags:                []string{"promote"},
		Summary:             "List promoted paths",
		Description:         "This endpoint lists the promoted paths of a JSON column. The promotion domain is identified by the telemetry_signal and context path variables, e.g. traces/attribute.",
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

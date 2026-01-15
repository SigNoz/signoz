package signozapiserver

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/gorilla/mux"
)

func (provider *provider) addGatewayRoutes(router *mux.Router) error {
	// *********************************************
	// ! TODO: double check the API endpoint names
	// *********************************************

	if err := router.Handle("/api/v2/gateway/me/ingestion-keys", handler.New(provider.authZ.AdminAccess(provider.gatewayHandler.GetIngestionKeys), handler.OpenAPIDef{
		ID:                  "GetIngestionKeys",
		Tags:                []string{"gateway"},
		Summary:             "Get ingestion keys for workspace",
		Description:         "This endpoint returns the ingestion keys for a workspace",
		Request:             nil,
		RequestContentType:  "",
		Response:            make([]byte, 0), // ! TODO: make this strongly typed
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	return nil
}

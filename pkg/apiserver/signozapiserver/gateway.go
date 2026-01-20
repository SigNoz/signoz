package signozapiserver

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/gatewaytypes"
	"github.com/gorilla/mux"
)

func (provider *provider) addGatewayRoutes(router *mux.Router) error {
	if err := router.Handle("/api/v2/gateway/ingestion_keys", handler.New(provider.authZ.AdminAccess(provider.gatewayHandler.GetIngestionKeys), handler.OpenAPIDef{
		ID:                  "GetIngestionKeys",
		Tags:                []string{"gateway"},
		Summary:             "Get ingestion keys for workspace",
		Description:         "This endpoint returns the ingestion keys for a workspace",
		Request:             nil,
		RequestContentType:  "",
		Response:            new(gatewaytypes.GettableIngestionKeys),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/gateway/ingestion_keys/search", handler.New(provider.authZ.AdminAccess(provider.gatewayHandler.SearchIngestionKeys), handler.OpenAPIDef{
		ID:                  "SearchIngestionKeys",
		Tags:                []string{"gateway"},
		Summary:             "Search ingestion keys for workspace",
		Description:         "This endpoint returns the ingestion keys for a workspace",
		Request:             nil,
		RequestContentType:  "",
		Response:            new(gatewaytypes.GettableIngestionKeys),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/gateway/ingestion_keys", handler.New(provider.authZ.AdminAccess(provider.gatewayHandler.CreateIngestionKey), handler.OpenAPIDef{
		ID:                  "CreateIngestionKey",
		Tags:                []string{"gateway"},
		Summary:             "Create ingestion key for workspace",
		Description:         "This endpoint creates an ingestion key for the workspace",
		Request:             new(gatewaytypes.PostableIngestionKey),
		RequestContentType:  "application/json",
		Response:            new(gatewaytypes.GettableCreatedIngestionKey),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
	})).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/gateway/ingestion_keys/{keyId}", handler.New(provider.authZ.AdminAccess(provider.gatewayHandler.UpdateIngestionKey), handler.OpenAPIDef{
		ID:                  "UpdateIngestionKey",
		Tags:                []string{"gateway"},
		Summary:             "Update ingestion key for workspace",
		Description:         "This endpoint updates an ingestion key for the workspace",
		Request:             new(gatewaytypes.PostableIngestionKey),
		RequestContentType:  "application/json",
		Response:            nil,
		ResponseContentType: "",
		SuccessStatusCode:   http.StatusNoContent,
		ErrorStatusCodes:    []int{},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
	})).Methods(http.MethodPatch).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/gateway/ingestion_keys/{keyId}", handler.New(provider.authZ.AdminAccess(provider.gatewayHandler.DeleteIngestionKey), handler.OpenAPIDef{
		ID:                  "DeleteIngestionKey",
		Tags:                []string{"gateway"},
		Summary:             "Delete ingestion key for workspace",
		Description:         "This endpoint deletes an ingestion key for the workspace",
		Request:             nil,
		RequestContentType:  "",
		Response:            nil,
		ResponseContentType: "",
		SuccessStatusCode:   http.StatusNoContent,
		ErrorStatusCodes:    []int{},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
	})).Methods(http.MethodDelete).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/gateway/ingestion_keys/{keyId}/limits", handler.New(provider.authZ.AdminAccess(provider.gatewayHandler.CreateIngestionKeyLimit), handler.OpenAPIDef{
		ID:                  "CreateIngestionKeyLimit",
		Tags:                []string{"gateway"},
		Summary:             "Create limit for the ingestion key",
		Description:         "This endpoint creates an ingestion key limit",
		Request:             new(gatewaytypes.PostableIngestionKeyLimit),
		RequestContentType:  "application/json",
		Response:            new(gatewaytypes.GettableCreatedIngestionKeyLimit),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusCreated,
		ErrorStatusCodes:    []int{},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
	})).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/gateway/ingestion_keys/limits/{limitId}", handler.New(provider.authZ.AdminAccess(provider.gatewayHandler.UpdateIngestionKeyLimit), handler.OpenAPIDef{
		ID:                  "UpdateIngestionKeyLimit",
		Tags:                []string{"gateway"},
		Summary:             "Update limit for the ingestion key",
		Description:         "This endpoint updates an ingestion key limit",
		Request:             new(gatewaytypes.UpdatableIngestionKeyLimit),
		RequestContentType:  "application/json",
		Response:            nil,
		ResponseContentType: "",
		SuccessStatusCode:   http.StatusNoContent,
		ErrorStatusCodes:    []int{},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
	})).Methods(http.MethodPatch).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/gateway/ingestion_keys/limits/{limitId}", handler.New(provider.authZ.AdminAccess(provider.gatewayHandler.DeleteIngestionKeyLimit), handler.OpenAPIDef{
		ID:                  "DeleteIngestionKeyLimit",
		Tags:                []string{"gateway"},
		Summary:             "Delete limit for the ingestion key",
		Description:         "This endpoint deletes an ingestion key limit",
		Request:             nil,
		RequestContentType:  "application/json",
		Response:            nil,
		ResponseContentType: "",
		SuccessStatusCode:   http.StatusNoContent,
		ErrorStatusCodes:    []int{},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
	})).Methods(http.MethodDelete).GetError(); err != nil {
		return err
	}

	return nil
}

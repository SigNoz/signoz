package signozapiserver

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/serviceaccounttypes"
	"github.com/gorilla/mux"
)

func (provider *provider) addServiceAccountRoutes(router *mux.Router) error {
	if err := router.Handle("/api/v1/service_accounts", handler.New(provider.authZ.AdminAccess(provider.serviceAccountHandler.Create), handler.OpenAPIDef{
		ID:                  "CreateServiceAccount",
		Tags:                []string{"serviceaccount"},
		Summary:             "Create service account",
		Description:         "This endpoint creates a service account",
		Request:             new(serviceaccounttypes.PostableServiceAccount),
		RequestContentType:  "",
		Response:            new(types.Identifiable),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusCreated,
		ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusConflict},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
	})).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/service_accounts", handler.New(provider.authZ.AdminAccess(provider.serviceAccountHandler.List), handler.OpenAPIDef{
		ID:                  "ListServiceAccounts",
		Tags:                []string{"serviceaccount"},
		Summary:             "List service accounts",
		Description:         "This endpoint lists the service accounts for an organisation",
		Request:             nil,
		RequestContentType:  "",
		Response:            make([]*serviceaccounttypes.ServiceAccount, 0),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/service_accounts/{id}", handler.New(provider.authZ.AdminAccess(provider.serviceAccountHandler.Get), handler.OpenAPIDef{
		ID:                  "GetServiceAccount",
		Tags:                []string{"serviceaccount"},
		Summary:             "Gets a service account",
		Description:         "This endpoint gets an existing service account",
		Request:             nil,
		RequestContentType:  "",
		Response:            new(serviceaccounttypes.ServiceAccount),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{http.StatusNotFound},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/service_accounts/{id}", handler.New(provider.authZ.AdminAccess(provider.serviceAccountHandler.Update), handler.OpenAPIDef{
		ID:                  "UpdateServiceAccount",
		Tags:                []string{"serviceaccount"},
		Summary:             "Updates a service account",
		Description:         "This endpoint updates an existing service account",
		Request:             new(serviceaccounttypes.UpdatableServiceAccount),
		RequestContentType:  "",
		Response:            nil,
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusNoContent,
		ErrorStatusCodes:    []int{http.StatusNotFound, http.StatusBadRequest},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
	})).Methods(http.MethodPut).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/service_accounts/{id}/status", handler.New(provider.authZ.AdminAccess(provider.serviceAccountHandler.UpdateStatus), handler.OpenAPIDef{
		ID:                  "UpdateServiceAccountStatus",
		Tags:                []string{"serviceaccount"},
		Summary:             "Updates a service account status",
		Description:         "This endpoint updates an existing service account status",
		Request:             new(serviceaccounttypes.UpdatableServiceAccountStatus),
		RequestContentType:  "",
		Response:            nil,
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusNoContent,
		ErrorStatusCodes:    []int{http.StatusNotFound, http.StatusBadRequest},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
	})).Methods(http.MethodPut).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/service_accounts/{id}", handler.New(provider.authZ.AdminAccess(provider.serviceAccountHandler.Delete), handler.OpenAPIDef{
		ID:                  "DeleteServiceAccount",
		Tags:                []string{"serviceaccount"},
		Summary:             "Deletes a service account",
		Description:         "This endpoint deletes an existing service account",
		Request:             nil,
		RequestContentType:  "",
		Response:            nil,
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusNoContent,
		ErrorStatusCodes:    []int{http.StatusNotFound},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
	})).Methods(http.MethodDelete).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/service_accounts/{id}/keys", handler.New(provider.authZ.AdminAccess(provider.serviceAccountHandler.CreateFactorAPIKey), handler.OpenAPIDef{
		ID:                  "CreateServiceAccountKey",
		Tags:                []string{"serviceaccount"},
		Summary:             "Create a service account key",
		Description:         "This endpoint creates a service account key",
		Request:             new(serviceaccounttypes.PostableFactorAPIKey),
		RequestContentType:  "",
		Response:            new(serviceaccounttypes.GettableFactorAPIKeyWithKey),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusCreated,
		ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusConflict},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
	})).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/service_accounts/{id}/keys", handler.New(provider.authZ.AdminAccess(provider.serviceAccountHandler.ListFactorAPIKey), handler.OpenAPIDef{
		ID:                  "ListServiceAccountKeys",
		Tags:                []string{"serviceaccount"},
		Summary:             "List service account keys",
		Description:         "This endpoint lists the service account keys",
		Request:             nil,
		RequestContentType:  "",
		Response:            make([]*serviceaccounttypes.FactorAPIKey, 0),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/service_accounts/{id}/keys/{fid}", handler.New(provider.authZ.AdminAccess(provider.serviceAccountHandler.UpdateFactorAPIKey), handler.OpenAPIDef{
		ID:                  "UpdateServiceAccountKey",
		Tags:                []string{"serviceaccount"},
		Summary:             "Updates a service account key",
		Description:         "This endpoint updates an existing service account key",
		Request:             new(serviceaccounttypes.UpdatableFactorAPIKey),
		RequestContentType:  "",
		Response:            nil,
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusNoContent,
		ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusNotFound},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
	})).Methods(http.MethodPut).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/service_accounts/{id}/keys/{fid}", handler.New(provider.authZ.AdminAccess(provider.serviceAccountHandler.RevokeFactorAPIKey), handler.OpenAPIDef{
		ID:                  "RevokeServiceAccountKey",
		Tags:                []string{"serviceaccount"},
		Summary:             "Revoke a service account key",
		Description:         "This endpoint revokes an existing service account key",
		Request:             nil,
		RequestContentType:  "",
		Response:            nil,
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusNoContent,
		ErrorStatusCodes:    []int{http.StatusNotFound},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
	})).Methods(http.MethodDelete).GetError(); err != nil {
		return err
	}

	return nil
}

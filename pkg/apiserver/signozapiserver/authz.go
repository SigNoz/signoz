package signozapiserver

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/gorilla/mux"
)

func (provider *provider) addAuthzRoutes(router *mux.Router) error {
	if err := router.Handle("/api/v1/authz/check", handler.New(provider.authzHandler.Check, handler.OpenAPIDef{
		ID:                  "AuthzCheck",
		Tags:                []string{"authz"},
		Summary:             "Check permissions",
		Description:         "Checks if the authenticated user has permissions for given transactions",
		Request:             make([]*authtypes.Transaction, 0),
		RequestContentType:  "",
		Response:            make([]*authtypes.GettableTransaction, 0),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{},
		Deprecated:          false,
		SecuritySchemes:     nil,
	})).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/authz/resources", handler.New(provider.authZ.OpenAccess(provider.authzHandler.GetResources), handler.OpenAPIDef{
		ID:                  "AuthzResources",
		Tags:                []string{"authz"},
		Summary:             "Get resources",
		Description:         "Gets all the available resources",
		Request:             nil,
		RequestContentType:  "",
		Response:            new(authtypes.GettableResources),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{},
		Deprecated:          false,
		SecuritySchemes:     nil,
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	return nil
}

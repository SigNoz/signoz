package signozapiserver

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/gorilla/mux"
)

func (provider *provider) addAuthDomainRoutes(router *mux.Router) error {
	if err := router.Handle("/api/v1/domains", handler.New(provider.authZ.AdminAccess(provider.authDomainHandler.List), handler.OpenAPIDef{
		ID:                  "ListAuthDomains",
		Tags:                []string{"auth domains"},
		Summary:             "List auth domains",
		Description:         "This endpoint lists all auth domains",
		Request:             nil,
		RequestContentType:  "",
		Response:            &authtypes.GettableAuthDomain{},
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized},
		Deprecated:          false,
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/domains", handler.New(provider.authZ.AdminAccess(provider.authDomainHandler.Create), handler.OpenAPIDef{
		ID:                  "CreateAuthDomain",
		Tags:                []string{"auth domains"},
		Summary:             "Create auth domain",
		Description:         "This endpoint creates an auth domain",
		Request:             &authtypes.PostableAuthDomain{},
		RequestContentType:  "application/json",
		Response:            &authtypes.GettableAuthDomain{},
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized},
		Deprecated:          false,
	})).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/domains/{id}", handler.New(provider.authZ.AdminAccess(provider.authDomainHandler.Update), handler.OpenAPIDef{
		ID:                  "UpdateAuthDomain",
		Tags:                []string{"auth domains"},
		Summary:             "Update auth domain",
		Description:         "This endpoint updates an auth domain",
		Request:             &authtypes.UpdateableAuthDomain{},
		RequestContentType:  "application/json",
		Response:            &authtypes.GettableAuthDomain{},
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized},
		Deprecated:          false,
	})).Methods(http.MethodPut).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/domains/{id}", handler.New(provider.authZ.AdminAccess(provider.authDomainHandler.Delete), handler.OpenAPIDef{
		ID:                  "DeleteAuthDomain",
		Tags:                []string{"auth domains"},
		Summary:             "Delete auth domain",
		Description:         "This endpoint deletes an auth domain",
		Request:             nil,
		RequestContentType:  "",
		Response:            nil,
		ResponseContentType: "",
		SuccessStatusCode:   http.StatusNoContent,
		ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized},
		Deprecated:          false,
	})).Methods(http.MethodDelete).GetError(); err != nil {
		return err
	}

	return nil
}

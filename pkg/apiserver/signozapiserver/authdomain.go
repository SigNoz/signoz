package signozapiserver

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/gorilla/mux"
)

func (provider *provider) addAuthDomainRoutes(router *mux.Router) error {
	if err := router.Handle("/api/v1/domains", handler.New(provider.authZ.AdminAccess(provider.authDomainHandler.List), handler.OpenAPIDef{
		ID:                  "ListAuthDomains",
		Tags:                []string{"authdomains"},
		Summary:             "List all auth domains",
		Description:         "This endpoint lists all auth domains",
		Request:             nil,
		RequestContentType:  "",
		Response:            make([]*authtypes.GettableAuthDomain, 0),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/domains", handler.New(provider.authZ.AdminAccess(provider.authDomainHandler.Create), handler.OpenAPIDef{
		ID:                  "CreateAuthDomain",
		Tags:                []string{"authdomains"},
		Summary:             "Create auth domain",
		Description:         "This endpoint creates an auth domain",
		Request:             new(authtypes.PostableAuthDomain),
		RequestContentType:  "application/json",
		Response:            new(authtypes.GettableAuthDomain),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusConflict},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
	})).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/domains/{id}", handler.New(provider.authZ.AdminAccess(provider.authDomainHandler.Update), handler.OpenAPIDef{
		ID:                  "UpdateAuthDomain",
		Tags:                []string{"authdomains"},
		Summary:             "Update auth domain",
		Description:         "This endpoint updates an auth domain",
		Request:             new(authtypes.UpdateableAuthDomain),
		RequestContentType:  "application/json",
		Response:            nil,
		ResponseContentType: "",
		SuccessStatusCode:   http.StatusNoContent,
		ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusConflict},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
	})).Methods(http.MethodPut).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/domains/{id}", handler.New(provider.authZ.AdminAccess(provider.authDomainHandler.Delete), handler.OpenAPIDef{
		ID:                  "DeleteAuthDomain",
		Tags:                []string{"authdomains"},
		Summary:             "Delete auth domain",
		Description:         "This endpoint deletes an auth domain",
		Request:             nil,
		RequestContentType:  "",
		Response:            nil,
		ResponseContentType: "",
		SuccessStatusCode:   http.StatusNoContent,
		ErrorStatusCodes:    []int{http.StatusBadRequest},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
	})).Methods(http.MethodDelete).GetError(); err != nil {
		return err
	}

	return nil
}

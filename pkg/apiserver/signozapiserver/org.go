package signozapiserver

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/gorilla/mux"
)

func (provider *provider) addOrgRoutes(router *mux.Router) error {
	if err := router.Handle("/api/v2/orgs/me", handler.New(provider.authZ.AdminAccess(provider.orgHandler.Get), handler.OpenAPIDef{
		ID:                  "GetMyOrganization",
		Tags:                []string{"orgs"},
		Summary:             "Get my organization",
		Description:         "This endpoint returns the organization I belong to",
		Request:             nil,
		RequestContentType:  "",
		Response:            new(types.Organization),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/orgs/me", handler.New(provider.authZ.AdminAccess(provider.orgHandler.Update), handler.OpenAPIDef{
		ID:                  "UpdateMyOrganization",
		Tags:                []string{"orgs"},
		Summary:             "Update my organization",
		Description:         "This endpoint updates the organization I belong to",
		Request:             new(types.Organization),
		RequestContentType:  "application/json",
		Response:            nil,
		ResponseContentType: "",
		SuccessStatusCode:   http.StatusNoContent,
		ErrorStatusCodes:    []int{http.StatusConflict, http.StatusBadRequest},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
	})).Methods(http.MethodPut).GetError(); err != nil {
		return err
	}

	return nil
}

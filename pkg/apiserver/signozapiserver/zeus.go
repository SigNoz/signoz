package signozapiserver

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/zeustypes"
	"github.com/gorilla/mux"
)

func (provider *provider) addZeusRoutes(router *mux.Router) error {
	if err := router.Handle("/api/v2/zeus/profiles", handler.New(provider.authZ.AdminAccess(provider.zeusHandler.PutProfile), handler.OpenAPIDef{
		ID:                  "PutProfile",
		Tags:                []string{"zeus"},
		Summary:             "Put profile in Zeus for a deployment.",
		Description:         "This endpoint saves the profile of a deployment to zeus.",
		Request:             new(zeustypes.PostableProfile),
		RequestContentType:  "application/json",
		Response:            nil,
		ResponseContentType: "",
		SuccessStatusCode:   http.StatusNoContent,
		ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized, http.StatusForbidden, http.StatusNotFound, http.StatusConflict},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
	})).Methods(http.MethodPut).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/zeus/hosts", handler.New(provider.authZ.AdminAccess(provider.zeusHandler.GetHosts), handler.OpenAPIDef{
		ID:                  "GetHosts",
		Tags:                []string{"zeus"},
		Summary:             "Get host info from Zeus.",
		Description:         "This endpoint gets the host info from zeus.",
		Request:             nil,
		RequestContentType:  "",
		Response:            new(zeustypes.GettableHost),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized, http.StatusForbidden, http.StatusNotFound},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/zeus/hosts", handler.New(provider.authZ.AdminAccess(provider.zeusHandler.PutHost), handler.OpenAPIDef{
		ID:                  "PutHost",
		Tags:                []string{"zeus"},
		Summary:             "Put host in Zeus for a deployment.",
		Description:         "This endpoint saves the host of a deployment to zeus.",
		Request:             new(zeustypes.PostableHost),
		RequestContentType:  "application/json",
		Response:            nil,
		ResponseContentType: "",
		SuccessStatusCode:   http.StatusNoContent,
		ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized, http.StatusForbidden, http.StatusNotFound, http.StatusConflict},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
	})).Methods(http.MethodPut).GetError(); err != nil {
		return err
	}

	return nil
}

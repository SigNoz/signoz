package signozapiserver

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/gorilla/mux"
)

func (provider *provider) addGlobalRoutes(router *mux.Router) error {
	if err := router.Handle("/api/v1/global/config", handler.New(provider.authZ.EditAccess(provider.globalHandler.GetConfig), handler.OpenAPIDef{
		ID:                  "GetGlobalConfig",
		Tags:                []string{"global"},
		Summary:             "Get global config",
		Description:         "This endpoints returns global config",
		Request:             nil,
		RequestContentType:  "",
		Response:            new(types.GettableGlobalConfig),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleEditor),
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	return nil
}

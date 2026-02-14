package signozapiserver

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/gorilla/mux"
)

func (provider *provider) addFieldsRoutes(router *mux.Router) error {
	if err := router.Handle("/api/v1/fields/keys", handler.New(provider.authZ.ViewAccess(provider.fieldsHandler.GetFieldsKeys), handler.OpenAPIDef{
		ID:                  "GetFieldsKeys",
		Tags:                []string{"fields"},
		Summary:             "Get field keys",
		Description:         "This endpoint returns field keys",
		Request:             nil,
		RequestQuery:        new(telemetrytypes.PostableFieldKeysParams),
		RequestContentType:  "",
		Response:            new(telemetrytypes.GettableFieldKeys),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleViewer),
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/fields/values", handler.New(provider.authZ.ViewAccess(provider.fieldsHandler.GetFieldsValues), handler.OpenAPIDef{
		ID:                  "GetFieldsValues",
		Tags:                []string{"fields"},
		Summary:             "Get field values",
		Description:         "This endpoint returns field values",
		Request:             nil,
		RequestQuery:        new(telemetrytypes.PostableFieldValueParams),
		RequestContentType:  "",
		Response:            new(telemetrytypes.GettableFieldValues),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleViewer),
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	return nil
}

package signozapiserver

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/gorilla/mux"
)

func (provider *provider) addFieldsRoutes(router *mux.Router) error {
	if err := router.Handle("/api/v1/fields/keys", handler.New(provider.authzMiddleware.CheckResources(provider.fieldsHandler.GetFieldsKeys, authtypes.SigNozAdminRoleName, authtypes.SigNozEditorRoleName, authtypes.SigNozViewerRoleName), handler.OpenAPIDef{
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
		SecuritySchemes:     newScopedSecuritySchemes(telemetryReadScopes()),
	}, handler.WithResourceDefs(handler.TelemetryResourceDef{
		Verb:      coretypes.VerbRead,
		Category:  coretypes.ActionCategoryDataAccess,
		Selector:  querybuilder.TelemetrySelector,
		Resources: querybuilder.FieldsResources,
	}))).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/fields/values", handler.New(provider.authzMiddleware.CheckResources(provider.fieldsHandler.GetFieldsValues, authtypes.SigNozAdminRoleName, authtypes.SigNozEditorRoleName, authtypes.SigNozViewerRoleName), handler.OpenAPIDef{
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
		SecuritySchemes:     newScopedSecuritySchemes(telemetryReadScopes()),
	}, handler.WithResourceDefs(handler.TelemetryResourceDef{
		Verb:      coretypes.VerbRead,
		Category:  coretypes.ActionCategoryDataAccess,
		Selector:  querybuilder.TelemetrySelector,
		Resources: querybuilder.FieldsResources,
	}))).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	return nil
}

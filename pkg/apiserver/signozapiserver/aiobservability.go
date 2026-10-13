package signozapiserver

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/aiobservabilitytypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/gorilla/mux"
)

func (provider *provider) addAIObservabilityRoutes(router *mux.Router) error {
	if err := router.Handle("/api/v1/ai_observability/fields/keys", handler.New(provider.authzMiddleware.ViewAccess(provider.aiObservabilityHandler.GetFieldsKeys), handler.OpenAPIDef{
		ID:                  "GetAIObservabilityFieldsKeys",
		Tags:                []string{"ai_observability"},
		Summary:             "Get AI observability field keys",
		Description:         "This endpoint returns the field keys the AI observability explorer can filter on, including the computed per-trace aggregates",
		Request:             nil,
		RequestQuery:        new(aiobservabilitytypes.PostableFieldKeysParams),
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

	if err := router.Handle("/api/v1/ai_observability/fields/values", handler.New(provider.authzMiddleware.ViewAccess(provider.aiObservabilityHandler.GetFieldsValues), handler.OpenAPIDef{
		ID:                  "GetAIObservabilityFieldsValues",
		Tags:                []string{"ai_observability"},
		Summary:             "Get AI observability field values",
		Description:         "This endpoint returns the values the AI observability explorer can filter a field key on",
		Request:             nil,
		RequestQuery:        new(aiobservabilitytypes.PostableFieldValueParams),
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

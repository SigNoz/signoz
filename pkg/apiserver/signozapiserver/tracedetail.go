package signozapiserver

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/tracedetailtypes"
	"github.com/gorilla/mux"
)

func (provider *provider) addTraceDetailRoutes(router *mux.Router) error {
	if err := router.Handle("/api/v3/traces/{traceID}/waterfall", handler.New(
		provider.authZ.ViewAccess(provider.traceDetailHandler.GetWaterfall),
		handler.OpenAPIDef{
			ID:                  "GetWaterfall",
			Tags:                []string{"tracedetail"},
			Summary:             "Get waterfall view for a trace",
			Description:         "Returns the waterfall view of spans for a given trace ID with tree structure, metadata, and windowed pagination",
			Request:             new(tracedetailtypes.PostableWaterfall),
			RequestContentType:  "application/json",
			Response:            new(tracedetailtypes.GettableWaterfallTrace),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusNotFound},
			SecuritySchemes:     newSecuritySchemes(types.RoleViewer),
		},
	)).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	return nil
}

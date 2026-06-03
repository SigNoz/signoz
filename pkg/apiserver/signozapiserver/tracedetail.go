package signozapiserver

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/spantypes"
	"github.com/gorilla/mux"
)

func (provider *provider) addTraceDetailRoutes(router *mux.Router) error {
	if err := router.Handle("/api/v3/traces/{traceID}/waterfall", handler.New(
		provider.authzMiddleware.ViewAccess(provider.traceDetailHandler.GetWaterfall),
		handler.OpenAPIDef{
			ID:                  "GetWaterfall",
			Tags:                []string{"tracedetail"},
			Summary:             "Get waterfall view for a trace",
			Description:         "Returns the waterfall view of spans for a given trace ID with tree structure, metadata, and windowed pagination",
			Request:             new(spantypes.PostableWaterfall),
			RequestContentType:  "application/json",
			Response:            new(spantypes.GettableWaterfallTrace),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusNotFound},
			SecuritySchemes:     newSecuritySchemes(types.RoleViewer),
		},
	)).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v4/traces/{traceID}/waterfall", handler.New(
		provider.authzMiddleware.ViewAccess(provider.traceDetailHandler.GetWaterfallV4),
		handler.OpenAPIDef{
			ID:                  "GetWaterfallV4",
			Tags:                []string{"tracedetail"},
			Summary:             "Get waterfall view for a trace",
			Description:         "Returns the waterfall view of spans including all spans if total spans are under a limit, a max count otherwise. Aggregations are dropped compared to v3",
			Request:             new(spantypes.PostableWaterfall),
			RequestContentType:  "application/json",
			Response:            new(spantypes.GettableWaterfallTrace),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusNotFound},
			SecuritySchemes:     newSecuritySchemes(types.RoleViewer),
		},
	)).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/traces/{traceID}/aggregations", handler.New(
		provider.authzMiddleware.ViewAccess(provider.traceDetailHandler.GetTraceAggregations),
		handler.OpenAPIDef{
			ID:                  "GetTraceAggregations",
			Tags:                []string{"tracedetail"},
			Summary:             "Get aggregations for a trace",
			Description:         "Computes span aggregations grouped by requested field.",
			Request:             new(spantypes.PostableTraceAggregations),
			RequestContentType:  "application/json",
			Response:            new(spantypes.GettableTraceAggregations),
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

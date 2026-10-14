package signozapiserver

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/spantypes"
	"github.com/gorilla/mux"
)

func (provider *provider) addTraceDetailRoutes(router *mux.Router) error {
	if err := router.Handle("/api/v1/traces/{traceID}/summary", handler.New(
		provider.authzMiddleware.ViewAccess(provider.traceDetailHandler.GetTraceSummary),
		handler.OpenAPIDef{
			ID:                  "GetTraceSummary",
			Tags:                []string{"tracedetail"},
			Summary:             "Get summary for a trace",
			Description:         "Returns the trace's time range, root span, span and error counts, and whether any spans are missing. AI traces also include token and cost totals.",
			Response:            new(spantypes.GettableTraceSummary),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusNotFound},
			SecuritySchemes:     newSecuritySchemes(types.RoleViewer),
		},
	)).Methods(http.MethodGet).GetError(); err != nil {
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

	if err := router.Handle("/api/v3/traces/{traceID}/flamegraph", handler.New(
		provider.authzMiddleware.ViewAccess(provider.traceDetailHandler.GetFlamegraph),
		handler.OpenAPIDef{
			ID:                  "GetFlamegraph",
			Tags:                []string{"tracedetail"},
			Summary:             "Get flamegraph view for a trace",
			Description:         "Returns the flamegraph view of spans for a given trace ID.",
			Request:             new(spantypes.PostableFlamegraph),
			RequestContentType:  "application/json",
			Response:            new(spantypes.GettableFlamegraphTrace),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusNotFound},
			SecuritySchemes:     newSecuritySchemes(types.RoleViewer),
		},
	)).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/traces/{traceID}/thread", handler.New(
		provider.authzMiddleware.ViewAccess(provider.traceDetailHandler.GetThread),
		handler.OpenAPIDef{
			ID:                  "GetTraceThread",
			Tags:                []string{"tracedetail"},
			Summary:             "Get thread view for a trace",
			Description:         "Returns the spans carrying gen_ai input or output messages, or a tool execution, in timestamp order. Messages already in the OTel GenAI shape are decoded into formatted_input and formatted_output, with formatter naming the converter and formatter_warnings what it could not resolve. Pass nextCursor as after or prevCursor as before to page, or spanId to open the page around a span.",
			RequestQuery:        new(spantypes.GetTraceThreadParams),
			Response:            new(spantypes.GettableTraceThread),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusNotFound},
			SecuritySchemes:     newSecuritySchemes(types.RoleViewer),
		},
	)).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	return nil
}

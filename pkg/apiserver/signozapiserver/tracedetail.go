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
			Description:         "Returns the waterfall view of spans including all spans if total spans are under a limit, a max count otherwise. Aggregations are dropped compared to v3. A span carrying gen_ai input or output messages also has them decoded into formattedInput and formattedOutput, with formatterWarnings holding what the converter could not resolve.",
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
			Description:         "Returns the gen_ai spans of a trace, model calls, tool calls and agent spans, in timestamp order. The messages a span carries are decoded into formattedInput and formattedOutput, with formatterWarnings holding what the converter could not resolve; a span without messages has both empty. Pass nextCursor as after or prevCursor as before to page, or spanId to open the page around a span.",
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

	if err := router.Handle("/api/v1/traces/{traceID}/inspect", handler.New(
		provider.authzMiddleware.ViewAccess(provider.traceDetailHandler.InspectTrace),
		handler.OpenAPIDef{
			ID:                  "InspectTrace",
			Tags:                []string{"tracedetail"},
			Summary:             "Inspect a trace",
			Description:         "Returns one of three parts of a trace of any size, named by type, each within 50,000 characters. Without spanId or search it returns the overview: the trace's identity with per-service totals, the spans where each error started, the failures not marked as errors (a 4xx response, a gRPC status other than OK, an exception event), the slowest spans by own time with same-name spans under one parent taken together, the most expensive gen_ai spans, and the span tree. The tree holds the first 50 spans of the trace: level by level from the root, and in time order on the level that does not fit. A trace of up to 50 spans also returns each span's full record when they fit in 20,000 characters. With spanId it returns that span's summary and full record, its ancestors, and the spans below it level by level, at most 20 per level; values over 500 characters are cut and listed in truncated. With search it returns the matching spans, each with where the words were found; allSpans returns every span instead. Every list carries its total, and every list item the span's direct parent. Pass a nextCursor as cursor with the same parameters to get the next page.",
			RequestQuery:        new(spantypes.InspectTraceParams),
			Response:            new(spantypes.GettableTraceInspection),
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

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
			Description:         "Returns the totals of a trace and no spans: its time range, root span, span and error counts, and whether any spans are missing. AI traces also include model and tool call counts, and token and cost totals. For the spans to look at, use the trace overview.",
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

	if err := router.Handle("/api/v1/traces/{traceID}/overview", handler.New(
		provider.authzMiddleware.ViewAccess(provider.traceDetailHandler.GetTraceOverview),
		handler.OpenAPIDef{
			ID:                  "GetTraceOverview",
			Tags:                []string{"tracedetail"},
			Summary:             "Get overview of a trace",
			Description:         "Returns the trace summary plus the spans to look at, for a trace of any size: per-service totals and the first spans of the errors, unmarked failures, expensive, links and slowest span lists. The summary is the one the trace summary route returns. Read more of a list from the span list with the view of the same name. For the structure of the trace, use the span list: the all view is in tree order, and parentSpanId returns the children of a span.",
			RequestQuery:        new(spantypes.GetTraceOverviewParams),
			Response:            new(spantypes.TraceOverview),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusNotFound},
			SecuritySchemes:     newSecuritySchemes(types.RoleViewer),
			Stability:           handler.StabilityDevelopment,
		},
	)).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/traces/{traceID}/spans", handler.New(
		provider.authzMiddleware.ViewAccess(provider.traceDetailHandler.ListTraceSpans),
		handler.OpenAPIDef{
			ID:                  "ListTraceSpans",
			Tags:                []string{"tracedetail"},
			Summary:             "List spans of a trace",
			Description:         "Returns a page of the spans of a trace, each with its tree stats. view picks the spans and their order; search and parentSpanId narrow them; selectFields names the attributes to fill. Values are returned whole.",
			RequestQuery:        new(spantypes.ListTraceSpansParams),
			Response:            new(spantypes.SpanList),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusNotFound},
			SecuritySchemes:     newSecuritySchemes(types.RoleViewer),
			Stability:           handler.StabilityDevelopment,
		},
	)).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/traces/{traceID}/spans/{spanID}", handler.New(
		provider.authzMiddleware.ViewAccess(provider.traceDetailHandler.GetTraceSpan),
		handler.OpenAPIDef{
			ID:                  "GetTraceSpan",
			Tags:                []string{"tracedetail"},
			Summary:             "Get span of a trace",
			Description:         "Returns one span with every attribute, resource attribute and event, its tree stats, and the spans above it up to a root. Values are returned whole. The spans below it come from the span list with parentSpanId.",
			Response:            new(spantypes.SpanDetail),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusNotFound},
			SecuritySchemes:     newSecuritySchemes(types.RoleViewer),
			Stability:           handler.StabilityDevelopment,
		},
	)).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	return nil
}

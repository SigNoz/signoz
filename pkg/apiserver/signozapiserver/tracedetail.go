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
			Description:         "Returns the totals of a trace and no spans: its time range, root span, span and error counts, and whether any spans are missing. AI traces also include model and tool call counts, and token and cost totals. For the spans to look at, use the trace highlights.",
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

	if err := router.Handle("/api/v1/traces/{traceID}/highlights", handler.New(
		provider.authzMiddleware.ViewAccess(provider.traceDetailHandler.GetTraceHighlights),
		handler.OpenAPIDef{
			ID:                  "GetTraceHighlights",
			Tags:                []string{"tracedetail"},
			Summary:             "Get highlights of a trace",
			Description:         "Returns the trace summary plus the spans to look at, for a trace of any size: per-service totals and the first spans of each view of the span list. The summary is the one the trace summary route returns. views names the lists to return; without it every view except all is returned. Read more of a list from the span list with the view of the same name.",
			RequestQuery:        new(spantypes.GetTraceHighlightsParams),
			Response:            new(spantypes.TraceHighlights),
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
			Description:         "Returns a page of the spans of a trace, in tree order from the top: a span is followed by the spans below it. view keeps only the spans of one kind, query narrows them, and selectFields names the attributes to fill. Values are returned whole.",
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
			Description:         "Returns one span with every attribute, resource attribute and event. Values are returned whole. It returns only the stored span: its tree stats come with it in any span list, and the spans around it come from the children, descendants and ancestors routes.",
			Response:            new(spantypes.Span),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusNotFound},
			SecuritySchemes:     newSecuritySchemes(types.RoleViewer),
			Stability:           handler.StabilityDevelopment,
		},
	)).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/traces/{traceID}/spans/{spanID}/children", handler.New(
		provider.authzMiddleware.ViewAccess(provider.traceDetailHandler.ListTraceSpanChildren),
		handler.OpenAPIDef{
			ID:                  "ListTraceSpanChildren",
			Tags:                []string{"tracedetail"},
			Summary:             "List children of a span",
			Description:         "Returns a page of the direct children of a span, one level below it and nothing deeper, in start order. It takes the same parameters as the span list. The list is empty for a span without children.",
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

	if err := router.Handle("/api/v1/traces/{traceID}/spans/{spanID}/descendants", handler.New(
		provider.authzMiddleware.ViewAccess(provider.traceDetailHandler.ListTraceSpanDescendants),
		handler.OpenAPIDef{
			ID:                  "ListTraceSpanDescendants",
			Tags:                []string{"tracedetail"},
			Summary:             "List descendants of a span",
			Description:         "Returns a page of the spans below a span, at any depth, in tree order. It takes the same parameters as the span list, so view=error_origins returns the errors that started below the span.",
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

	if err := router.Handle("/api/v1/traces/{traceID}/spans/{spanID}/ancestors", handler.New(
		provider.authzMiddleware.ViewAccess(provider.traceDetailHandler.ListTraceSpanAncestors),
		handler.OpenAPIDef{
			ID:                  "ListTraceSpanAncestors",
			Tags:                []string{"tracedetail"},
			Summary:             "List ancestors of a span",
			Description:         "Returns a page of the spans above a span: the chain of parents from the span up to its root, the parent first, and nothing from other branches. The span itself is not included. It takes the same parameters as the span list. The list is empty for a root, and stops where a parent was never received.",
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

	return nil
}

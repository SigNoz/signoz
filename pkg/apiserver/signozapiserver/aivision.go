package signozapiserver

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/gorilla/mux"
)

// AI Vision projections are ordinary main API routes, with the same resource
// resolution, OSS roles/EE grants, session/API-key identity and response envelope.
func (provider *provider) addAIVisionRoutes(router *mux.Router) error {
	if provider.aivisionHandler == nil {
		return nil
	}
	h := provider.aivisionHandler
	traces := []coretypes.Resource{coretypes.ResourceTelemetryResourceTraces}
	logs := []coretypes.Resource{coretypes.ResourceTelemetryResourceLogs}
	all := []coretypes.Resource{coretypes.ResourceTelemetryResourceLogs, coretypes.ResourceTelemetryResourceTraces, coretypes.ResourceTelemetryResourceMetrics}
	for _, route := range []struct {
		path, method, name string
		serve              http.HandlerFunc
		resources          []coretypes.Resource
	}{
		{"traces", "GET", "Traces", h.Traces, traces},
		{"traces/facets", "GET", "TraceFacets", h.TraceFacets, traces},
		{"traces/io", "POST", "TraceIO", h.TraceIOBatch, traces},
		{"traces/usage", "POST", "TraceUsage", h.TraceUsageBatch, traces},
		{"traces/{traceID}", "GET", "TraceDetail", h.TraceDetail, traces},
		{"spans/batch", "POST", "SpanBatch", h.SpanBatch, traces},
		{"sessions", "GET", "Sessions", h.Sessions, traces},
		{"sessions/io", "POST", "SessionIO", h.SessionIOBatch, traces},
		{"sessions/usage", "POST", "SessionUsage", h.SessionUsageBatch, traces},
		{"sessions/{sessionID}", "GET", "SessionDetail", h.SessionDetail, traces},
		{"events/metadata", "GET", "EventMetadata", h.EventsMetadata, logs},
		{"events/list", "POST", "Events", h.EventsList, logs},
		{"events/facets", "POST", "EventFacets", h.EventsFacets, logs},
		{"dashboard/query", "POST", "DashboardQuery", h.Dashboard, all},
	} {
		refs := make([]coretypes.ResourceWithID, 0, len(route.resources))
		scopes := make([]string, 0, len(route.resources))
		for _, resource := range route.resources {
			// This endpoint exposes domain queries, not the builder filter DSL.
			// Require an explicit broad grant instead of pretending to enforce
			// arbitrary builder resource-attribute restrictions on native SQL.
			refs = append(refs, coretypes.ResourceWithID{Resource: resource, ID: "ai_vision/" + coretypes.WildCardSelectorString})
			scopes = append(scopes, resource.Scope(coretypes.VerbRead))
		}
		def := handler.OpenAPIDef{
			ID: "AIVision" + route.name, Tags: []string{"ai-vision"}, Summary: route.name,
			Response: new(map[string]any), ResponseContentType: "application/json",
			SuccessStatusCode: http.StatusOK, ErrorStatusCodes: []int{http.StatusBadRequest, http.StatusNotFound},
			SecuritySchemes: newScopedSecuritySchemes(scopes),
		}
		if route.method == http.MethodPost {
			def.Request = new(map[string]any)
			def.RequestContentType = "application/json"
		}
		secured := provider.authzMiddleware.CheckResources(route.serve, authtypes.SigNozAdminRoleName, authtypes.SigNozEditorRoleName, authtypes.SigNozViewerRoleName)
		if err := router.Handle("/api/v1/ai-vision/"+route.path, handler.New(secured, def, handler.WithResourceDefs(handler.TelemetryResourceDef{
			Verb: coretypes.VerbRead, Category: coretypes.ActionCategoryDataAccess, Selector: querybuilder.TelemetrySelector,
			Resources: func(coretypes.ExtractorContext) ([]coretypes.ResourceWithID, error) { return refs, nil },
		}))).Methods(route.method).GetError(); err != nil {
			return err
		}
	}
	return nil
}

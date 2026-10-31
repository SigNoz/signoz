package signozapiserver

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/types/annotationtypes"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/gorilla/mux"
)

func (provider *provider) addAnnotationsRoutes(router *mux.Router) error {
	if err := router.Handle("/api/v1/annotations", handler.New(
		provider.authzMiddleware.CheckResources(provider.annotationsHandler.ListAnnotations, authtypes.SigNozAdminRoleName, authtypes.SigNozEditorRoleName, authtypes.SigNozViewerRoleName),
		handler.OpenAPIDef{
			ID:                  "ListAnnotations",
			Tags:                []string{"annotations"},
			Summary:             "List annotations",
			Description:         "Returns annotation markers of the requested kind inside the time range. For kind 'deployment', a marker is the first time a (service, environment, version) tuple was seen in the requested signals (traces, logs, or both when omitted). Each record carries the signal that produced it, the first seen time in epoch milliseconds, the trace and span ids or the log id of the first row, and the resource attributes of that row minus the identity keys. Supports an optional resource-attribute filter expression. historyAvailableFrom is the earliest time the result can be trusted, bounded by the signal retention.",
			Request:             new(annotationtypes.PostableAnnotations),
			RequestContentType:  "application/json",
			Response:            new(annotationtypes.Annotations),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized},
			Deprecated:          false,
			SecuritySchemes: newScopedSecuritySchemes([]string{
				coretypes.ResourceTelemetryResourceTraces.Scope(coretypes.VerbRead),
				coretypes.ResourceTelemetryResourceLogs.Scope(coretypes.VerbRead),
			}),
		}, handler.WithResourceDefs(
			handler.TelemetryResourceDef{
				Verb:      coretypes.VerbRead,
				Category:  coretypes.ActionCategoryDataAccess,
				Selector:  querybuilder.TelemetrySelector,
				Resources: querybuilder.BuilderQueryWithFilterExpressionResources(coretypes.ResourceTelemetryResourceTraces, "filter.expression"),
			},
			handler.TelemetryResourceDef{
				Verb:      coretypes.VerbRead,
				Category:  coretypes.ActionCategoryDataAccess,
				Selector:  querybuilder.TelemetrySelector,
				Resources: querybuilder.BuilderQueryWithFilterExpressionResources(coretypes.ResourceTelemetryResourceLogs, "filter.expression"),
			},
		))).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	return nil
}

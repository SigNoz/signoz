package signozapiserver

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/types/metricreductionruletypes"
	"github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/gorilla/mux"
)

func (provider *provider) addMetricReductionRuleRoutes(router *mux.Router) error {
	if err := router.Handle("/api/v2/metric_reduction_rules", handler.New(
		provider.authzMiddleware.CheckResources(provider.metricReductionRuleHandler.List, authtypes.SigNozAdminRoleName, authtypes.SigNozEditorRoleName, authtypes.SigNozViewerRoleName),
		handler.OpenAPIDef{
			ID:                  "ListMetricReductionRules",
			Tags:                []string{"metrics"},
			Summary:             "List metric reduction rules",
			Description:         "Returns active metric volume-control (label reduction) rules.",
			RequestQuery:        new(metricreductionruletypes.ListReductionRulesParams),
			Response:            new(metricreductionruletypes.GettableReductionRules),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusUnauthorized, http.StatusNotImplemented, http.StatusUnavailableForLegalReasons, http.StatusInternalServerError},
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceMetricReductionRule.Scope(coretypes.VerbList)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceMetaResourceMetricReductionRule,
			Verb:     coretypes.VerbList,
			Category: coretypes.ActionCategoryDataAccess,
			Selector: coretypes.WildcardSelector,
		}),
	)).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/metric_reduction_rules", handler.New(
		provider.authzMiddleware.CheckResources(provider.metricReductionRuleHandler.Create, authtypes.SigNozAdminRoleName),
		handler.OpenAPIDef{
			ID:                  "CreateMetricReductionRule",
			Tags:                []string{"metrics"},
			Summary:             "Create a metric reduction rule",
			Description:         "Creates a volume-control rule for a metric and returns it with its id; fails if the metric already has a rule.",
			Request:             new(metricreductionruletypes.PostableReductionRule),
			RequestContentType:  "application/json",
			Response:            new(metricreductionruletypes.GettableReductionRule),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusCreated,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized, http.StatusForbidden, http.StatusConflict, http.StatusNotImplemented, http.StatusUnavailableForLegalReasons, http.StatusInternalServerError},
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceMetricReductionRule.Scope(coretypes.VerbCreate)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceMetaResourceMetricReductionRule,
			Verb:     coretypes.VerbCreate,
			Category: coretypes.ActionCategoryConfigurationChange,
			ID:       coretypes.ResponseJSONPath("data.id"),
			Selector: coretypes.WildcardSelector,
		}),
	)).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/metric_reduction_rules/stats", handler.New(
		provider.authzMiddleware.CheckResources(provider.metricReductionRuleHandler.Stats, authtypes.SigNozAdminRoleName, authtypes.SigNozEditorRoleName, authtypes.SigNozViewerRoleName),
		handler.OpenAPIDef{
			ID:                  "GetMetricReductionRuleStats",
			Tags:                []string{"metrics"},
			Summary:             "Metric reduction stats",
			Description:         "Returns total ingested vs retained series and the estimated monthly savings across all volume-control rules.",
			Response:            new(metricreductionruletypes.GettableReductionRuleStats),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusUnauthorized, http.StatusNotImplemented, http.StatusUnavailableForLegalReasons, http.StatusInternalServerError},
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceTelemetryResourceMetrics.Scope(coretypes.VerbRead)}),
		},
		handler.WithResourceDefs(handler.TelemetryResourceDef{
			Verb:      coretypes.VerbRead,
			Category:  coretypes.ActionCategoryDataAccess,
			Selector:  querybuilder.TelemetrySelector,
			Resources: querybuilder.BuilderQueryWildcardResources(coretypes.ResourceTelemetryResourceMetrics),
		}),
	)).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/metric_reduction_rules/timeseries", handler.New(
		provider.authzMiddleware.CheckResources(provider.metricReductionRuleHandler.Timeseries, authtypes.SigNozAdminRoleName, authtypes.SigNozEditorRoleName, authtypes.SigNozViewerRoleName),
		handler.OpenAPIDef{
			ID:                  "GetMetricReductionRuleTimeseries",
			Tags:                []string{"metrics"},
			Summary:             "Metric reduction volume over time",
			Description:         "Returns ingested vs retained series over time across all volume-control rules (hourly buckets), in the query-range time-series response shape.",
			Response:            new(querybuildertypesv5.QueryRangeResponse),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusUnauthorized, http.StatusNotImplemented, http.StatusUnavailableForLegalReasons, http.StatusInternalServerError},
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceTelemetryResourceMetrics.Scope(coretypes.VerbRead)}),
		},
		handler.WithResourceDefs(handler.TelemetryResourceDef{
			Verb:      coretypes.VerbRead,
			Category:  coretypes.ActionCategoryDataAccess,
			Selector:  querybuilder.TelemetrySelector,
			Resources: querybuilder.BuilderQueryWildcardResources(coretypes.ResourceTelemetryResourceMetrics),
		}),
	)).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/metric_reduction_rules/preview", handler.New(
		provider.authzMiddleware.CheckResources(provider.metricReductionRuleHandler.Preview, authtypes.SigNozAdminRoleName),
		handler.OpenAPIDef{
			ID:                  "PreviewMetricReductionRule",
			Tags:                []string{"metrics"},
			Summary:             "Preview a metric reduction rule",
			Description:         "Estimates the series reduction and related-asset impact of a candidate volume-control rule without persisting it.",
			Request:             new(metricreductionruletypes.PostableReductionRulePreview),
			RequestContentType:  "application/json",
			Response:            new(metricreductionruletypes.GettableReductionRulePreview),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized, http.StatusForbidden, http.StatusNotFound, http.StatusNotImplemented, http.StatusUnavailableForLegalReasons, http.StatusInternalServerError},
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceMetricReductionRule.Scope(coretypes.VerbCreate)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceMetaResourceMetricReductionRule,
			Verb:     coretypes.VerbCreate,
			Category: coretypes.ActionCategoryDataAccess,
			Selector: coretypes.WildcardSelector,
		}),
	)).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/metric_reduction_rules/{id}", handler.New(
		provider.authzMiddleware.CheckResources(provider.metricReductionRuleHandler.GetByID, authtypes.SigNozAdminRoleName, authtypes.SigNozEditorRoleName, authtypes.SigNozViewerRoleName),
		handler.OpenAPIDef{
			ID:                  "GetMetricReductionRuleByID",
			Tags:                []string{"metrics"},
			Summary:             "Get a metric reduction rule by id",
			Description:         "Returns a single volume-control rule by its id.",
			Response:            new(metricreductionruletypes.GettableReductionRule),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusUnauthorized, http.StatusNotFound, http.StatusNotImplemented, http.StatusUnavailableForLegalReasons, http.StatusInternalServerError},
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceMetricReductionRule.Scope(coretypes.VerbRead)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceMetaResourceMetricReductionRule,
			Verb:     coretypes.VerbRead,
			Category: coretypes.ActionCategoryDataAccess,
			ID:       coretypes.PathParam("id"),
			Selector: coretypes.IDSelector,
		}),
	)).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/metric_reduction_rules/{id}", handler.New(
		provider.authzMiddleware.CheckResources(provider.metricReductionRuleHandler.UpdateByID, authtypes.SigNozAdminRoleName),
		handler.OpenAPIDef{
			ID:                  "UpdateMetricReductionRuleByID",
			Tags:                []string{"metrics"},
			Summary:             "Update a metric reduction rule by id",
			Description:         "Updates the match type and labels of a volume-control rule by its id; the metric name is immutable.",
			Request:             new(metricreductionruletypes.UpdatableReductionRule),
			RequestContentType:  "application/json",
			Response:            new(metricreductionruletypes.GettableReductionRule),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized, http.StatusForbidden, http.StatusNotFound, http.StatusNotImplemented, http.StatusUnavailableForLegalReasons, http.StatusInternalServerError},
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceMetricReductionRule.Scope(coretypes.VerbUpdate)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceMetaResourceMetricReductionRule,
			Verb:     coretypes.VerbUpdate,
			Category: coretypes.ActionCategoryConfigurationChange,
			ID:       coretypes.PathParam("id"),
			Selector: coretypes.IDSelector,
		}),
	)).Methods(http.MethodPut).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/metric_reduction_rules/{id}", handler.New(
		provider.authzMiddleware.CheckResources(provider.metricReductionRuleHandler.DeleteByID, authtypes.SigNozAdminRoleName),
		handler.OpenAPIDef{
			ID:                "DeleteMetricReductionRuleByID",
			Tags:              []string{"metrics"},
			Summary:           "Delete a metric reduction rule by id",
			Description:       "Deletes a volume-control rule by its id.",
			SuccessStatusCode: http.StatusNoContent,
			ErrorStatusCodes:  []int{http.StatusUnauthorized, http.StatusForbidden, http.StatusNotFound, http.StatusNotImplemented, http.StatusUnavailableForLegalReasons, http.StatusInternalServerError},
			SecuritySchemes:   newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceMetricReductionRule.Scope(coretypes.VerbDelete)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceMetaResourceMetricReductionRule,
			Verb:     coretypes.VerbDelete,
			Category: coretypes.ActionCategoryConfigurationChange,
			ID:       coretypes.PathParam("id"),
			Selector: coretypes.IDSelector,
		}),
	)).Methods(http.MethodDelete).GetError(); err != nil {
		return err
	}

	return nil
}

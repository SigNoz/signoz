package signozapiserver

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/metricreductionruletypes"
	"github.com/gorilla/mux"
)

func (provider *provider) addMetricReductionRuleRoutes(router *mux.Router) error {
	if err := router.Handle("/api/v2/metrics/reduction_rules", handler.New(
		provider.authzMiddleware.ViewAccess(provider.metricReductionRuleHandler.List),
		handler.OpenAPIDef{
			ID:                  "ListMetricReductionRules",
			Tags:                []string{"metrics"},
			Summary:             "List metric reduction rules",
			Description:         "Returns active metric volume-control (label reduction) rules, sorted and paginated server-side. Enterprise feature.",
			RequestQuery:        new(metricreductionruletypes.ListReductionRulesParams),
			Response:            new(metricreductionruletypes.GettableReductionRules),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusUnauthorized, http.StatusNotImplemented, http.StatusUnavailableForLegalReasons, http.StatusInternalServerError},
			SecuritySchemes:     newSecuritySchemes(types.RoleViewer),
		},
	)).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/metrics/reduction_rules/preview", handler.New(
		provider.authzMiddleware.AdminAccess(provider.metricReductionRuleHandler.Preview),
		handler.OpenAPIDef{
			ID:                  "PreviewMetricReductionRule",
			Tags:                []string{"metrics"},
			Summary:             "Preview a metric reduction rule",
			Description:         "Estimates the series reduction and related-asset impact of a candidate volume-control rule without persisting it. Enterprise feature.",
			Request:             new(metricreductionruletypes.PostableReductionRulePreview),
			RequestContentType:  "application/json",
			Response:            new(metricreductionruletypes.GettableReductionRulePreview),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized, http.StatusForbidden, http.StatusNotFound, http.StatusNotImplemented, http.StatusUnavailableForLegalReasons, http.StatusInternalServerError},
			SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
		},
	)).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/metrics/{metric_name}/reduction_rule", handler.New(
		provider.authzMiddleware.ViewAccess(provider.metricReductionRuleHandler.Get),
		handler.OpenAPIDef{
			ID:                  "GetMetricReductionRule",
			Tags:                []string{"metrics"},
			Summary:             "Get a metric reduction rule",
			Description:         "Returns the active volume-control (label reduction) rule for a specified metric. Enterprise feature.",
			Response:            new(metricreductionruletypes.GettableReductionRule),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized, http.StatusNotFound, http.StatusNotImplemented, http.StatusUnavailableForLegalReasons, http.StatusInternalServerError},
			SecuritySchemes:     newSecuritySchemes(types.RoleViewer),
		},
	)).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/metrics/{metric_name}/reduction_rule", handler.New(
		provider.authzMiddleware.AdminAccess(provider.metricReductionRuleHandler.Upsert),
		handler.OpenAPIDef{
			ID:                  "UpsertMetricReductionRule",
			Tags:                []string{"metrics"},
			Summary:             "Create or update a metric reduction rule",
			Description:         "Creates or updates the volume-control (label reduction) rule for a specified metric. The rule takes effect after a short activation delay. Admin only; enterprise feature.",
			Request:             new(metricreductionruletypes.PostableReductionRule),
			RequestContentType:  "application/json",
			Response:            new(metricreductionruletypes.GettableReductionRule),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized, http.StatusForbidden, http.StatusNotFound, http.StatusNotImplemented, http.StatusUnavailableForLegalReasons, http.StatusInternalServerError},
			SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
		},
	)).Methods(http.MethodPut).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/metrics/{metric_name}/reduction_rule", handler.New(
		provider.authzMiddleware.AdminAccess(provider.metricReductionRuleHandler.Delete),
		handler.OpenAPIDef{
			ID:                  "DeleteMetricReductionRule",
			Tags:                []string{"metrics"},
			Summary:             "Delete a metric reduction rule",
			Description:         "Removes the volume-control (label reduction) rule for a specified metric, reverting it to full fidelity. Admin only; enterprise feature.",
			Response:            nil,
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusNoContent,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized, http.StatusForbidden, http.StatusNotFound, http.StatusNotImplemented, http.StatusUnavailableForLegalReasons, http.StatusInternalServerError},
			SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
		},
	)).Methods(http.MethodDelete).GetError(); err != nil {
		return err
	}

	return nil
}

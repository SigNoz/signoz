package signozapiserver

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/gorilla/mux"
)

func (provider *provider) addRulerRoutes(router *mux.Router) error {
	if err := router.Handle("/api/v2/rules", handler.New(
		provider.authzMiddleware.CheckResources(provider.rulerHandler.ListRules, authtypes.SigNozAdminRoleName, authtypes.SigNozEditorRoleName, authtypes.SigNozViewerRoleName),
		handler.OpenAPIDef{
			ID:                  "ListRules",
			Tags:                []string{"rules"},
			Summary:             "List alert rules",
			Description:         "This endpoint lists all alert rules with their current evaluation state. Deprecated: use ListRulesV3, which supports filtering, sorting and pagination.",
			Response:            make([]*ruletypes.Rule, 0),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			Deprecated:          true,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceRule.Scope(coretypes.VerbList)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceMetaResourceRule,
			Verb:     coretypes.VerbList,
			Category: coretypes.ActionCategoryDataAccess,
			Selector: coretypes.WildcardSelector,
		}),
	)).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v3/rules", handler.New(
		provider.authzMiddleware.CheckResources(provider.rulerHandler.ListRulesV3, authtypes.SigNozAdminRoleName, authtypes.SigNozEditorRoleName, authtypes.SigNozViewerRoleName),
		handler.OpenAPIDef{
			ID:                  "ListRulesV3",
			Tags:                []string{"rules"},
			Summary:             "List alert rules (v3)",
			Description:         "Returns a page of alert rules with their current evaluation state, trimmed to the fields the list page renders. Supports a filter DSL (`query`), a repeated `states` filter applied after the state overlay, sort (`updated_at`/`created_at`/`name`/`state`/`severity`), order (`asc`/`desc`), and offset-based pagination (`limit`/`offset`). The response also carries the org's label pairs and the reserved filter keys for building filter suggestions.",
			RequestQuery:        new(ruletypes.ListRulesParams),
			Response:            new(ruletypes.ListableRules),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusBadRequest},
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceRule.Scope(coretypes.VerbList)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceMetaResourceRule,
			Verb:     coretypes.VerbList,
			Category: coretypes.ActionCategoryDataAccess,
			Selector: coretypes.WildcardSelector,
		}),
	)).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/rules/{id}", handler.New(
		provider.authzMiddleware.CheckResources(provider.rulerHandler.GetRuleByID, authtypes.SigNozAdminRoleName, authtypes.SigNozEditorRoleName, authtypes.SigNozViewerRoleName),
		handler.OpenAPIDef{
			ID:                  "GetRuleByID",
			Tags:                []string{"rules"},
			Summary:             "Get alert rule by ID",
			Description:         "This endpoint returns an alert rule by ID",
			Response:            new(ruletypes.Rule),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusNotFound},
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceRule.Scope(coretypes.VerbRead)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceMetaResourceRule,
			Verb:     coretypes.VerbRead,
			Category: coretypes.ActionCategoryDataAccess,
			ID:       coretypes.PathParam("id"),
			Selector: coretypes.IDSelector,
		}),
	)).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/rules", handler.New(
		provider.authzMiddleware.CheckResources(provider.rulerHandler.CreateRule, authtypes.SigNozAdminRoleName, authtypes.SigNozEditorRoleName),
		handler.OpenAPIDef{
			ID:                  "CreateRule",
			Tags:                []string{"rules"},
			Summary:             "Create alert rule",
			Description:         "This endpoint creates a new alert rule",
			Request:             new(ruletypes.PostableRule),
			RequestContentType:  "application/json",
			RequestExamples:     postableRuleExamples(),
			Response:            new(ruletypes.Rule),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusCreated,
			ErrorStatusCodes:    []int{http.StatusBadRequest},
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceRule.Scope(coretypes.VerbCreate)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceMetaResourceRule,
			Verb:     coretypes.VerbCreate,
			Category: coretypes.ActionCategoryConfigurationChange,
			ID:       coretypes.ResponseJSONPath("data.id"),
			Selector: coretypes.WildcardSelector,
		}),
	)).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/rules/{id}", handler.New(
		provider.authzMiddleware.CheckResources(provider.rulerHandler.UpdateRuleByID, authtypes.SigNozAdminRoleName, authtypes.SigNozEditorRoleName),
		handler.OpenAPIDef{
			ID:                 "UpdateRuleByID",
			Tags:               []string{"rules"},
			Summary:            "Update alert rule",
			Description:        "This endpoint updates an alert rule by ID",
			Request:            new(ruletypes.PostableRule),
			RequestContentType: "application/json",
			RequestExamples:    postableRuleExamples(),
			SuccessStatusCode:  http.StatusNoContent,
			ErrorStatusCodes:   []int{http.StatusBadRequest, http.StatusNotFound},
			SecuritySchemes:    newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceRule.Scope(coretypes.VerbUpdate)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceMetaResourceRule,
			Verb:     coretypes.VerbUpdate,
			Category: coretypes.ActionCategoryConfigurationChange,
			ID:       coretypes.PathParam("id"),
			Selector: coretypes.IDSelector,
		}),
	)).Methods(http.MethodPut).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/rules/{id}", handler.New(
		provider.authzMiddleware.CheckResources(provider.rulerHandler.DeleteRuleByID, authtypes.SigNozAdminRoleName, authtypes.SigNozEditorRoleName),
		handler.OpenAPIDef{
			ID:                "DeleteRuleByID",
			Tags:              []string{"rules"},
			Summary:           "Delete alert rule",
			Description:       "This endpoint deletes an alert rule by ID",
			SuccessStatusCode: http.StatusNoContent,
			ErrorStatusCodes:  []int{http.StatusNotFound},
			SecuritySchemes:   newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceRule.Scope(coretypes.VerbDelete)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceMetaResourceRule,
			Verb:     coretypes.VerbDelete,
			Category: coretypes.ActionCategoryConfigurationChange,
			ID:       coretypes.PathParam("id"),
			Selector: coretypes.IDSelector,
		}),
	)).Methods(http.MethodDelete).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/rules/{id}", handler.New(
		provider.authzMiddleware.CheckResources(provider.rulerHandler.PatchRuleByID, authtypes.SigNozAdminRoleName, authtypes.SigNozEditorRoleName),
		handler.OpenAPIDef{
			ID:                  "PatchRuleByID",
			Tags:                []string{"rules"},
			Summary:             "Patch alert rule",
			Description:         "This endpoint applies a partial update to an alert rule by ID",
			Request:             new(ruletypes.PostableRule),
			RequestContentType:  "application/json",
			RequestExamples:     postableRuleExamples(),
			Response:            new(ruletypes.Rule),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusNotFound},
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceRule.Scope(coretypes.VerbUpdate)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceMetaResourceRule,
			Verb:     coretypes.VerbUpdate,
			Category: coretypes.ActionCategoryConfigurationChange,
			ID:       coretypes.PathParam("id"),
			Selector: coretypes.IDSelector,
		}),
	)).Methods(http.MethodPatch).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/rules/test", handler.New(
		provider.authzMiddleware.CheckResources(provider.rulerHandler.TestRule, authtypes.SigNozAdminRoleName, authtypes.SigNozEditorRoleName),
		handler.OpenAPIDef{
			ID:                  "TestRule",
			Tags:                []string{"rules"},
			Summary:             "Test alert rule",
			Description:         "This endpoint fires a test notification for the given rule definition",
			Request:             new(ruletypes.PostableRule),
			RequestContentType:  "application/json",
			RequestExamples:     postableRuleExamples(),
			Response:            new(ruletypes.GettableTestRule),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusBadRequest},
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceRule.Scope(coretypes.VerbCreate)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceMetaResourceRule,
			Verb:     coretypes.VerbCreate,
			Category: coretypes.ActionCategoryConfigurationChange,
			Selector: coretypes.WildcardSelector,
		}),
	)).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/rule_views", handler.New(
		provider.authzMiddleware.CheckResources(provider.rulerHandler.ListRuleViews, authtypes.SigNozAdminRoleName, authtypes.SigNozEditorRoleName, authtypes.SigNozViewerRoleName),
		handler.OpenAPIDef{
			ID:                  "ListRuleViews",
			Tags:                []string{"rules"},
			Summary:             "List rule saved views",
			Description:         "Returns every saved view in the calling user's org. Saved views are shared org-wide.",
			Response:            new(ruletypes.ListableRuleViews),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceRule.Scope(coretypes.VerbList)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceMetaResourceRule,
			Verb:     coretypes.VerbList,
			Category: coretypes.ActionCategoryDataAccess,
			Selector: coretypes.WildcardSelector,
		}),
	)).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/rule_views", handler.New(
		provider.authzMiddleware.CheckResources(provider.rulerHandler.CreateRuleView, authtypes.SigNozAdminRoleName, authtypes.SigNozEditorRoleName, authtypes.SigNozViewerRoleName),
		handler.OpenAPIDef{
			ID:                  "CreateRuleView",
			Tags:                []string{"rules"},
			Summary:             "Create rule saved view",
			Description:         "Persists the calling user's rule listing state (query, states, sort, order) as a named, reusable view shared across the org.",
			Request:             new(ruletypes.PostableRuleView),
			RequestContentType:  "application/json",
			Response:            new(ruletypes.RuleView),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusCreated,
			ErrorStatusCodes:    []int{http.StatusBadRequest},
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceRule.Scope(coretypes.VerbList)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceMetaResourceRule,
			Verb:     coretypes.VerbList,
			Category: coretypes.ActionCategoryConfigurationChange,
			Selector: coretypes.WildcardSelector,
		}),
	)).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/rule_views/{id}", handler.New(
		provider.authzMiddleware.CheckResources(provider.rulerHandler.UpdateRuleView, authtypes.SigNozAdminRoleName, authtypes.SigNozEditorRoleName, authtypes.SigNozViewerRoleName),
		handler.OpenAPIDef{
			ID:                  "UpdateRuleView",
			Tags:                []string{"rules"},
			Summary:             "Update rule saved view",
			Description:         "Replaces a saved view's name and data. Saved views are shared org-wide.",
			Request:             new(ruletypes.UpdatableRuleView),
			RequestContentType:  "application/json",
			Response:            new(ruletypes.RuleView),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusNotFound},
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceRule.Scope(coretypes.VerbList)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceMetaResourceRule,
			Verb:     coretypes.VerbList,
			Category: coretypes.ActionCategoryConfigurationChange,
			Selector: coretypes.WildcardSelector,
		}),
	)).Methods(http.MethodPut).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/rule_views/{id}", handler.New(
		provider.authzMiddleware.CheckResources(provider.rulerHandler.DeleteRuleView, authtypes.SigNozAdminRoleName, authtypes.SigNozEditorRoleName, authtypes.SigNozViewerRoleName),
		handler.OpenAPIDef{
			ID:                  "DeleteRuleView",
			Tags:                []string{"rules"},
			Summary:             "Delete rule saved view",
			Description:         "Removes a saved view. Saved views are shared org-wide. Deleting a non-existent view returns 404.",
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusNoContent,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusNotFound},
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceRule.Scope(coretypes.VerbList)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceMetaResourceRule,
			Verb:     coretypes.VerbList,
			Category: coretypes.ActionCategoryConfigurationChange,
			Selector: coretypes.WildcardSelector,
		}),
	)).Methods(http.MethodDelete).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/downtime_schedules", handler.New(
		provider.authzMiddleware.CheckResources(provider.rulerHandler.ListDowntimeSchedules, authtypes.SigNozAdminRoleName, authtypes.SigNozEditorRoleName, authtypes.SigNozViewerRoleName),
		handler.OpenAPIDef{
			ID:                  "ListDowntimeSchedules",
			Tags:                []string{"downtimeschedules"},
			Summary:             "List downtime schedules",
			Description:         "This endpoint lists all planned maintenance / downtime schedules",
			RequestQuery:        new(alertmanagertypes.ListPlannedMaintenanceParams),
			Response:            make([]*alertmanagertypes.PlannedMaintenance, 0),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourcePlannedMaintenance.Scope(coretypes.VerbList)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceMetaResourcePlannedMaintenance,
			Verb:     coretypes.VerbList,
			Category: coretypes.ActionCategoryDataAccess,
			Selector: coretypes.WildcardSelector,
		}),
	)).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/downtime_schedules/{id}", handler.New(
		provider.authzMiddleware.CheckResources(provider.rulerHandler.GetDowntimeScheduleByID, authtypes.SigNozAdminRoleName, authtypes.SigNozEditorRoleName, authtypes.SigNozViewerRoleName),
		handler.OpenAPIDef{
			ID:                  "GetDowntimeScheduleByID",
			Tags:                []string{"downtimeschedules"},
			Summary:             "Get downtime schedule by ID",
			Description:         "This endpoint returns a downtime schedule by ID",
			Response:            new(alertmanagertypes.PlannedMaintenance),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusNotFound},
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourcePlannedMaintenance.Scope(coretypes.VerbRead)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceMetaResourcePlannedMaintenance,
			Verb:     coretypes.VerbRead,
			Category: coretypes.ActionCategoryDataAccess,
			ID:       coretypes.PathParam("id"),
			Selector: coretypes.IDSelector,
		}),
	)).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/downtime_schedules", handler.New(
		provider.authzMiddleware.CheckResources(provider.rulerHandler.CreateDowntimeSchedule, authtypes.SigNozAdminRoleName, authtypes.SigNozEditorRoleName),
		handler.OpenAPIDef{
			ID:                  "CreateDowntimeSchedule",
			Tags:                []string{"downtimeschedules"},
			Summary:             "Create downtime schedule",
			Description:         "This endpoint creates a new planned maintenance / downtime schedule",
			Request:             new(alertmanagertypes.PostablePlannedMaintenance),
			RequestContentType:  "application/json",
			Response:            new(alertmanagertypes.PlannedMaintenance),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusCreated,
			ErrorStatusCodes:    []int{http.StatusBadRequest},
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourcePlannedMaintenance.Scope(coretypes.VerbCreate)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceMetaResourcePlannedMaintenance,
			Verb:     coretypes.VerbCreate,
			Category: coretypes.ActionCategoryConfigurationChange,
			ID:       coretypes.ResponseJSONPath("data.id"),
			Selector: coretypes.WildcardSelector,
		}),
	)).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/downtime_schedules/{id}", handler.New(
		provider.authzMiddleware.CheckResources(provider.rulerHandler.UpdateDowntimeScheduleByID, authtypes.SigNozAdminRoleName, authtypes.SigNozEditorRoleName),
		handler.OpenAPIDef{
			ID:                 "UpdateDowntimeScheduleByID",
			Tags:               []string{"downtimeschedules"},
			Summary:            "Update downtime schedule",
			Description:        "This endpoint updates a downtime schedule by ID",
			Request:            new(alertmanagertypes.PostablePlannedMaintenance),
			RequestContentType: "application/json",
			SuccessStatusCode:  http.StatusNoContent,
			ErrorStatusCodes:   []int{http.StatusBadRequest, http.StatusNotFound},
			SecuritySchemes:    newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourcePlannedMaintenance.Scope(coretypes.VerbUpdate)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceMetaResourcePlannedMaintenance,
			Verb:     coretypes.VerbUpdate,
			Category: coretypes.ActionCategoryConfigurationChange,
			ID:       coretypes.PathParam("id"),
			Selector: coretypes.IDSelector,
		}),
	)).Methods(http.MethodPut).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/downtime_schedules/{id}", handler.New(
		provider.authzMiddleware.CheckResources(provider.rulerHandler.DeleteDowntimeScheduleByID, authtypes.SigNozAdminRoleName, authtypes.SigNozEditorRoleName),
		handler.OpenAPIDef{
			ID:                "DeleteDowntimeScheduleByID",
			Tags:              []string{"downtimeschedules"},
			Summary:           "Delete downtime schedule",
			Description:       "This endpoint deletes a downtime schedule by ID",
			SuccessStatusCode: http.StatusNoContent,
			ErrorStatusCodes:  []int{http.StatusNotFound},
			SecuritySchemes:   newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourcePlannedMaintenance.Scope(coretypes.VerbDelete)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceMetaResourcePlannedMaintenance,
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

package signozapiserver

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/gorilla/mux"
)

func (provider *provider) addRulerRoutes(router *mux.Router) error {
	if err := router.Handle("/api/v2/rules", handler.New(provider.authzMiddleware.ViewAccess(provider.rulerHandler.ListRules), handler.OpenAPIDef{
		ID:                  "ListRules",
		Tags:                []string{"rules"},
		Summary:             "List alert rules",
		Description:         "This endpoint lists all alert rules with their current evaluation state",
		Response:            make([]*ruletypes.Rule, 0),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		SecuritySchemes:     newSecuritySchemes(types.RoleViewer),
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/rules/{id}", handler.New(provider.authzMiddleware.ViewAccess(provider.rulerHandler.GetRuleByID), handler.OpenAPIDef{
		ID:                  "GetRuleByID",
		Tags:                []string{"rules"},
		Summary:             "Get alert rule by ID",
		Description:         "This endpoint returns an alert rule by ID",
		Response:            new(ruletypes.Rule),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{http.StatusNotFound},
		SecuritySchemes:     newSecuritySchemes(types.RoleViewer),
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/rules", handler.New(provider.authzMiddleware.EditAccess(provider.rulerHandler.CreateRule), handler.OpenAPIDef{
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
		SecuritySchemes:     newSecuritySchemes(types.RoleEditor),
	})).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/rules/{id}", handler.New(provider.authzMiddleware.EditAccess(provider.rulerHandler.UpdateRuleByID), handler.OpenAPIDef{
		ID:                 "UpdateRuleByID",
		Tags:               []string{"rules"},
		Summary:            "Update alert rule",
		Description:        "This endpoint updates an alert rule by ID",
		Request:            new(ruletypes.PostableRule),
		RequestContentType: "application/json",
		RequestExamples:    postableRuleExamples(),
		SuccessStatusCode:  http.StatusNoContent,
		ErrorStatusCodes:   []int{http.StatusBadRequest, http.StatusNotFound},
		SecuritySchemes:    newSecuritySchemes(types.RoleEditor),
	})).Methods(http.MethodPut).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/rules/{id}", handler.New(provider.authzMiddleware.EditAccess(provider.rulerHandler.DeleteRuleByID), handler.OpenAPIDef{
		ID:                "DeleteRuleByID",
		Tags:              []string{"rules"},
		Summary:           "Delete alert rule",
		Description:       "This endpoint deletes an alert rule by ID",
		SuccessStatusCode: http.StatusNoContent,
		ErrorStatusCodes:  []int{http.StatusNotFound},
		SecuritySchemes:   newSecuritySchemes(types.RoleEditor),
	})).Methods(http.MethodDelete).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/rules/{id}", handler.New(provider.authzMiddleware.EditAccess(provider.rulerHandler.PatchRuleByID), handler.OpenAPIDef{
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
		SecuritySchemes:     newSecuritySchemes(types.RoleEditor),
	})).Methods(http.MethodPatch).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/rules/test", handler.New(provider.authzMiddleware.EditAccess(provider.rulerHandler.TestRule), handler.OpenAPIDef{
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
		SecuritySchemes:     newSecuritySchemes(types.RoleEditor),
	})).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/downtime_schedules", handler.New(provider.authzMiddleware.ViewAccess(provider.rulerHandler.ListDowntimeSchedules), handler.OpenAPIDef{
		ID:                  "ListDowntimeSchedules",
		Tags:                []string{"downtimeschedules"},
		Summary:             "List downtime schedules",
		Description:         "This endpoint lists all planned maintenance / downtime schedules",
		RequestQuery:        new(ruletypes.ListPlannedMaintenanceParams),
		Response:            make([]*ruletypes.PlannedMaintenance, 0),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		SecuritySchemes:     newSecuritySchemes(types.RoleViewer),
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/downtime_schedules/{id}", handler.New(provider.authzMiddleware.ViewAccess(provider.rulerHandler.GetDowntimeScheduleByID), handler.OpenAPIDef{
		ID:                  "GetDowntimeScheduleByID",
		Tags:                []string{"downtimeschedules"},
		Summary:             "Get downtime schedule by ID",
		Description:         "This endpoint returns a downtime schedule by ID",
		Response:            new(ruletypes.PlannedMaintenance),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{http.StatusNotFound},
		SecuritySchemes:     newSecuritySchemes(types.RoleViewer),
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/downtime_schedules", handler.New(provider.authzMiddleware.EditAccess(provider.rulerHandler.CreateDowntimeSchedule), handler.OpenAPIDef{
		ID:                  "CreateDowntimeSchedule",
		Tags:                []string{"downtimeschedules"},
		Summary:             "Create downtime schedule",
		Description:         "This endpoint creates a new planned maintenance / downtime schedule",
		Request:             new(ruletypes.PostablePlannedMaintenance),
		RequestContentType:  "application/json",
		Response:            new(ruletypes.PlannedMaintenance),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusCreated,
		ErrorStatusCodes:    []int{http.StatusBadRequest},
		SecuritySchemes:     newSecuritySchemes(types.RoleEditor),
	})).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/downtime_schedules/{id}", handler.New(provider.authzMiddleware.EditAccess(provider.rulerHandler.UpdateDowntimeScheduleByID), handler.OpenAPIDef{
		ID:                 "UpdateDowntimeScheduleByID",
		Tags:               []string{"downtimeschedules"},
		Summary:            "Update downtime schedule",
		Description:        "This endpoint updates a downtime schedule by ID",
		Request:            new(ruletypes.PostablePlannedMaintenance),
		RequestContentType: "application/json",
		SuccessStatusCode:  http.StatusNoContent,
		ErrorStatusCodes:   []int{http.StatusBadRequest, http.StatusNotFound},
		SecuritySchemes:    newSecuritySchemes(types.RoleEditor),
	})).Methods(http.MethodPut).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/downtime_schedules/{id}", handler.New(provider.authzMiddleware.EditAccess(provider.rulerHandler.DeleteDowntimeScheduleByID), handler.OpenAPIDef{
		ID:                "DeleteDowntimeScheduleByID",
		Tags:              []string{"downtimeschedules"},
		Summary:           "Delete downtime schedule",
		Description:       "This endpoint deletes a downtime schedule by ID",
		SuccessStatusCode: http.StatusNoContent,
		ErrorStatusCodes:  []int{http.StatusNotFound},
		SecuritySchemes:   newSecuritySchemes(types.RoleEditor),
	})).Methods(http.MethodDelete).GetError(); err != nil {
		return err
	}

	return nil
}

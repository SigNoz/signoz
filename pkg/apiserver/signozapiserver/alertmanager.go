package signozapiserver

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/gorilla/mux"
)

func (provider *provider) addAlertmanagerRoutes(router *mux.Router) error {
	// Channels
	if err := router.Handle("/api/v1/channels", handler.New(provider.authZ.ViewAccess(provider.alertmanagerHandler.ListChannels), handler.OpenAPIDef{
		ID:                  "ListChannels",
		Tags:                []string{"channels"},
		Summary:             "List notification channels",
		Description:         "This endpoint lists all notification channels for the organization",
		Request:             nil,
		RequestContentType:  "",
		Response:            make([]*alertmanagertypes.Channel, 0),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleViewer),
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/channels/{id}", handler.New(provider.authZ.ViewAccess(provider.alertmanagerHandler.GetChannelByID), handler.OpenAPIDef{
		ID:                  "GetChannelByID",
		Tags:                []string{"channels"},
		Summary:             "Get notification channel by ID",
		Description:         "This endpoint returns a notification channel by ID",
		Request:             nil,
		RequestContentType:  "",
		Response:            new(alertmanagertypes.Channel),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{http.StatusNotFound},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleViewer),
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/channels", handler.New(provider.authZ.EditAccess(provider.alertmanagerHandler.CreateChannel), handler.OpenAPIDef{
		ID:                  "CreateChannel",
		Tags:                []string{"channels"},
		Summary:             "Create notification channel",
		Description:         "This endpoint creates a notification channel",
		Request:             nil,
		RequestContentType:  "application/json",
		Response:            new(alertmanagertypes.Channel),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusCreated,
		ErrorStatusCodes:    []int{http.StatusBadRequest},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleEditor),
	})).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/channels/{id}", handler.New(provider.authZ.AdminAccess(provider.alertmanagerHandler.UpdateChannelByID), handler.OpenAPIDef{
		ID:                  "UpdateChannelByID",
		Tags:                []string{"channels"},
		Summary:             "Update notification channel",
		Description:         "This endpoint updates a notification channel by ID",
		Request:             nil,
		RequestContentType:  "application/json",
		Response:            nil,
		ResponseContentType: "",
		SuccessStatusCode:   http.StatusNoContent,
		ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusNotFound},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
	})).Methods(http.MethodPut).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/channels/{id}", handler.New(provider.authZ.AdminAccess(provider.alertmanagerHandler.DeleteChannelByID), handler.OpenAPIDef{
		ID:                  "DeleteChannelByID",
		Tags:                []string{"channels"},
		Summary:             "Delete notification channel",
		Description:         "This endpoint deletes a notification channel by ID",
		Request:             nil,
		RequestContentType:  "",
		Response:            nil,
		ResponseContentType: "",
		SuccessStatusCode:   http.StatusNoContent,
		ErrorStatusCodes:    []int{http.StatusNotFound},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
	})).Methods(http.MethodDelete).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/channels/test", handler.New(provider.authZ.EditAccess(provider.alertmanagerHandler.TestReceiver), handler.OpenAPIDef{
		ID:                  "TestChannel",
		Tags:                []string{"channels"},
		Summary:             "Test notification channel",
		Description:         "This endpoint tests a notification channel by sending a test notification",
		Request:             nil,
		RequestContentType:  "application/json",
		Response:            nil,
		ResponseContentType: "",
		SuccessStatusCode:   http.StatusNoContent,
		ErrorStatusCodes:    []int{http.StatusBadRequest},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleEditor),
	})).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/testChannel", handler.New(provider.authZ.EditAccess(provider.alertmanagerHandler.TestReceiver), handler.OpenAPIDef{
		ID:                  "TestChannelDeprecated",
		Tags:                []string{"channels"},
		Summary:             "Test notification channel (deprecated)",
		Description:         "Deprecated: use /api/v1/channels/test instead",
		Request:             nil,
		RequestContentType:  "application/json",
		Response:            nil,
		ResponseContentType: "",
		SuccessStatusCode:   http.StatusNoContent,
		ErrorStatusCodes:    []int{http.StatusBadRequest},
		Deprecated:          true,
		SecuritySchemes:     newSecuritySchemes(types.RoleEditor),
	})).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	// Route Policies
	if err := router.Handle("/api/v1/route_policies", handler.New(provider.authZ.ViewAccess(provider.alertmanagerHandler.GetAllRoutePolicies), handler.OpenAPIDef{
		ID:                  "GetAllRoutePolicies",
		Tags:                []string{"route-policies"},
		Summary:             "List route policies",
		Description:         "This endpoint lists all route policies for the organization",
		Request:             nil,
		RequestContentType:  "",
		Response:            make([]*alertmanagertypes.GettableRoutePolicy, 0),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleViewer),
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/route_policies/{id}", handler.New(provider.authZ.ViewAccess(provider.alertmanagerHandler.GetRoutePolicyByID), handler.OpenAPIDef{
		ID:                  "GetRoutePolicyByID",
		Tags:                []string{"route-policies"},
		Summary:             "Get route policy by ID",
		Description:         "This endpoint returns a route policy by ID",
		Request:             nil,
		RequestContentType:  "",
		Response:            new(alertmanagertypes.GettableRoutePolicy),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{http.StatusNotFound},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleViewer),
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/route_policies", handler.New(provider.authZ.AdminAccess(provider.alertmanagerHandler.CreateRoutePolicy), handler.OpenAPIDef{
		ID:                  "CreateRoutePolicy",
		Tags:                []string{"route-policies"},
		Summary:             "Create route policy",
		Description:         "This endpoint creates a route policy",
		Request:             new(alertmanagertypes.PostableRoutePolicy),
		RequestContentType:  "application/json",
		Response:            new(alertmanagertypes.GettableRoutePolicy),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusCreated,
		ErrorStatusCodes:    []int{http.StatusBadRequest},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
	})).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/route_policies/{id}", handler.New(provider.authZ.AdminAccess(provider.alertmanagerHandler.UpdateRoutePolicy), handler.OpenAPIDef{
		ID:                  "UpdateRoutePolicy",
		Tags:                []string{"route-policies"},
		Summary:             "Update route policy",
		Description:         "This endpoint updates a route policy by ID",
		Request:             new(alertmanagertypes.PostableRoutePolicy),
		RequestContentType:  "application/json",
		Response:            new(alertmanagertypes.GettableRoutePolicy),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusNotFound},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
	})).Methods(http.MethodPut).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/route_policies/{id}", handler.New(provider.authZ.AdminAccess(provider.alertmanagerHandler.DeleteRoutePolicyByID), handler.OpenAPIDef{
		ID:                  "DeleteRoutePolicyByID",
		Tags:                []string{"route-policies"},
		Summary:             "Delete route policy",
		Description:         "This endpoint deletes a route policy by ID",
		Request:             nil,
		RequestContentType:  "",
		Response:            nil,
		ResponseContentType: "",
		SuccessStatusCode:   http.StatusNoContent,
		ErrorStatusCodes:    []int{http.StatusNotFound},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
	})).Methods(http.MethodDelete).GetError(); err != nil {
		return err
	}

	// Alerts
	if err := router.Handle("/api/v1/alerts", handler.New(provider.authZ.ViewAccess(provider.alertmanagerHandler.GetAlerts), handler.OpenAPIDef{
		ID:                  "GetAlerts",
		Tags:                []string{"alerts"},
		Summary:             "Get alerts",
		Description:         "This endpoint returns alerts for the organization",
		Request:             nil,
		RequestContentType:  "",
		Response:            nil,
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleViewer),
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	return nil
}

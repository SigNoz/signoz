package signozapiserver

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/types/subscriptiontypes"
	"github.com/gorilla/mux"
)

func (provider *provider) addSubscriptionRoutes(router *mux.Router) error {
	if err := router.Handle("/api/v1/subscriptions", handler.New(provider.authzMiddleware.CheckResources(provider.subscriptionHandler.Create, authtypes.SigNozAdminRoleName), handler.OpenAPIDef{
		ID:                  "CreateSubscription",
		Tags:                []string{"subscriptions"},
		Summary:             "Create a subscription.",
		Description:         "This endpoint creates a subscription for the organization.",
		Request:             new(subscriptiontypes.PostableSubscription),
		RequestContentType:  "application/json",
		Response:            new(subscriptiontypes.GettableSubscription),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusCreated,
		ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusNotFound, http.StatusConflict},
		Deprecated:          false,
		SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceSubscription.Scope(coretypes.VerbCreate)}),
	}, handler.WithResourceDefs(handler.BasicResourceDef{
		Resource: coretypes.ResourceMetaResourceSubscription,
		Verb:     coretypes.VerbCreate,
		Category: coretypes.ActionCategoryConfigurationChange,
		Selector: coretypes.WildcardSelector,
	}))).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/subscriptions", handler.New(provider.authzMiddleware.CheckResources(provider.subscriptionHandler.Update, authtypes.SigNozAdminRoleName), handler.OpenAPIDef{
		ID:                  "UpdateSubscription",
		Tags:                []string{"subscriptions"},
		Summary:             "Update the subscription.",
		Description:         "This endpoint updates the organization's subscription.",
		Request:             new(subscriptiontypes.PostableSubscription),
		RequestContentType:  "application/json",
		Response:            new(subscriptiontypes.GettableSubscription),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusNotFound},
		Deprecated:          false,
		SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceSubscription.Scope(coretypes.VerbList), coretypes.ResourceMetaResourceSubscription.Scope(coretypes.VerbUpdate)}),
	}, handler.WithResourceDefs(
		handler.BasicResourceDef{
			Resource: coretypes.ResourceMetaResourceSubscription,
			Verb:     coretypes.VerbList,
			Category: coretypes.ActionCategoryDataAccess,
			Selector: coretypes.WildcardSelector,
		},
		handler.BasicResourceDef{
			Resource: coretypes.ResourceMetaResourceSubscription,
			Verb:     coretypes.VerbUpdate,
			Category: coretypes.ActionCategoryConfigurationChange,
			Selector: coretypes.WildcardSelector,
		},
	))).Methods(http.MethodPut).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/subscriptions", handler.New(provider.authzMiddleware.CheckResources(provider.subscriptionHandler.Get, authtypes.SigNozAdminRoleName), handler.OpenAPIDef{
		ID:                  "GetSubscription",
		Tags:                []string{"subscriptions"},
		Summary:             "Get the subscription.",
		Description:         "This endpoint gets the organization's subscription along with its usage and billing details.",
		Request:             nil,
		RequestContentType:  "",
		Response:            new(subscriptiontypes.GettableSubscriptionUsage),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusNotFound},
		Deprecated:          false,
		SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceSubscription.Scope(coretypes.VerbRead)}),
	}, handler.WithResourceDefs(handler.BasicResourceDef{
		Resource: coretypes.ResourceMetaResourceSubscription,
		Verb:     coretypes.VerbRead,
		Category: coretypes.ActionCategoryDataAccess,
		Selector: coretypes.WildcardSelector,
	}))).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	return nil
}

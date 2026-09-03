package signozapiserver

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/types/zeustypes"
	"github.com/gorilla/mux"
)

func (provider *provider) addZeusRoutes(router *mux.Router) error {
	if err := router.Handle("/api/v2/zeus/profiles", handler.New(provider.authzMiddleware.AdminAccess(provider.zeusHandler.PutProfile), handler.OpenAPIDef{
		ID:                  "PutProfile",
		Tags:                []string{"zeus"},
		Summary:             "Put profile in Zeus for a deployment.",
		Description:         "This endpoint saves the profile of a deployment to zeus.",
		Request:             new(zeustypes.PostableProfile),
		RequestContentType:  "application/json",
		Response:            nil,
		ResponseContentType: "",
		SuccessStatusCode:   http.StatusNoContent,
		ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized, http.StatusForbidden, http.StatusNotFound, http.StatusConflict},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
	})).Methods(http.MethodPut).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/zeus/hosts", handler.New(provider.authzMiddleware.CheckResources(provider.zeusHandler.GetHosts, authtypes.SigNozAdminRoleName, authtypes.SigNozEditorRoleName, authtypes.SigNozViewerRoleName), handler.OpenAPIDef{
		ID:                  "GetHosts",
		Tags:                []string{"zeus"},
		Summary:             "Get host info from Zeus.",
		Description:         "This endpoint gets the host info from zeus.",
		Request:             nil,
		RequestContentType:  "",
		Response:            new(zeustypes.GettableHost),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized, http.StatusForbidden, http.StatusNotFound},
		Deprecated:          false,
		SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceDeploymentHost.Scope(coretypes.VerbList)}),
	}, handler.WithResourceDefs(handler.BasicResourceDef{
		Resource: coretypes.ResourceMetaResourceDeploymentHost,
		Verb:     coretypes.VerbList,
		Category: coretypes.ActionCategoryDataAccess,
		Selector: coretypes.WildcardSelector,
	}))).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/zeus/hosts", handler.New(provider.authzMiddleware.CheckResources(provider.zeusHandler.PutHost, authtypes.SigNozAdminRoleName), handler.OpenAPIDef{
		ID:                  "PutHost",
		Tags:                []string{"zeus"},
		Summary:             "Put host in Zeus for a deployment.",
		Description:         "This endpoint saves the host of a deployment to zeus.",
		Request:             new(zeustypes.PostableHost),
		RequestContentType:  "application/json",
		Response:            nil,
		ResponseContentType: "",
		SuccessStatusCode:   http.StatusNoContent,
		ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized, http.StatusForbidden, http.StatusNotFound, http.StatusConflict},
		Deprecated:          false,
		SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceDeploymentHost.Scope(coretypes.VerbUpdate)}),
	}, handler.WithResourceDefs(handler.BasicResourceDef{
		Resource: coretypes.ResourceMetaResourceDeploymentHost,
		Verb:     coretypes.VerbUpdate,
		Category: coretypes.ActionCategoryConfigurationChange,
		ID:       coretypes.BodyJSONPath("name"),
		Selector: coretypes.WildcardSelector,
	}))).Methods(http.MethodPut).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/zeus/subscriptions", handler.New(provider.authzMiddleware.CheckResources(provider.zeusHandler.Checkout, authtypes.SigNozAdminRoleName), handler.OpenAPIDef{
		ID:                  "CreateSubscription",
		Tags:                []string{"zeus"},
		Summary:             "Create a checkout session for the subscription.",
		Description:         "This endpoint creates a checkout session in Zeus for the deployment's subscription and returns the redirect URL.",
		Request:             new(zeustypes.PostableSubscription),
		RequestContentType:  "application/json",
		Response:            new(zeustypes.GettableSubscription),
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

	if err := router.Handle("/api/v2/zeus/subscriptions", handler.New(provider.authzMiddleware.CheckResources(provider.zeusHandler.Portal, authtypes.SigNozAdminRoleName), handler.OpenAPIDef{
		ID:                  "UpdateSubscription",
		Tags:                []string{"zeus"},
		Summary:             "Create a billing portal session for the subscription.",
		Description:         "This endpoint creates a billing portal session in Zeus for the deployment's subscription and returns the redirect URL.",
		Request:             new(zeustypes.PostableSubscription),
		RequestContentType:  "application/json",
		Response:            new(zeustypes.GettableSubscription),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusNotFound},
		Deprecated:          false,
		SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceSubscription.Scope(coretypes.VerbUpdate)}),
	}, handler.WithResourceDefs(handler.BasicResourceDef{
		Resource: coretypes.ResourceMetaResourceSubscription,
		Verb:     coretypes.VerbUpdate,
		Category: coretypes.ActionCategoryConfigurationChange,
		Selector: coretypes.WildcardSelector,
	}))).Methods(http.MethodPut).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/zeus/meters", handler.New(provider.authzMiddleware.CheckResources(provider.zeusHandler.GetMeters, authtypes.SigNozAdminRoleName), handler.OpenAPIDef{
		ID:                  "GetSubscriptionUsage",
		Tags:                []string{"zeus"},
		Summary:             "Get subscription usage from Zeus.",
		Description:         "This endpoint gets the metered usage and billing details of the deployment's subscription from zeus.",
		Request:             nil,
		RequestContentType:  "",
		Response:            new(zeustypes.GettableSubscriptionUsage),
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

package signozapiserver

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/types/licensetypes"
	"github.com/gorilla/mux"
)

func (provider *provider) addLicensingRoutes(router *mux.Router) error {
	if err := router.Handle("/api/v4/licenses", handler.New(
		provider.authzMiddleware.CheckResources(provider.licensingHandler.Create, authtypes.SigNozAdminRoleName),
		handler.OpenAPIDef{
			ID:                  "ActivateLicense",
			Tags:                []string{"licenses"},
			Summary:             "Activate a license.",
			Description:         "This endpoint validates the license key with the upstream server and activates the license for the organization.",
			Request:             new(licensetypes.PostableLicense),
			RequestContentType:  "application/json",
			Response:            new(types.Identifiable),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusCreated,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusNotFound, http.StatusConflict},
			Deprecated:          false,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceLicense.Scope(coretypes.VerbCreate)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceMetaResourceLicense,
			Verb:     coretypes.VerbCreate,
			Category: coretypes.ActionCategoryConfigurationChange,
			ID:       coretypes.ResponseJSONPath("data.id"),
			Selector: coretypes.WildcardSelector,
		}),
	)).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v3/licenses", handler.New(
		provider.authzMiddleware.CheckResources(provider.licensingHandler.ActivateDeprecated, authtypes.SigNozAdminRoleName),
		handler.OpenAPIDef{
			ID:                  "ActivateLicenseDeprecated",
			Tags:                []string{"licenses"},
			Summary:             "Activate a license.",
			Description:         "This endpoint validates the license key with the upstream server and activates the license for the organization.",
			Request:             new(licensetypes.PostableLicense),
			RequestContentType:  "application/json",
			Response:            nil,
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusAccepted,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusNotFound, http.StatusConflict},
			Deprecated:          true,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceLicense.Scope(coretypes.VerbCreate)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceMetaResourceLicense,
			Verb:     coretypes.VerbCreate,
			Category: coretypes.ActionCategoryConfigurationChange,
			Selector: coretypes.WildcardSelector,
		}),
	)).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v3/licenses", handler.New(
		provider.authzMiddleware.CheckResources(provider.licensingHandler.RefreshDeprecated, authtypes.SigNozAdminRoleName),
		handler.OpenAPIDef{
			ID:                  "RefreshLicenseDeprecated",
			Tags:                []string{"licenses"},
			Summary:             "Refresh a license.",
			Description:         "This endpoint refreshes the active license of the organization from the upstream server.",
			Request:             nil,
			RequestContentType:  "",
			Response:            nil,
			ResponseContentType: "",
			SuccessStatusCode:   http.StatusNoContent,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusNotFound},
			Deprecated:          true,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceLicense.Scope(coretypes.VerbUpdate)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceMetaResourceLicense,
			Verb:     coretypes.VerbUpdate,
			Category: coretypes.ActionCategoryConfigurationChange,
			Selector: coretypes.WildcardSelector,
		}),
	)).Methods(http.MethodPut).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v4/licenses", handler.New(
		provider.authzMiddleware.CheckResources(provider.licensingHandler.List, authtypes.SigNozAdminRoleName),
		handler.OpenAPIDef{
			ID:                  "ListLicenses",
			Tags:                []string{"licenses"},
			Summary:             "List licenses.",
			Description:         "This endpoint lists all the licenses of the organization.",
			Request:             nil,
			RequestContentType:  "",
			Response:            make([]*licensetypes.GettableLicense, 0),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusBadRequest},
			Deprecated:          false,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceLicense.Scope(coretypes.VerbList)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceMetaResourceLicense,
			Verb:     coretypes.VerbList,
			Category: coretypes.ActionCategoryDataAccess,
			Selector: coretypes.WildcardSelector,
		}),
	)).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v4/licenses/active", handler.New(provider.authzMiddleware.OpenAccess(provider.licensingHandler.GetActive), handler.OpenAPIDef{
		ID:                  "GetActiveLicense",
		Tags:                []string{"licenses"},
		Summary:             "Get the active license.",
		Description:         "This endpoint gets the active license of the organization.",
		Request:             nil,
		RequestContentType:  "",
		Response:            new(licensetypes.GettableActiveLicense),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusNotFound, http.StatusNotImplemented},
		Deprecated:          false,
		SecuritySchemes:     newScopedSecuritySchemes(nil),
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v4/licenses/{id}", handler.New(
		provider.authzMiddleware.CheckResources(provider.licensingHandler.Get, authtypes.SigNozAdminRoleName),
		handler.OpenAPIDef{
			ID:                  "GetLicense",
			Tags:                []string{"licenses"},
			Summary:             "Get a license.",
			Description:         "This endpoint gets the license by id.",
			Request:             nil,
			RequestContentType:  "",
			Response:            new(licensetypes.GettableLicenseWithKey),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusNotFound},
			Deprecated:          false,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceLicense.Scope(coretypes.VerbRead)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceMetaResourceLicense,
			Verb:     coretypes.VerbRead,
			Category: coretypes.ActionCategoryDataAccess,
			ID:       coretypes.PathParam("id"),
			Selector: coretypes.IDSelector,
		}),
	)).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v4/licenses/{id}", handler.New(
		provider.authzMiddleware.CheckResources(provider.licensingHandler.Refresh, authtypes.SigNozAdminRoleName),
		handler.OpenAPIDef{
			ID:                  "RefreshLicense",
			Tags:                []string{"licenses"},
			Summary:             "Refresh a license.",
			Description:         "This endpoint refreshes the active license of the organization from the upstream server.",
			Request:             nil,
			RequestContentType:  "",
			Response:            nil,
			ResponseContentType: "",
			SuccessStatusCode:   http.StatusNoContent,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusNotFound},
			Deprecated:          false,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceLicense.Scope(coretypes.VerbUpdate)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceMetaResourceLicense,
			Verb:     coretypes.VerbUpdate,
			Category: coretypes.ActionCategoryConfigurationChange,
			ID:       coretypes.PathParam("id"),
			Selector: coretypes.IDSelector,
		}),
	)).Methods(http.MethodPut).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v4/licenses/{id}", handler.New(
		provider.authzMiddleware.CheckResources(provider.licensingHandler.Delete, authtypes.SigNozAdminRoleName),
		handler.OpenAPIDef{
			ID:                  "DeleteLicense",
			Tags:                []string{"licenses"},
			Summary:             "Delete a license.",
			Description:         "This endpoint deletes the license by id. Licenses managed by SigNoz Cloud cannot be deleted.",
			Request:             nil,
			RequestContentType:  "",
			Response:            nil,
			ResponseContentType: "",
			SuccessStatusCode:   http.StatusNoContent,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusNotFound},
			Deprecated:          false,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceLicense.Scope(coretypes.VerbDelete)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceMetaResourceLicense,
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

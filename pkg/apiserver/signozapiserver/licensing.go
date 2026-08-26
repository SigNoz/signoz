package signozapiserver

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/types/licensetypes"
	"github.com/gorilla/mux"
)

func (provider *provider) addLicensingRoutes(router *mux.Router) error {
	if err := router.Handle("/api/v3/licenses", handler.New(
		provider.authzMiddleware.CheckResources(provider.licensingHandler.Activate, authtypes.SigNozAdminRoleName),
		handler.OpenAPIDef{
			ID:                  "ActivateLicense",
			Tags:                []string{"licenses"},
			Summary:             "Activate a license.",
			Description:         "This endpoint validates the license key with upstream and activates the license for the organization.",
			Request:             new(licensetypes.PostableLicense),
			RequestContentType:  "application/json",
			Response:            nil,
			ResponseContentType: "",
			SuccessStatusCode:   http.StatusAccepted,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized, http.StatusForbidden, http.StatusNotFound, http.StatusConflict},
			Deprecated:          false,
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
		provider.authzMiddleware.CheckResources(provider.licensingHandler.Refresh, authtypes.SigNozAdminRoleName),
		handler.OpenAPIDef{
			ID:                  "RefreshLicense",
			Tags:                []string{"licenses"},
			Summary:             "Refresh the active license.",
			Description:         "This endpoint refreshes the active license of the organization from upstream.",
			Request:             nil,
			RequestContentType:  "",
			Response:            nil,
			ResponseContentType: "",
			SuccessStatusCode:   http.StatusNoContent,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized, http.StatusForbidden, http.StatusNotFound},
			Deprecated:          false,
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

	if err := router.Handle("/api/v3/licenses/active", handler.New(provider.authzMiddleware.OpenAccess(provider.licensingHandler.GetActive), handler.OpenAPIDef{
		ID:                  "GetActiveLicense",
		Tags:                []string{"licenses"},
		Summary:             "Get the active license.",
		Description:         "This endpoint gets the active license of the organization.",
		Request:             nil,
		RequestContentType:  "",
		Response:            new(licensetypes.GettableLicense),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized, http.StatusNotFound},
		Deprecated:          false,
		SecuritySchemes:     newScopedSecuritySchemes(nil),
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	return nil
}

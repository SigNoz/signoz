package signozapiserver

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/licensetypes"
	"github.com/gorilla/mux"
)

func (provider *provider) addLicensingRoutes(router *mux.Router) error {
	if err := router.Handle("/api/v3/licenses", handler.New(provider.authzMiddleware.AdminAccess(provider.licensingAPI.Activate), handler.OpenAPIDef{
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
		SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
	})).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v3/licenses", handler.New(provider.authzMiddleware.AdminAccess(provider.licensingAPI.Refresh), handler.OpenAPIDef{
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
		SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
	})).Methods(http.MethodPut).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v3/licenses/active", handler.New(provider.authzMiddleware.OpenAccess(provider.licensingAPI.GetActive), handler.OpenAPIDef{
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
		SecuritySchemes:     []handler.OpenAPISecurityScheme{{Name: authtypes.IdentNProviderTokenizer.StringValue()}},
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	return nil
}

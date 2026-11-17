package signozapiserver

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/gorilla/mux"
)

func (provider *provider) addOrgRoutes(router *mux.Router) error {
	if err := router.Handle("/api/v2/orgs/me", handler.New(provider.authzMiddleware.CheckResources(provider.orgHandler.Get, authtypes.SigNozAdminRoleName), handler.OpenAPIDef{
		ID:                  "GetMyOrganization",
		Tags:                []string{"orgs"},
		Summary:             "Get my organization",
		Description:         "This endpoint returns the organization I belong to",
		Request:             nil,
		RequestContentType:  "",
		Response:            new(types.Organization),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{},
		Deprecated:          false,
		SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceOrganization.Scope(coretypes.VerbRead)}),
	}, handler.WithResourceDefs(handler.BasicResourceDef{
		Resource: coretypes.ResourceOrganization,
		Verb:     coretypes.VerbRead,
		Category: coretypes.ActionCategoryDataAccess,
		ID:       provider.orgIDExtractor(),
		Selector: coretypes.IDSelector,
	}))).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/orgs/me", handler.New(provider.authzMiddleware.CheckResources(provider.orgHandler.Update, authtypes.SigNozAdminRoleName), handler.OpenAPIDef{
		ID:                  "UpdateMyOrganization",
		Tags:                []string{"orgs"},
		Summary:             "Update my organization",
		Description:         "This endpoint updates the organization I belong to",
		Request:             new(types.Organization),
		RequestContentType:  "application/json",
		Response:            nil,
		ResponseContentType: "",
		SuccessStatusCode:   http.StatusNoContent,
		ErrorStatusCodes:    []int{http.StatusConflict, http.StatusBadRequest},
		Deprecated:          false,
		SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceOrganization.Scope(coretypes.VerbUpdate)}),
	}, handler.WithResourceDefs(handler.BasicResourceDef{
		Resource: coretypes.ResourceOrganization,
		Verb:     coretypes.VerbUpdate,
		Category: coretypes.ActionCategoryConfigurationChange,
		ID:       provider.orgIDExtractor(),
		Selector: coretypes.IDSelector,
	}))).Methods(http.MethodPut).GetError(); err != nil {
		return err
	}

	return nil
}

func (provider *provider) orgIDExtractor() coretypes.ResourceIDExtractor {
	return coretypes.NewResourceIDExtractor(coretypes.PhaseRequest, func(ec coretypes.ExtractorContext) (string, error) {
		if ec.Request == nil {
			return "", nil
		}

		claims, err := authtypes.ClaimsFromContext(ec.Request.Context())
		if err != nil {
			return "", err
		}

		return claims.OrgID, nil
	})
}

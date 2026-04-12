package signozapiserver

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/aio11ypricingruletypes"
	"github.com/gorilla/mux"
)

func (provider *provider) addAIO11yRoutes(router *mux.Router) error {
	if err := router.Handle("/api/v1/ai-o11y/pricing/rules", handler.New(
		provider.authZ.ViewAccess(provider.aiO11yPricingRuleHandler.List),
		handler.OpenAPIDef{
			ID:                  "ListPricingRules",
			Tags:                []string{"ai-o11y"},
			Summary:             "List pricing rules",
			Description:         "Returns all LLM pricing rules for the authenticated org, with pagination.",
			Request:             nil,
			RequestContentType:  "",
			RequestQuery:        new(aio11ypricingruletypes.ListPricingRulesQuery),
			Response:            new(aio11ypricingruletypes.ListPricingRulesResponse),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusBadRequest},
			Deprecated:          false,
			SecuritySchemes:     newSecuritySchemes(types.RoleViewer),
		},
	)).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/ai-o11y/pricing/rules", handler.New(
		provider.authZ.AdminAccess(provider.aiO11yPricingRuleHandler.Create),
		handler.OpenAPIDef{
			ID:                  "CreatePricingRule",
			Tags:                []string{"ai-o11y"},
			Summary:             "Create a pricing rule",
			Description:         "Creates a new LLM pricing rule for the org. Always sets is_override = true.",
			Request:             new(aio11ypricingruletypes.PostablePricingRule),
			RequestContentType:  "application/json",
			Response:            new(aio11ypricingruletypes.GettablePricingRule),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusCreated,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusConflict},
			Deprecated:          false,
			SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
		},
	)).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/ai-o11y/pricing/rules/{id}", handler.New(
		provider.authZ.ViewAccess(provider.aiO11yPricingRuleHandler.Get),
		handler.OpenAPIDef{
			ID:                  "GetPricingRule",
			Tags:                []string{"ai-o11y"},
			Summary:             "Get a pricing rule",
			Description:         "Returns a single LLM pricing rule by ID.",
			Request:             nil,
			RequestContentType:  "",
			Response:            new(aio11ypricingruletypes.GettablePricingRule),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusNotFound},
			Deprecated:          false,
			SecuritySchemes:     newSecuritySchemes(types.RoleViewer),
		},
	)).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/ai-o11y/pricing/rules/{id}", handler.New(
		provider.authZ.AdminAccess(provider.aiO11yPricingRuleHandler.Update),
		handler.OpenAPIDef{
			ID:                  "UpdatePricingRule",
			Tags:                []string{"ai-o11y"},
			Summary:             "Update a pricing rule",
			Description:         "Partially updates an existing pricing rule. Changing any cost field sets is_override = true.",
			Request:             new(aio11ypricingruletypes.UpdatablePricingRule),
			RequestContentType:  "application/json",
			Response:            new(aio11ypricingruletypes.GettablePricingRule),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusNotFound},
			Deprecated:          false,
			SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
		},
	)).Methods(http.MethodPut).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/ai-o11y/pricing/rules/{id}", handler.New(
		provider.authZ.AdminAccess(provider.aiO11yPricingRuleHandler.Delete),
		handler.OpenAPIDef{
			ID:                  "DeletePricingRule",
			Tags:                []string{"ai-o11y"},
			Summary:             "Delete a pricing rule",
			Description:         "Hard-deletes a pricing rule. If auto-synced, it will be recreated on the next sync cycle.",
			Request:             nil,
			RequestContentType:  "",
			Response:            nil,
			ResponseContentType: "",
			SuccessStatusCode:   http.StatusNoContent,
			ErrorStatusCodes:    []int{http.StatusNotFound},
			Deprecated:          false,
			SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
		},
	)).Methods(http.MethodDelete).GetError(); err != nil {
		return err
	}

	return nil
}

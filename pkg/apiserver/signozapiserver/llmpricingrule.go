package signozapiserver

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/llmpricingruletypes"
	"github.com/gorilla/mux"
)

func (provider *provider) addLLMPricingRuleRoutes(router *mux.Router) error {
	if err := router.Handle("/api/v1/llm_pricing_rules", handler.New(
		provider.authZ.ViewAccess(provider.llmPricingRuleHandler.List),
		handler.OpenAPIDef{
			ID:                  "ListLLMPricingRules",
			Tags:                []string{"llmpricingrules"},
			Summary:             "List pricing rules",
			Description:         "Returns all LLM pricing rules for the authenticated org, with pagination.",
			Request:             nil,
			RequestContentType:  "",
			RequestQuery:        new(llmpricingruletypes.ListPricingRulesQuery),
			Response:            new(llmpricingruletypes.GettablePricingRules),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusBadRequest},
			Deprecated:          false,
			SecuritySchemes:     newSecuritySchemes(types.RoleViewer),
		},
	)).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/llm_pricing_rules", handler.New(
		provider.authZ.AdminAccess(provider.llmPricingRuleHandler.CreateOrUpdate),
		handler.OpenAPIDef{
			ID:                 "CreateOrUpdateLLMPricingRules",
			Tags:               []string{"llmpricingrules"},
			Summary:            "Create or update pricing rules",
			Description:        "Single write endpoint used by both the user and the Zeus sync job. Per-rule match is by id, then sourceId, then insert. Override rows (is_override=true) are fully preserved when the request does not provide isOverride; only synced_at is stamped.",
			Request:            new(llmpricingruletypes.UpdatableLLMPricingRules),
			RequestContentType: "application/json",
			SuccessStatusCode:  http.StatusNoContent,
			ErrorStatusCodes:   []int{http.StatusBadRequest},
			Deprecated:         false,
			SecuritySchemes:    newSecuritySchemes(types.RoleAdmin),
		},
	)).Methods(http.MethodPut).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/llm_pricing_rules/{id}", handler.New(
		provider.authZ.ViewAccess(provider.llmPricingRuleHandler.Get),
		handler.OpenAPIDef{
			ID:                  "GetLLMPricingRule",
			Tags:                []string{"llmpricingrules"},
			Summary:             "Get a pricing rule",
			Description:         "Returns a single LLM pricing rule by ID.",
			Request:             nil,
			RequestContentType:  "",
			Response:            new(llmpricingruletypes.GettableLLMPricingRule),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusNotFound},
			Deprecated:          false,
			SecuritySchemes:     newSecuritySchemes(types.RoleViewer),
		},
	)).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/llm_pricing_rules/{id}", handler.New(
		provider.authZ.AdminAccess(provider.llmPricingRuleHandler.Delete),
		handler.OpenAPIDef{
			ID:                  "DeleteLLMPricingRule",
			Tags:                []string{"llmpricingrules"},
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

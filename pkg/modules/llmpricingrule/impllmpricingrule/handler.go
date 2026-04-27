package impllmpricingrule

import (
	"context"
	"net/http"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/http/binding"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/modules/llmpricingrule"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/llmpricingruletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/gorilla/mux"
)

const maxLimit = 100

type handler struct {
	module           llmpricingrule.Module
	providerSettings factory.ProviderSettings
}

func NewHandler(module llmpricingrule.Module, providerSettings factory.ProviderSettings) llmpricingrule.Handler {
	return &handler{module: module, providerSettings: providerSettings}
}

// List handles GET /api/v1/llm_pricing_rules.
func (h *handler) List(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	orgID := valuer.MustNewUUID(claims.OrgID)

	var q llmpricingruletypes.ListPricingRulesQuery
	if err := binding.Query.BindQuery(r.URL.Query(), &q); err != nil {
		render.Error(rw, err)
		return
	}

	if q.Limit <= 0 {
		q.Limit = 20
	} else if q.Limit > maxLimit {
		q.Limit = maxLimit
	}
	if q.Offset < 0 {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput, llmpricingruletypes.ErrCodePricingRuleInvalidInput, "offset must be a non-negative integer"))
		return
	}

	rules, total, err := h.module.List(ctx, orgID, q.Offset, q.Limit)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, llmpricingruletypes.NewGettableLLMPricingRulesFromLLMPricingRules(rules, total, q.Offset, q.Limit))
}

// Get handles GET /api/v1/llm_pricing_rules/{id}.
func (h *handler) Get(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	orgID := valuer.MustNewUUID(claims.OrgID)

	id, err := ruleIDFromPath(r)
	if err != nil {
		render.Error(rw, err)
		return
	}

	rule, err := h.module.Get(ctx, orgID, id)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, rule)
}

func (h *handler) CreateOrUpdate(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	orgID := valuer.MustNewUUID(claims.OrgID)

	req := new(llmpricingruletypes.UpdatableLLMPricingRules)
	if err := binding.JSON.BindBody(r.Body, req); err != nil {
		render.Error(rw, err)
		return
	}

	err = h.module.CreateOrUpdate(ctx, orgID, claims.Email, req.Rules)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusNoContent, nil)
}

// Delete handles DELETE /api/v1/llm_pricing_rules/{id}.
func (h *handler) Delete(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	orgID := valuer.MustNewUUID(claims.OrgID)

	id, err := ruleIDFromPath(r)
	if err != nil {
		render.Error(rw, err)
		return
	}

	if err := h.module.Delete(ctx, orgID, id); err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusNoContent, nil)
}

// ruleIDFromPath extracts and validates the {id} path variable.
func ruleIDFromPath(r *http.Request) (valuer.UUID, error) {
	raw := mux.Vars(r)["id"]
	id, err := valuer.NewUUID(raw)
	if err != nil {
		return valuer.UUID{}, errors.Wrapf(err, errors.TypeInvalidInput, llmpricingruletypes.ErrCodePricingRuleInvalidInput, "id is not a valid uuid")
	}
	return id, nil
}

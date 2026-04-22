package implaio11ypricingrule

import (
	"context"
	"net/http"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/http/binding"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/modules/aio11ypricingrule"
	"github.com/SigNoz/signoz/pkg/types/aio11ypricingruletypes"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/gorilla/mux"
)

const maxLimit = 100

type handler struct {
	module           aio11ypricingrule.Module
	providerSettings factory.ProviderSettings
}

func NewHandler(module aio11ypricingrule.Module, providerSettings factory.ProviderSettings) aio11ypricingrule.Handler {
	return &handler{module: module, providerSettings: providerSettings}
}

// List handles GET /api/v1/ai-o11y/pricing_rules.
func (h *handler) List(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(rw, err)
		return
	}

	var q aio11ypricingruletypes.ListPricingRulesQuery
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
		render.Error(rw, errors.Newf(errors.TypeInvalidInput, aio11ypricingruletypes.ErrCodePricingRuleInvalidInput, "offset must be a non-negative integer"))
		return
	}

	rules, total, err := h.module.List(ctx, orgID, q.Offset, q.Limit)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, aio11ypricingruletypes.NewGettablePricingRulesFromPricingRules(rules, total, q.Offset, q.Limit))
}

// Get handles GET /api/v1/ai-o11y/pricing_rules/{id}.
func (h *handler) Get(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(rw, err)
		return
	}

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

	render.Success(rw, http.StatusOK, aio11ypricingruletypes.NewGettablePricingRule(rule))
}

// Create handles POST /api/v1/ai-o11y/pricing_rules.
func (h *handler) Create(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(rw, err)
		return
	}

	req := new(aio11ypricingruletypes.PostablePricingRule)
	if err := binding.JSON.BindBody(r.Body, req); err != nil {
		render.Error(rw, err)
		return
	}

	rule := aio11ypricingruletypes.NewPricingRuleFromPostable(req)

	err = h.module.Create(ctx, orgID, claims.Email, rule)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusCreated, aio11ypricingruletypes.NewGettablePricingRule(rule))
}

// Update handles PUT /api/v1/ai-o11y/pricing_rules/{id}.
func (h *handler) Update(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(rw, err)
		return
	}

	id, err := ruleIDFromPath(r)
	if err != nil {
		render.Error(rw, err)
		return
	}

	req := new(aio11ypricingruletypes.UpdatablePricingRule)
	if err := binding.JSON.BindBody(r.Body, req); err != nil {
		render.Error(rw, err)
		return
	}

	err = h.module.Update(ctx, orgID, id, claims.Email, aio11ypricingruletypes.NewPricingRuleFromUpdatable(req))
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusNoContent, nil)
}

// Delete handles DELETE /api/v1/ai-o11y/pricing_rules/{id}.
func (h *handler) Delete(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(rw, err)
		return
	}

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

// Sync handles PUT /api/v1/ai-o11y/pricing_rules/sync.
// Zeus sends a bulk payload of rules across any number of sources.
// Rules with isOverride=false get costs updated; rules with isOverride=true
// get only SourceConfig refreshed so users can revert to the new upstream value.
func (h *handler) Sync(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(rw, err)
		return
	}

	req := new(aio11ypricingruletypes.SyncPricingRulesRequest)
	if err := binding.JSON.BindBody(r.Body, req); err != nil {
		render.Error(rw, err)
		return
	}

	err = h.module.Sync(ctx, orgID, req.Rules)
	if err != nil {
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
		return valuer.UUID{}, errors.Wrapf(err, errors.TypeInvalidInput, aio11ypricingruletypes.ErrCodePricingRuleInvalidInput, "id is not a valid uuid")
	}
	return id, nil
}

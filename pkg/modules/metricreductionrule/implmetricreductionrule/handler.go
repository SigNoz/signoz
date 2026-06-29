package implmetricreductionrule

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/binding"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/modules/metricreductionrule"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/metricreductionruletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/gorilla/mux"
)

type handler struct {
	module metricreductionrule.Module
}

func NewHandler(module metricreductionrule.Module) metricreductionrule.Handler {
	return &handler{module: module}
}

func idFromPath(r *http.Request) (valuer.UUID, error) {
	id, err := valuer.NewUUID(mux.Vars(r)["id"])
	if err != nil {
		return valuer.UUID{}, errors.NewInvalidInputf(errors.CodeInvalidInput, "id must be a valid uuid")
	}
	return id, nil
}

func (h *handler) List(rw http.ResponseWriter, r *http.Request) {
	claims, err := authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		render.Error(rw, err)
		return
	}

	var params metricreductionruletypes.ListReductionRulesParams
	if err := binding.Query.BindQuery(r.URL.Query(), &params); err != nil {
		render.Error(rw, err)
		return
	}

	out, err := h.module.List(r.Context(), valuer.MustNewUUID(claims.OrgID), &params)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, out)
}

func (h *handler) Preview(rw http.ResponseWriter, r *http.Request) {
	claims, err := authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		render.Error(rw, err)
		return
	}

	var in metricreductionruletypes.PostableReductionRulePreview
	if err := binding.JSON.BindBody(r.Body, &in); err != nil {
		render.Error(rw, err)
		return
	}

	out, err := h.module.Preview(r.Context(), valuer.MustNewUUID(claims.OrgID), &in)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, out)
}

func (h *handler) Stats(rw http.ResponseWriter, r *http.Request) {
	claims, err := authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		render.Error(rw, err)
		return
	}

	out, err := h.module.Stats(r.Context(), valuer.MustNewUUID(claims.OrgID))
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, out)
}

func (h *handler) Timeseries(rw http.ResponseWriter, r *http.Request) {
	claims, err := authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		render.Error(rw, err)
		return
	}

	out, err := h.module.Timeseries(r.Context(), valuer.MustNewUUID(claims.OrgID))
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, out)
}

func (h *handler) Create(rw http.ResponseWriter, r *http.Request) {
	claims, err := authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		render.Error(rw, err)
		return
	}

	var in metricreductionruletypes.PostableReductionRule
	if err := binding.JSON.BindBody(r.Body, &in); err != nil {
		render.Error(rw, err)
		return
	}
	out, err := h.module.Create(r.Context(), valuer.MustNewUUID(claims.OrgID), claims.Email, &in)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusCreated, out)
}

func (h *handler) GetByID(rw http.ResponseWriter, r *http.Request) {
	claims, err := authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		render.Error(rw, err)
		return
	}

	id, err := idFromPath(r)
	if err != nil {
		render.Error(rw, err)
		return
	}

	out, err := h.module.GetByID(r.Context(), valuer.MustNewUUID(claims.OrgID), id)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, out)
}

func (h *handler) UpdateByID(rw http.ResponseWriter, r *http.Request) {
	claims, err := authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		render.Error(rw, err)
		return
	}

	id, err := idFromPath(r)
	if err != nil {
		render.Error(rw, err)
		return
	}

	var in metricreductionruletypes.UpdatableReductionRule
	if err := binding.JSON.BindBody(r.Body, &in); err != nil {
		render.Error(rw, err)
		return
	}

	out, err := h.module.UpdateByID(r.Context(), valuer.MustNewUUID(claims.OrgID), claims.Email, id, &in)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, out)
}

func (h *handler) DeleteByID(rw http.ResponseWriter, r *http.Request) {
	claims, err := authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		render.Error(rw, err)
		return
	}

	id, err := idFromPath(r)
	if err != nil {
		render.Error(rw, err)
		return
	}

	if err := h.module.DeleteByID(r.Context(), valuer.MustNewUUID(claims.OrgID), id); err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusNoContent, nil)
}

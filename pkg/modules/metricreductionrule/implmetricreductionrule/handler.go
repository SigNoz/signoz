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

func metricNameFromPath(r *http.Request) (string, error) {
	metricName := mux.Vars(r)["metric_name"]
	if metricName == "" {
		return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "metric_name is required in URL path")
	}
	return metricName, nil
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

func (h *handler) Get(rw http.ResponseWriter, r *http.Request) {
	claims, err := authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		render.Error(rw, err)
		return
	}

	metricName, err := metricNameFromPath(r)
	if err != nil {
		render.Error(rw, err)
		return
	}

	out, err := h.module.Get(r.Context(), valuer.MustNewUUID(claims.OrgID), metricName)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, out)
}

func (h *handler) Upsert(rw http.ResponseWriter, r *http.Request) {
	claims, err := authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		render.Error(rw, err)
		return
	}

	metricName, err := metricNameFromPath(r)
	if err != nil {
		render.Error(rw, err)
		return
	}

	var in metricreductionruletypes.PostableReductionRule
	if err := binding.JSON.BindBody(r.Body, &in); err != nil {
		render.Error(rw, err)
		return
	}
	in.MetricName = metricName

	if err := in.Validate(); err != nil {
		render.Error(rw, err)
		return
	}

	out, err := h.module.Upsert(r.Context(), valuer.MustNewUUID(claims.OrgID), claims.Email, &in)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, out)
}

func (h *handler) Delete(rw http.ResponseWriter, r *http.Request) {
	claims, err := authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		render.Error(rw, err)
		return
	}

	metricName, err := metricNameFromPath(r)
	if err != nil {
		render.Error(rw, err)
		return
	}

	if err := h.module.Delete(r.Context(), valuer.MustNewUUID(claims.OrgID), metricName); err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusNoContent, nil)
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

	if err := in.Validate(); err != nil {
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

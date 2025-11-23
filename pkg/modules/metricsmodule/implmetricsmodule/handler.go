package implmetricsmodule

import (
	"net/http"
	"strconv"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/binding"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/modules/metricsmodule"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/metricsmoduletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/gorilla/mux"
)

type handler struct {
	module metricsmodule.Module
}

// NewHandler returns a metricsmodule.Handler implementation.
func NewHandler(m metricsmodule.Module) metricsmodule.Handler {
	return &handler{
		module: m,
	}
}

func (h *handler) GetStats(rw http.ResponseWriter, req *http.Request) {
	claims, err := authtypes.ClaimsFromContext(req.Context())
	if err != nil {
		render.Error(rw, err)
		return
	}

	var in metricsmoduletypes.StatsRequest
	if err := binding.JSON.BindBody(req.Body, &in); err != nil {
		render.Error(rw, err)
		return
	}

	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(rw, err)
		return
	}

	out, err := h.module.GetStats(req.Context(), orgID, &in)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, out)
}

func (h *handler) GetTreemap(rw http.ResponseWriter, req *http.Request) {
	claims, err := authtypes.ClaimsFromContext(req.Context())
	if err != nil {
		render.Error(rw, err)
		return
	}

	var in metricsmoduletypes.TreemapRequest
	if err := binding.JSON.BindBody(req.Body, &in); err != nil {
		render.Error(rw, err)
		return
	}

	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(rw, err)
		return
	}

	out, err := h.module.GetTreemap(req.Context(), orgID, &in)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, out)
}

func (h *handler) GetMetricAttributes(rw http.ResponseWriter, req *http.Request) {
	claims, err := authtypes.ClaimsFromContext(req.Context())
	if err != nil {
		render.Error(rw, err)
		return
	}

	// Extract metric_name from URL path
	vars := mux.Vars(req)
	metricName, ok := vars["metric_name"]
	if !ok || metricName == "" {
		render.Error(rw, errors.NewInvalidInputf(errors.CodeInvalidInput, "metric_name is required"))
		return
	}

	var in metricsmoduletypes.MetricAttributesRequest
	in.MetricName = metricName

	// Parse optional start and end from query parameters
	if startStr := req.URL.Query().Get("start"); startStr != "" {
		if startVal, err := strconv.ParseInt(startStr, 10, 64); err == nil {
			in.Start = startVal
		}
	}

	if endStr := req.URL.Query().Get("end"); endStr != "" {
		if endVal, err := strconv.ParseInt(endStr, 10, 64); err == nil {
			in.End = endVal
		}
	}

	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(rw, err)
		return
	}

	out, err := h.module.GetMetricAttributes(req.Context(), orgID, &in)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, out)
}

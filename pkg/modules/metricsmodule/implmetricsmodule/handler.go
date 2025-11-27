package implmetricsmodule

import (
	"net/http"
	"strings"

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

	orgID := valuer.MustNewUUID(claims.OrgID)

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

	orgID := valuer.MustNewUUID(claims.OrgID)

	out, err := h.module.GetTreemap(req.Context(), orgID, &in)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, out)
}

func (h *handler) UpdateMetricMetadata(rw http.ResponseWriter, req *http.Request) {
	claims, err := authtypes.ClaimsFromContext(req.Context())
	if err != nil {
		render.Error(rw, err)
		return
	}

	// Extract metric_name from URL path
	vars := mux.Vars(req)
	metricName := vars["metric_name"]
	if metricName == "" {
		render.Error(rw, errors.NewInvalidInputf(errors.CodeInvalidInput, "metric_name is required in URL path"))
		return
	}

	var in metricsmoduletypes.UpdateMetricMetadataRequest
	if err := binding.JSON.BindBody(req.Body, &in); err != nil {
		render.Error(rw, err)
		return
	}

	// Set metric name from URL path
	in.MetricName = metricName

	orgID := valuer.MustNewUUID(claims.OrgID)

	err = h.module.UpdateMetricMetadata(req.Context(), orgID, &in)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, nil)
}

func (h *handler) GetMetricMetadata(rw http.ResponseWriter, req *http.Request) {
	claims, err := authtypes.ClaimsFromContext(req.Context())
	if err != nil {
		render.Error(rw, err)
		return
	}

	metricName := strings.TrimSpace(req.URL.Query().Get("metricName"))
	if metricName == "" {
		render.Error(rw, errors.NewInvalidInputf(errors.CodeInvalidInput, "metricName query parameter is required"))
		return
	}

	orgID := valuer.MustNewUUID(claims.OrgID)

	metadataMap, err := h.module.GetMetricMetadataMulti(req.Context(), orgID, []string{metricName})
	if err != nil {
		render.Error(rw, err)
		return
	}

	metadata, ok := metadataMap[metricName]
	if !ok || metadata == nil {
		render.Error(rw, errors.NewNotFoundf(errors.CodeNotFound, "metadata not found for metric %q", metricName))
		return
	}

	render.Success(rw, http.StatusOK, metadata)
}

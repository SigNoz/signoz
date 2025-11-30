package implmetricsexplorer

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/binding"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/modules/metricsexplorer"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/metricsexplorertypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/gorilla/mux"
)

type handler struct {
	module metricsexplorer.Module
}

// NewHandler returns a metricsexplorer.Handler implementation.
func NewHandler(m metricsexplorer.Module) metricsexplorer.Handler {
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

	var in metricsexplorertypes.StatsRequest
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

	var in metricsexplorertypes.TreemapRequest
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

	var in metricsexplorertypes.UpdateMetricMetadataRequest
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

func (h *handler) GetMetricAttributes(rw http.ResponseWriter, req *http.Request) {
	claims, err := authtypes.ClaimsFromContext(req.Context())
	if err != nil {
		render.Error(rw, err)
		return
	}

	// Extract metricName from query parameters
	metricName := strings.TrimSpace(req.URL.Query().Get("metricName"))
	if metricName == "" {
		render.Error(rw, errors.NewInvalidInputf(errors.CodeInvalidInput, "metricName query parameter is required"))
		return
	}

	var in metricsexplorertypes.MetricAttributesRequest
	in.MetricName = metricName

	// Parse optional start from query parameters
	if startStr := req.URL.Query().Get("start"); startStr != "" {
		startVal, err := strconv.ParseInt(startStr, 10, 64)
		if err != nil {
			render.Error(rw, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid start time %q: %v", startStr, err))
			return
		}
		in.Start = &startVal
	}

	// Parse optional end from query parameters
	if endStr := req.URL.Query().Get("end"); endStr != "" {
		endVal, err := strconv.ParseInt(endStr, 10, 64)
		if err != nil {
			render.Error(rw, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid end time %q: %v", endStr, err))
			return
		}
		in.End = &endVal
	}

	// Validate that start < end if both are present
	if in.Start != nil && in.End != nil {
		if *in.Start >= *in.End {
			render.Error(rw, errors.NewInvalidInputf(
				errors.CodeInvalidInput,
				"invalid time range: start (%d) must be less than end (%d)",
				*in.Start,
				*in.End,
			))
			return
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

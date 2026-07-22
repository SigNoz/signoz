package implmetricsexplorer

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/binding"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/modules/metricsexplorer"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/metricsexplorertypes"
	"github.com/SigNoz/signoz/pkg/valuer"
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

func (h *handler) ListMetrics(rw http.ResponseWriter, req *http.Request) {
	claims, err := authtypes.ClaimsFromContext(req.Context())
	if err != nil {
		render.Error(rw, err)
		return
	}

	var params metricsexplorertypes.ListMetricsParams
	if err := binding.Query.BindQuery(req.URL.Query(), &params); err != nil {
		render.Error(rw, err)
		return
	}

	if err := params.Validate(); err != nil {
		render.Error(rw, err)
		return
	}

	orgID := valuer.MustNewUUID(claims.OrgID)
	out, err := h.module.ListMetrics(req.Context(), orgID, &params)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, out)
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

	var in metricsexplorertypes.UpdateMetricMetadataRequest
	if err := binding.JSON.BindBody(req.Body, &in); err != nil {
		render.Error(rw, err)
		return
	}

	if in.MetricName == "" {
		render.Error(rw, errors.NewInvalidInputf(errors.CodeInvalidInput, "metricName is required"))
		return
	}

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

	var in metricsexplorertypes.MetricNameQuery
	if err := binding.Query.BindQuery(req.URL.Query(), &in); err != nil {
		render.Error(rw, err)
		return
	}
	if err := in.Validate(); err != nil {
		render.Error(rw, err)
		return
	}
	metricName := in.MetricName

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

func (h *handler) GetMetricAlerts(rw http.ResponseWriter, req *http.Request) {
	claims, err := authtypes.ClaimsFromContext(req.Context())
	if err != nil {
		render.Error(rw, err)
		return
	}

	var in metricsexplorertypes.MetricNameQuery
	if err := binding.Query.BindQuery(req.URL.Query(), &in); err != nil {
		render.Error(rw, err)
		return
	}
	if err := in.Validate(); err != nil {
		render.Error(rw, err)
		return
	}

	orgID := valuer.MustNewUUID(claims.OrgID)

	if err := h.checkMetricExists(req.Context(), orgID, in.MetricName); err != nil {
		render.Error(rw, err)
		return
	}

	out, err := h.module.GetMetricAlerts(req.Context(), orgID, in.MetricName)
	if err != nil {
		render.Error(rw, err)
		return
	}
	render.Success(rw, http.StatusOK, out)
}

func (h *handler) GetMetricDashboards(rw http.ResponseWriter, req *http.Request) {
	claims, err := authtypes.ClaimsFromContext(req.Context())
	if err != nil {
		render.Error(rw, err)
		return
	}

	var in metricsexplorertypes.MetricNameQuery
	if err := binding.Query.BindQuery(req.URL.Query(), &in); err != nil {
		render.Error(rw, err)
		return
	}
	if err := in.Validate(); err != nil {
		render.Error(rw, err)
		return
	}

	orgID := valuer.MustNewUUID(claims.OrgID)

	if err := h.checkMetricExists(req.Context(), orgID, in.MetricName); err != nil {
		render.Error(rw, err)
		return
	}

	out, err := h.module.GetMetricDashboards(req.Context(), orgID, in.MetricName)
	if err != nil {
		render.Error(rw, err)
		return
	}
	render.Success(rw, http.StatusOK, out)
}

func (h *handler) GetMetricDashboardsV2(rw http.ResponseWriter, req *http.Request) {
	claims, err := authtypes.ClaimsFromContext(req.Context())
	if err != nil {
		render.Error(rw, err)
		return
	}

	var in metricsexplorertypes.MetricNameQuery
	if err := binding.Query.BindQuery(req.URL.Query(), &in); err != nil {
		render.Error(rw, err)
		return
	}
	if err := in.Validate(); err != nil {
		render.Error(rw, err)
		return
	}

	orgID := valuer.MustNewUUID(claims.OrgID)

	if err := h.checkMetricExists(req.Context(), orgID, in.MetricName); err != nil {
		render.Error(rw, err)
		return
	}

	out, err := h.module.GetMetricDashboardsV2(req.Context(), orgID, in.MetricName)
	if err != nil {
		render.Error(rw, err)
		return
	}
	render.Success(rw, http.StatusOK, out)
}

func (h *handler) GetMetricHighlights(rw http.ResponseWriter, req *http.Request) {
	claims, err := authtypes.ClaimsFromContext(req.Context())
	if err != nil {
		render.Error(rw, err)
		return
	}

	var in metricsexplorertypes.MetricNameQuery
	if err := binding.Query.BindQuery(req.URL.Query(), &in); err != nil {
		render.Error(rw, err)
		return
	}
	if err := in.Validate(); err != nil {
		render.Error(rw, err)
		return
	}

	orgID := valuer.MustNewUUID(claims.OrgID)

	if err := h.checkMetricExists(req.Context(), orgID, in.MetricName); err != nil {
		render.Error(rw, err)
		return
	}

	highlights, err := h.module.GetMetricHighlights(req.Context(), orgID, in.MetricName)
	if err != nil {
		render.Error(rw, err)
		return
	}
	render.Success(rw, http.StatusOK, highlights)
}

func (h *handler) GetMetricAttributes(rw http.ResponseWriter, req *http.Request) {
	claims, err := authtypes.ClaimsFromContext(req.Context())
	if err != nil {
		render.Error(rw, err)
		return
	}

	var in metricsexplorertypes.MetricAttributesRequest
	if err := binding.Query.BindQuery(req.URL.Query(), &in); err != nil {
		render.Error(rw, err)
		return
	}

	if err := in.Validate(); err != nil {
		render.Error(rw, err)
		return
	}

	orgID := valuer.MustNewUUID(claims.OrgID)

	if err := h.checkMetricExists(req.Context(), orgID, in.MetricName); err != nil {
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

func (h *handler) InspectMetrics(rw http.ResponseWriter, req *http.Request) {
	claims, err := authtypes.ClaimsFromContext(req.Context())
	if err != nil {
		render.Error(rw, err)
		return
	}

	var in metricsexplorertypes.InspectMetricsRequest
	if err := binding.JSON.BindBody(req.Body, &in); err != nil {
		render.Error(rw, err)
		return
	}

	orgID := valuer.MustNewUUID(claims.OrgID)
	out, err := h.module.InspectMetrics(req.Context(), orgID, &in)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, out)
}

func (h *handler) GetOnboardingStatus(rw http.ResponseWriter, req *http.Request) {
	hasMetrics, err := h.module.HasNonSigNozMetrics(req.Context())
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, &metricsexplorertypes.MetricsOnboardingResponse{
		HasMetrics: hasMetrics,
	})
}

func (h *handler) checkMetricExists(ctx context.Context, orgID valuer.UUID, metricName string) error {
	exists, err := h.module.CheckMetricExists(ctx, orgID, metricName)
	if err != nil {
		return err
	}
	if !exists {
		return errors.NewNotFoundf(errors.CodeNotFound, "metric not found: %q", metricName)
	}
	return nil
}

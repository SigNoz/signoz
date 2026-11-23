package impltracedetail

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/binding"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/modules/tracedetail"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/spantypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/gorilla/mux"
)

type handler struct {
	module tracedetail.Module
}

func NewHandler(module tracedetail.Module) tracedetail.Handler {
	return &handler{module: module}
}

func (h *handler) GetTraceSummary(rw http.ResponseWriter, r *http.Request) {
	claims, err := authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		render.Error(rw, err)
		return
	}

	stats, err := h.module.GetTraceSummary(r.Context(), valuer.MustNewUUID(claims.OrgID), mux.Vars(r)["traceID"])
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, spantypes.NewGettableTraceSummary(stats))
}

func (h *handler) GetWaterfallV4(rw http.ResponseWriter, r *http.Request) {
	claims, err := authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		render.Error(rw, err)
		return
	}

	req := new(spantypes.PostableWaterfall)
	if err := binding.JSON.BindBody(r.Body, req); err != nil {
		render.Error(rw, err)
		return
	}

	if err := req.Validate(); err != nil {
		render.Error(rw, err)
		return
	}

	result, err := h.module.GetWaterfallV4(r.Context(), valuer.MustNewUUID(claims.OrgID), mux.Vars(r)["traceID"], req.SelectedSpanID, req.UncollapsedSpans)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, result)
}

func (h *handler) GetTraceAggregations(rw http.ResponseWriter, r *http.Request) {
	req := new(spantypes.PostableTraceAggregations)
	if err := binding.JSON.BindBody(r.Body, req); err != nil {
		render.Error(rw, err)
		return
	}

	if err := req.Validate(); err != nil {
		render.Error(rw, err)
		return
	}

	result, err := h.module.GetTraceAggregations(r.Context(), mux.Vars(r)["traceID"], req)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, result)
}

func (h *handler) GetFlamegraph(rw http.ResponseWriter, r *http.Request) {
	req := new(spantypes.PostableFlamegraph)
	if err := binding.JSON.BindBody(r.Body, req); err != nil {
		render.Error(rw, err)
		return
	}

	result, err := h.module.GetFlamegraph(r.Context(), mux.Vars(r)["traceID"], req.SelectedSpanID, req.SelectFields)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, result)
}

func (h *handler) GetThread(rw http.ResponseWriter, r *http.Request) {
	claims, err := authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		render.Error(rw, err)
		return
	}

	req := new(spantypes.GetTraceThreadParams)
	if err := binding.Query.BindQuery(r.URL.Query(), req); err != nil {
		render.Error(rw, err)
		return
	}

	query, err := spantypes.NewThreadQuery(req)
	if err != nil {
		render.Error(rw, err)
		return
	}

	result, err := h.module.GetThread(r.Context(), valuer.MustNewUUID(claims.OrgID), mux.Vars(r)["traceID"], query)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, result)
}

// These routes are registered for their place in the API spec; the implementation follows.
func (h *handler) GetTraceOverview(rw http.ResponseWriter, _ *http.Request) {
	render.Error(rw, errors.New(errors.TypeUnsupported, errors.CodeUnsupported, "trace overview is not implemented yet"))
}

func (h *handler) ListTraceSpans(rw http.ResponseWriter, _ *http.Request) {
	render.Error(rw, errors.New(errors.TypeUnsupported, errors.CodeUnsupported, "trace span list is not implemented yet"))
}

func (h *handler) GetTraceSpan(rw http.ResponseWriter, _ *http.Request) {
	render.Error(rw, errors.New(errors.TypeUnsupported, errors.CodeUnsupported, "trace span is not implemented yet"))
}

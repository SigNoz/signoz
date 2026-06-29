package impltracedetail

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/binding"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/modules/tracedetail"
	"github.com/SigNoz/signoz/pkg/types/spantypes"
	"github.com/gorilla/mux"
)

type handler struct {
	module tracedetail.Module
}

func NewHandler(module tracedetail.Module) tracedetail.Handler {
	return &handler{module: module}
}

func (h *handler) GetWaterfallV4(rw http.ResponseWriter, r *http.Request) {
	req := new(spantypes.PostableWaterfall)
	if err := binding.JSON.BindBody(r.Body, req); err != nil {
		render.Error(rw, err)
		return
	}

	if err := req.Validate(); err != nil {
		render.Error(rw, err)
		return
	}

	result, err := h.module.GetWaterfallV4(r.Context(), mux.Vars(r)["traceID"], req.SelectedSpanID, req.UncollapsedSpans)
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

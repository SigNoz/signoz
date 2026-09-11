package implpromote

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/binding"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/modules/promote"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/promotetypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/gorilla/mux"
)

type handler struct {
	module promote.Module
}

func NewHandler(module promote.Module) promote.Handler {
	return &handler{module: module}
}

func (h *handler) PromotePaths(w http.ResponseWriter, r *http.Request) {
	target, err := targetFromPath(r)
	if err != nil {
		render.Error(w, err)
		return
	}

	// TODO(Nitya): Use in multi tenant setup
	_, err = authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		render.Error(w, errors.NewInternalf(errors.CodeInternal, "failed to get org id from context"))
		return
	}

	var req []*promotetypes.PromotePath
	if err := binding.JSON.BindBody(r.Body, &req); err != nil {
		render.Error(w, err)
		return
	}

	err = h.module.PromotePaths(r.Context(), target, req...)
	if err != nil {
		render.Error(w, err)
		return
	}

	render.Success(w, http.StatusCreated, nil)
}

func (h *handler) ListPromotedPaths(w http.ResponseWriter, r *http.Request) {
	target, err := targetFromPath(r)
	if err != nil {
		render.Error(w, err)
		return
	}

	// TODO(Nitya): Use in multi tenant setup
	_, err = authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		render.Error(w, errors.NewInternalf(errors.CodeInternal, "failed to get org id from context"))
		return
	}

	paths, err := h.module.ListPromotedPaths(r.Context(), target)
	if err != nil {
		render.Error(w, err)
		return
	}

	render.Success(w, http.StatusOK, paths)
}

// targetFromPath resolves the promotion domain from the {telemetry_signal}
// and {context} path variables.
func targetFromPath(r *http.Request) (promotetypes.Target, error) {
	vars := mux.Vars(r)
	signal, ok := telemetrytypes.SignalFromText(vars["telemetry_signal"])
	if !ok {
		return promotetypes.Target{}, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid signal: %s", vars["telemetry_signal"])
	}
	context, ok := telemetrytypes.FieldContextFromText(vars["context"])
	if !ok {
		return promotetypes.Target{}, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid context: %s", vars["context"])
	}
	target, ok := promotetypes.TargetFor(signal, context)
	if !ok {
		return promotetypes.Target{}, errors.NewInvalidInputf(errors.CodeInvalidInput, "promotion is not supported for %s %s", signal.StringValue(), context.StringValue())
	}
	return target, nil
}

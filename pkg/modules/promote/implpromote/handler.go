package implpromote

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/binding"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/modules/promote"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/promotetypes"
)

type handler struct {
	module promote.Module
}

func NewHandler(module promote.Module) promote.Handler {
	return &handler{module: module}
}

func (h *handler) HandlePromoteAndIndexPaths(w http.ResponseWriter, r *http.Request) {
	h.promote(w, r, logsBodyTarget)
}

func (h *handler) HandlePromoteAttributes(w http.ResponseWriter, r *http.Request) {
	h.promote(w, r, tracesAttributesTarget)
}

func (h *handler) ListPromotedAndIndexedPaths(w http.ResponseWriter, r *http.Request) {
	h.list(w, r, logsBodyTarget)
}

func (h *handler) ListPromotedAttributes(w http.ResponseWriter, r *http.Request) {
	h.list(w, r, tracesAttributesTarget)
}

func (h *handler) promote(w http.ResponseWriter, r *http.Request, target promotetypes.Target) {
	// TODO(Nitya): Use in multi tenant setup
	_, err := authtypes.ClaimsFromContext(r.Context())
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

func (h *handler) list(w http.ResponseWriter, r *http.Request, target promotetypes.Target) {
	// TODO(Nitya): Use in multi tenant setup
	_, err := authtypes.ClaimsFromContext(r.Context())
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

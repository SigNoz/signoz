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

// maxPathsPerRequest caps a promote batch so one request cannot flood the
// cluster with index DDL.
const maxPathsPerRequest = 100

type handler struct {
	module promote.Module
}

func NewHandler(module promote.Module) promote.Handler {
	return &handler{module: module}
}

func (h *handler) PromotePaths(w http.ResponseWriter, r *http.Request) {
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
	if len(req) == 0 {
		render.Error(w, errors.NewInvalidInputf(errors.CodeInvalidInput, "paths cannot be empty"))
		return
	}
	if len(req) > maxPathsPerRequest {
		render.Error(w, errors.NewInvalidInputf(errors.CodeInvalidInput, "cannot promote more than %d paths in one request", maxPathsPerRequest))
		return
	}
	for _, path := range req {
		if path == nil {
			render.Error(w, errors.NewInvalidInputf(errors.CodeInvalidInput, "path cannot be null"))
			return
		}
		target, err := path.Target()
		if err != nil {
			render.Error(w, err)
			return
		}
		if err := path.ValidateAndSetDefaults(target); err != nil {
			render.Error(w, err)
			return
		}
	}

	err = h.module.PromotePaths(r.Context(), req...)
	if err != nil {
		render.Error(w, err)
		return
	}

	render.Success(w, http.StatusCreated, nil)
}

func (h *handler) ListPromotedPaths(w http.ResponseWriter, r *http.Request) {
	// TODO(Nitya): Use in multi tenant setup
	_, err := authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		render.Error(w, errors.NewInternalf(errors.CodeInternal, "failed to get org id from context"))
		return
	}

	var filters promotetypes.ListPromotedPathsFilters
	if err := binding.Query.BindQuery(r.URL.Query(), &filters); err != nil {
		render.Error(w, err)
		return
	}
	if err := filters.Validate(); err != nil {
		render.Error(w, err)
		return
	}

	paths, err := h.module.ListPromotedPaths(r.Context(), filters)
	if err != nil {
		render.Error(w, err)
		return
	}

	render.Success(w, http.StatusOK, paths)
}

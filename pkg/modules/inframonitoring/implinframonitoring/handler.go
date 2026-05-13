package implinframonitoring

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/binding"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/modules/inframonitoring"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/inframonitoringtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type handler struct {
	module inframonitoring.Module
}

// NewHandler returns an inframonitoring.Handler implementation.
func NewHandler(m inframonitoring.Module) inframonitoring.Handler {
	return &handler{
		module: m,
	}
}

func (h *handler) ListHosts(rw http.ResponseWriter, req *http.Request) {
	claims, err := authtypes.ClaimsFromContext(req.Context())
	if err != nil {
		render.Error(rw, err)
		return
	}

	orgID := valuer.MustNewUUID(claims.OrgID)

	var parsedReq inframonitoringtypes.PostableHosts
	if err := binding.JSON.BindBody(req.Body, &parsedReq); err != nil {
		render.Error(rw, err)
		return
	}

	result, err := h.module.ListHosts(req.Context(), orgID, &parsedReq)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, result)
}

func (h *handler) ListPods(rw http.ResponseWriter, req *http.Request) {
	claims, err := authtypes.ClaimsFromContext(req.Context())
	if err != nil {
		render.Error(rw, err)
		return
	}

	orgID := valuer.MustNewUUID(claims.OrgID)

	var parsedReq inframonitoringtypes.PostablePods
	if err := binding.JSON.BindBody(req.Body, &parsedReq); err != nil {
		render.Error(rw, err)
		return
	}

	result, err := h.module.ListPods(req.Context(), orgID, &parsedReq)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, result)
}

func (h *handler) ListNodes(rw http.ResponseWriter, req *http.Request) {
	claims, err := authtypes.ClaimsFromContext(req.Context())
	if err != nil {
		render.Error(rw, err)
		return
	}

	orgID := valuer.MustNewUUID(claims.OrgID)

	var parsedReq inframonitoringtypes.PostableNodes
	if err := binding.JSON.BindBody(req.Body, &parsedReq); err != nil {
		render.Error(rw, err)
		return
	}

	result, err := h.module.ListNodes(req.Context(), orgID, &parsedReq)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, result)
}

func (h *handler) ListNamespaces(rw http.ResponseWriter, req *http.Request) {
	claims, err := authtypes.ClaimsFromContext(req.Context())
	if err != nil {
		render.Error(rw, err)
		return
	}

	orgID := valuer.MustNewUUID(claims.OrgID)

	var parsedReq inframonitoringtypes.PostableNamespaces
	if err := binding.JSON.BindBody(req.Body, &parsedReq); err != nil {
		render.Error(rw, err)
		return
	}

	result, err := h.module.ListNamespaces(req.Context(), orgID, &parsedReq)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, result)
}

func (h *handler) ListClusters(rw http.ResponseWriter, req *http.Request) {
	claims, err := authtypes.ClaimsFromContext(req.Context())
	if err != nil {
		render.Error(rw, err)
		return
	}

	orgID := valuer.MustNewUUID(claims.OrgID)

	var parsedReq inframonitoringtypes.PostableClusters
	if err := binding.JSON.BindBody(req.Body, &parsedReq); err != nil {
		render.Error(rw, err)
		return
	}

	result, err := h.module.ListClusters(req.Context(), orgID, &parsedReq)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, result)
}

func (h *handler) ListVolumes(rw http.ResponseWriter, req *http.Request) {
	claims, err := authtypes.ClaimsFromContext(req.Context())
	if err != nil {
		render.Error(rw, err)
		return
	}

	orgID := valuer.MustNewUUID(claims.OrgID)

	var parsedReq inframonitoringtypes.PostableVolumes
	if err := binding.JSON.BindBody(req.Body, &parsedReq); err != nil {
		render.Error(rw, err)
		return
	}

	result, err := h.module.ListVolumes(req.Context(), orgID, &parsedReq)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, result)
}

func (h *handler) ListDeployments(rw http.ResponseWriter, req *http.Request) {
	claims, err := authtypes.ClaimsFromContext(req.Context())
	if err != nil {
		render.Error(rw, err)
		return
	}

	orgID := valuer.MustNewUUID(claims.OrgID)

	var parsedReq inframonitoringtypes.PostableDeployments
	if err := binding.JSON.BindBody(req.Body, &parsedReq); err != nil {
		render.Error(rw, err)
		return
	}

	result, err := h.module.ListDeployments(req.Context(), orgID, &parsedReq)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, result)
}

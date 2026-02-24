package impllogspipeline

import (
	"net/http"
	"strconv"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/modules/logspipeline"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/gorilla/mux"
)

type handler struct {
	module logspipeline.Module
}

func NewHandler(module logspipeline.Module) logspipeline.Handler {
	return &handler{module: module}
}

func (h *handler) ListPipelines(w http.ResponseWriter, r *http.Request) {
	claims, err := authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		render.Error(w, err)
		return
	}

	orgID, errv2 := valuer.NewUUID(claims.OrgID)
	if errv2 != nil {
		render.Error(w, errv2)
		return
	}

	version, err := ParseAgentConfigVersion(r)
	if err != nil {
		render.Error(w, err)
		return
	}

	if version != -1 {
		pipelines, err := h.module.ListPipelinesByVersion(r.Context(), orgID, version)
		if err != nil {
			render.Error(w, err)
			return
		}
		render.Success(w, http.StatusOK, pipelines)
		return
	}

	pipelines, err := h.module.ListPipelines(r.Context(), orgID)
	if err != nil {
		render.Error(w, err)
		return
	}

	render.Success(w, http.StatusOK, pipelines)
}

func (h *handler) GetPipeline(w http.ResponseWriter, r *http.Request) {
}

func (h *handler) CreatePipeline(w http.ResponseWriter, r *http.Request) {
}

func (h *handler) UpdatePipeline(w http.ResponseWriter, r *http.Request) {
}

func (h *handler) DeletePipeline(w http.ResponseWriter, r *http.Request) {
}

func ParseAgentConfigVersion(r *http.Request) (int, error) {
	versionString := mux.Vars(r)["version"]

	if versionString == "latest" {
		return -1, nil
	}

	version64, err := strconv.ParseInt(versionString, 0, 8)

	if err != nil {
		return 0, errors.WrapInvalidInputf(err, errors.CodeInvalidInput, "invalid version number")
	}

	if version64 <= 0 {
		return 0, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid version number")
	}

	return int(version64), nil
}

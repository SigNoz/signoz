package signozglobal

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/global"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/types"
)

type handler struct {
	global global.Global
}

func NewHandler(global global.Global) global.Handler {
	return &handler{global: global}
}

func (handker *handler) GetConfig(rw http.ResponseWriter, r *http.Request) {
	cfg := handker.global.GetConfig()

	render.Success(rw, http.StatusOK, types.NewGettableGlobalConfig(cfg.ExternalURL, cfg.IngestionURL))
}

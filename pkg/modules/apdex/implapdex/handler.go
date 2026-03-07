package implapdex

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/modules/apdex"
	"github.com/SigNoz/signoz/pkg/types/apdextypes"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
)

type handler struct {
	module apdex.Module
}

func NewHandler(module apdex.Module) apdex.Handler {
	return &handler{module: module}
}

func (handler *handler) Set(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	var apdexSettings apdextypes.Settings
	if err := json.NewDecoder(req.Body).Decode(&apdexSettings); err != nil {
		render.Error(rw, err)
		return
	}

	if err := handler.module.Set(ctx, claims.OrgID, &apdexSettings); err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, map[string]string{"data": "apdex score updated successfully"})
}

func (handler *handler) Get(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(req.Context())
	if err != nil {
		render.Error(rw, err)
		return
	}

	services := req.URL.Query().Get("services")
	apdexSettings, err := handler.module.Get(ctx, claims.OrgID, strings.Split(strings.TrimSpace(services), ","))
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, apdexSettings)
}

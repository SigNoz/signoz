package implquickfilter

import (
	"encoding/json"
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/modules/quickfilter"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/quickfiltertypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/gorilla/mux"
)

type handler struct {
	module quickfilter.Module
}

func NewHandler(module quickfilter.Module) quickfilter.Handler {
	return &handler{module: module}
}

func (handler *handler) GetQuickFilters(rw http.ResponseWriter, r *http.Request) {
	claims, err := authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		render.Error(rw, err)
		return
	}

	filters, err := handler.module.GetQuickFilters(r.Context(), valuer.MustNewUUID(claims.OrgID))
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, filters)
}

func (handler *handler) UpdateQuickFilters(rw http.ResponseWriter, r *http.Request) {
	claims, err := authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		render.Error(rw, err)
		return
	}

	var req quickfiltertypes.UpdatableQuickFilters
	decodeErr := json.NewDecoder(r.Body).Decode(&req)
	if decodeErr != nil {
		render.Error(rw, decodeErr)
		return
	}

	err = handler.module.UpdateQuickFilters(r.Context(), valuer.MustNewUUID(claims.OrgID), req.Signal, req.Filters)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusNoContent, nil)
}

func (handler *handler) GetSignalFilters(rw http.ResponseWriter, r *http.Request) {
	claims, err := authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		render.Error(rw, err)
		return
	}

	signal := mux.Vars(r)["signal"]
	validatedSignal, err := quickfiltertypes.NewSignal(signal)
	if err != nil {
		render.Error(rw, err)
		return
	}

	filters, err := handler.module.GetSignalFilters(r.Context(), valuer.MustNewUUID(claims.OrgID), validatedSignal)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, filters)
}

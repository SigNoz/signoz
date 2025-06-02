package impltracefunnel

import (
	"encoding/json"
	"net/http"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/modules/tracefunnel"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	tf "github.com/SigNoz/signoz/pkg/types/tracefunneltypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/gorilla/mux"
)

type handler struct {
	module tracefunnel.Module
}

func NewHandler(module tracefunnel.Module) tracefunnel.Handler {
	return &handler{module: module}
}

func (handler *handler) New(rw http.ResponseWriter, r *http.Request) {
	var req tf.PostableFunnel
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		render.Error(rw, err)
		return
	}

	claims, err := authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		render.Error(rw, err)
		return
	}

	funnel, err := handler.module.Create(r.Context(), req.Timestamp, req.Name, valuer.MustNewUUID(claims.UserID), valuer.MustNewUUID(claims.OrgID))
	if err != nil {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput,
			errors.CodeInvalidInput,
			"failed to create funnel: %v", err))
		return
	}

	response := tf.ConstructFunnelResponse(funnel, &claims)
	render.Success(rw, http.StatusOK, response)
}

func (handler *handler) UpdateSteps(rw http.ResponseWriter, r *http.Request) {
	var req tf.PostableFunnel
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		render.Error(rw, err)
		return
	}

	claims, err := authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		render.Error(rw, err)
		return
	}

	updatedAt, err := tf.ValidateAndConvertTimestamp(req.Timestamp)
	if err != nil {
		render.Error(rw, err)
		return
	}

	funnel, err := handler.module.Get(r.Context(), req.FunnelID, valuer.MustNewUUID(claims.OrgID))
	if err != nil {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput,
			errors.CodeInvalidInput,
			"funnel not found: %v", err))
		return
	}

	steps, err := tf.ProcessFunnelSteps(req.Steps)
	if err != nil {
		render.Error(rw, err)
		return
	}

	funnel.Steps = steps
	funnel.UpdatedAt = updatedAt
	funnel.UpdatedBy = claims.UserID

	if req.Name != "" {
		funnel.Name = req.Name
	}
	if req.Description != "" {
		funnel.Description = req.Description
	}

	if err := handler.module.Update(r.Context(), funnel, valuer.MustNewUUID(claims.UserID)); err != nil {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput,
			errors.CodeInvalidInput,
			"failed to update funnel in database: %v", err))
		return
	}

	updatedFunnel, err := handler.module.Get(r.Context(), funnel.ID, valuer.MustNewUUID(claims.OrgID))
	if err != nil {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput,
			errors.CodeInvalidInput,
			"failed to get updated funnel: %v", err))
		return
	}

	response := tf.ConstructFunnelResponse(updatedFunnel, &claims)
	render.Success(rw, http.StatusOK, response)
}

func (handler *handler) UpdateFunnel(rw http.ResponseWriter, r *http.Request) {
	var req tf.PostableFunnel
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		render.Error(rw, err)
		return
	}

	claims, err := authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		render.Error(rw, err)
		return
	}

	updatedAt, err := tf.ValidateAndConvertTimestamp(req.Timestamp)
	if err != nil {
		render.Error(rw, err)
		return
	}

	vars := mux.Vars(r)
	funnelID := vars["funnel_id"]

	funnel, err := handler.module.Get(r.Context(), valuer.MustNewUUID(funnelID), valuer.MustNewUUID(claims.OrgID))
	if err != nil {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput,
			errors.CodeInvalidInput,
			"funnel not found: %v", err))
		return
	}

	funnel.UpdatedAt = updatedAt
	funnel.UpdatedBy = claims.UserID

	if req.Name != "" {
		funnel.Name = req.Name
	}
	if req.Description != "" {
		funnel.Description = req.Description
	}

	if err := handler.module.Update(r.Context(), funnel, valuer.MustNewUUID(claims.UserID)); err != nil {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput,
			errors.CodeInvalidInput,
			"failed to update funnel in database: %v", err))
		return
	}

	updatedFunnel, err := handler.module.Get(r.Context(), funnel.ID, valuer.MustNewUUID(claims.OrgID))
	if err != nil {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput,
			errors.CodeInvalidInput,
			"failed to get updated funnel: %v", err))
		return
	}

	response := tf.ConstructFunnelResponse(updatedFunnel, &claims)
	render.Success(rw, http.StatusOK, response)
}

func (handler *handler) List(rw http.ResponseWriter, r *http.Request) {
	claims, err := authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		render.Error(rw, err)
		return
	}

	funnels, err := handler.module.List(r.Context(), valuer.MustNewUUID(claims.OrgID))
	if err != nil {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput,
			errors.CodeInvalidInput,
			"failed to list funnels: %v", err))
		return
	}

	var response []tf.GettableFunnel
	for _, f := range funnels {
		response = append(response, tf.ConstructFunnelResponse(f, &claims))
	}

	render.Success(rw, http.StatusOK, response)
}

func (handler *handler) Get(rw http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	funnelID := vars["funnel_id"]

	claims, err := authtypes.ClaimsFromContext(r.Context())

	if err != nil {
		render.Error(rw, err)
		return
	}

	funnel, err := handler.module.Get(r.Context(), valuer.MustNewUUID(funnelID), valuer.MustNewUUID(claims.OrgID))
	if err != nil {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput,
			errors.CodeInvalidInput,
			"funnel not found: %v", err))
		return
	}
	response := tf.ConstructFunnelResponse(funnel, &claims)
	render.Success(rw, http.StatusOK, response)
}

func (handler *handler) Delete(rw http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	funnelID := vars["funnel_id"]

	claims, err := authtypes.ClaimsFromContext(r.Context())

	if err != nil {
		render.Error(rw, err)
		return
	}

	if err := handler.module.Delete(r.Context(), valuer.MustNewUUID(funnelID), valuer.MustNewUUID(claims.OrgID)); err != nil {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput,
			errors.CodeInvalidInput,
			"failed to delete funnel: %v", err))
		return
	}

	render.Success(rw, http.StatusOK, nil)
}

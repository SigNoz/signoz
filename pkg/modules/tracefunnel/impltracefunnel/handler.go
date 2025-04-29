package impltracefunnel

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/modules/tracefunnel"
	tf "github.com/SigNoz/signoz/pkg/types/tracefunnel"
	"github.com/gorilla/mux"
)

type handler struct {
	module tracefunnel.Module
}

func NewHandler(module tracefunnel.Module) tracefunnel.Handler {
	return &handler{module: module}
}

func (handler *handler) New(rw http.ResponseWriter, r *http.Request) {
	var req tf.FunnelRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		render.Error(rw, err)
		return
	}

	claims, err := tracefunnel.GetClaims(r)
	if err != nil {
		render.Error(rw, err)
		return
	}

	funnel, err := handler.module.Create(r.Context(), req.Timestamp, req.Name, claims.UserID, claims.OrgID)
	if err != nil {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput,
			errors.CodeInvalidInput,
			"failed to create funnel: %v", err))
		return
	}

	response := tracefunnel.ConstructFunnelResponse(funnel, claims)
	render.Success(rw, http.StatusOK, response)
}

func (handler *handler) UpdateSteps(rw http.ResponseWriter, r *http.Request) {
	var req tf.FunnelRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		render.Error(rw, err)
		return
	}

	claims, err := tracefunnel.GetClaims(r)
	if err != nil {
		render.Error(rw, err)
		return
	}

	updatedAt, err := tracefunnel.ValidateAndConvertTimestamp(req.Timestamp)
	if err != nil {
		render.Error(rw, err)
		return
	}

	funnel, err := handler.module.Get(r.Context(), req.FunnelID.String())
	if err != nil {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput,
			errors.CodeInvalidInput,
			"funnel not found: %v", err))
		return
	}

	steps, err := tracefunnel.ProcessFunnelSteps(req.Steps)
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

	if err := handler.module.Update(r.Context(), funnel, claims.UserID); err != nil {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput,
			errors.CodeInvalidInput,
			"failed to update funnel in database: %v", err))
		return
	}

	updatedFunnel, err := handler.module.Get(r.Context(), funnel.ID.String())
	if err != nil {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput,
			errors.CodeInvalidInput,
			"failed to get updated funnel: %v", err))
		return
	}

	response := tracefunnel.ConstructFunnelResponse(updatedFunnel, claims)
	render.Success(rw, http.StatusOK, response)
}

func (handler *handler) UpdateFunnel(rw http.ResponseWriter, r *http.Request) {
	var req tf.FunnelRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		render.Error(rw, err)
		return
	}

	claims, err := tracefunnel.GetClaims(r)
	if err != nil {
		render.Error(rw, err)
		return
	}

	updatedAt, err := tracefunnel.ValidateAndConvertTimestamp(req.Timestamp)
	if err != nil {
		render.Error(rw, err)
		return
	}

	vars := mux.Vars(r)
	funnelID := vars["funnel_id"]

	funnel, err := handler.module.Get(r.Context(), funnelID)
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

	if err := handler.module.Update(r.Context(), funnel, claims.UserID); err != nil {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput,
			errors.CodeInvalidInput,
			"failed to update funnel in database: %v", err))
		return
	}

	updatedFunnel, err := handler.module.Get(r.Context(), funnel.ID.String())
	if err != nil {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput,
			errors.CodeInvalidInput,
			"failed to get updated funnel: %v", err))
		return
	}

	response := tracefunnel.ConstructFunnelResponse(updatedFunnel, claims)
	render.Success(rw, http.StatusOK, response)
}

func (handler *handler) List(rw http.ResponseWriter, r *http.Request) {
	claims, err := tracefunnel.GetClaims(r)
	if err != nil {
		render.Error(rw, err)
		return
	}

	funnels, err := handler.module.List(r.Context(), claims.OrgID)
	if err != nil {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput,
			errors.CodeInvalidInput,
			"failed to list funnels: %v", err))
		return
	}

	var response []tf.FunnelResponse
	for _, f := range funnels {
		response = append(response, tracefunnel.ConstructFunnelResponse(f, claims))
	}

	render.Success(rw, http.StatusOK, response)
}

func (handler *handler) Get(rw http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	funnelID := vars["funnel_id"]

	funnel, err := handler.module.Get(r.Context(), funnelID)
	if err != nil {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput,
			errors.CodeInvalidInput,
			"funnel not found: %v", err))
		return
	}

	claims, _ := tracefunnel.GetClaims(r) // Ignore error as email is optional
	response := tracefunnel.ConstructFunnelResponse(funnel, claims)
	render.Success(rw, http.StatusOK, response)
}

func (handler *handler) Delete(rw http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	funnelID := vars["funnel_id"]

	if err := handler.module.Delete(r.Context(), funnelID); err != nil {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput,
			errors.CodeInvalidInput,
			"failed to delete funnel: %v", err))
		return
	}

	render.Success(rw, http.StatusOK, nil)
}

func (handler *handler) Save(rw http.ResponseWriter, r *http.Request) {
	var req tf.FunnelRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput,
			errors.CodeInvalidInput,
			"invalid request: %v", err))
		return
	}

	claims, err := tracefunnel.GetClaims(r)
	if err != nil {
		render.Error(rw, err)
		return
	}

	funnel, err := handler.module.Get(r.Context(), req.FunnelID.String())
	if err != nil {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput,
			errors.CodeInvalidInput,
			"funnel not found: %v", err))
		return
	}

	updateTimestamp := req.Timestamp
	if updateTimestamp == 0 {
		updateTimestamp = time.Now().UnixMilli()
	} else if !tracefunnel.ValidateTimestampIsMilliseconds(updateTimestamp) {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput,
			errors.CodeInvalidInput,
			"timestamp must be in milliseconds format (13 digits)"))
		return
	}

	updatedAt, err := tracefunnel.ValidateAndConvertTimestamp(updateTimestamp)
	if err != nil {
		render.Error(rw, err)
		return
	}

	funnel.UpdatedAt = updatedAt
	funnel.UpdatedBy = claims.UserID
	funnel.Description = req.Description

	if err := handler.module.Save(r.Context(), funnel, funnel.UpdatedBy, claims.OrgID); err != nil {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput,
			errors.CodeInvalidInput,
			"failed to save funnel: %v", err))
		return
	}

	createdAtMillis, updatedAtMillis, extraDataFromDB, err := handler.module.GetFunnelMetadata(r.Context(), funnel.ID.String())
	if err != nil {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput,
			errors.CodeInvalidInput,
			"failed to get funnel metadata: %v", err))
		return
	}

	resp := tf.FunnelResponse{
		FunnelName:  funnel.Name,
		CreatedAt:   createdAtMillis,
		UpdatedAt:   updatedAtMillis,
		CreatedBy:   funnel.CreatedBy,
		UpdatedBy:   funnel.UpdatedBy,
		OrgID:       funnel.OrgID.String(),
		Description: extraDataFromDB,
		UserEmail:   claims.Email,
	}

	render.Success(rw, http.StatusOK, resp)
}

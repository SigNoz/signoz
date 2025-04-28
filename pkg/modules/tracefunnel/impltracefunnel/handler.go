package impltracefunnel

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/modules/tracefunnel"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	tf "github.com/SigNoz/signoz/pkg/types/tracefunnel"
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
	var req tf.FunnelRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		render.Error(rw, err)
		return
	}

	claims, err := authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		render.Error(rw, err)
		return
	}
	userID := claims.UserID
	orgID := claims.OrgID

	funnels, err := handler.module.List(r.Context(), orgID)
	if err != nil {
		render.Error(rw, err)
		return
	}

	for _, f := range funnels {
		if f.Name == req.Name {
			render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "a funnel with name '%s' already exists in this organization", req.Name))
			return
		}
	}

	funnel, err := handler.module.Create(r.Context(), req.Timestamp, req.Name, userID, orgID)
	if err != nil {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "failed to create funnel"))
		return
	}

	response := tf.FunnelResponse{
		FunnelID:   funnel.ID.String(),
		FunnelName: funnel.Name,
		CreatedAt:  req.Timestamp,
		UserEmail:  claims.Email,
		OrgID:      orgID,
	}

	render.Success(rw, http.StatusOK, response)
}

func (handler *handler) Update(rw http.ResponseWriter, r *http.Request) {
	var req tf.FunnelRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		render.Error(rw, err)
		return
	}

	claims, err := authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		render.Error(rw, err)
		return
	}
	userID := claims.UserID
	orgID := claims.OrgID

	if err := tracefunnel.ValidateTimestamp(req.Timestamp, "timestamp"); err != nil {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "timestamp is invalid: %v", err))
		return
	}

	funnel, err := handler.module.Get(r.Context(), req.FunnelID.String())
	if err != nil {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "funnel not found: %v", err))
		return
	}

	// Check if name is being updated and if it already exists
	if req.Name != "" && req.Name != funnel.Name {
		funnels, err := handler.module.List(r.Context(), orgID)
		if err != nil {
			render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "failed to list funnels: %v", err))
			return
		}

		for _, f := range funnels {
			if f.Name == req.Name {
				render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "a funnel with name '%s' already exists in this organization", req.Name))
				return
			}
		}
	}

	// Process each step in the request
	for i := range req.Steps {
		if req.Steps[i].Order < 1 {
			req.Steps[i].Order = int64(i + 1) // Default to sequential ordering if not specified
		}
		// Generate a new UUID for the step if it doesn't have one
		if req.Steps[i].Id.IsZero() {
			newUUID := valuer.GenerateUUID()
			req.Steps[i].Id = newUUID
		}
	}

	if err := tracefunnel.ValidateFunnelSteps(req.Steps); err != nil {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "invalid funnel steps: %v", err))
		return
	}

	// Normalize step orders
	req.Steps = tracefunnel.NormalizeFunnelSteps(req.Steps)

	// Update the funnel with new steps
	funnel.Steps = req.Steps
	funnel.UpdatedAt = time.Unix(0, req.Timestamp*1000000) // Convert to nanoseconds
	funnel.UpdatedBy = userID

	if req.Name != "" {
		funnel.Name = req.Name
	}
	if req.Description != "" {
		funnel.Description = req.Description
	}

	// Update funnel in database
	err = handler.module.Update(r.Context(), funnel, userID)
	if err != nil {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "failed to update funnel in database: %v", err))
		return
	}

	//// Update name and description if provided
	//if req.Name != "" || req.Description != "" {
	//	name := req.Name
	//
	//	description := req.Description
	//
	//	err = handler.module.UpdateMetadata(r.Context(), funnel.ID, name, description, userID)
	//	if err != nil {
	//		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "failed to update funnel metadata: %v", err))
	//		return
	//	}
	//}

	// Get the updated funnel to return in response
	updatedFunnel, err := handler.module.Get(r.Context(), funnel.ID.String())
	if err != nil {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "failed to get updated funnel: %v", err))
		return
	}

	response := tf.FunnelResponse{
		FunnelName:  updatedFunnel.Name,
		FunnelID:    updatedFunnel.ID.String(),
		Steps:       updatedFunnel.Steps,
		CreatedAt:   updatedFunnel.CreatedAt.UnixNano() / 1000000,
		CreatedBy:   updatedFunnel.CreatedBy,
		OrgID:       updatedFunnel.OrgID.String(),
		UpdatedBy:   userID,
		UpdatedAt:   updatedFunnel.UpdatedAt.UnixNano() / 1000000,
		Description: updatedFunnel.Description,
	}

	render.Success(rw, http.StatusOK, response)
}

func (handler *handler) List(rw http.ResponseWriter, r *http.Request) {
	claims, err := authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "unauthenticated"))
		return
	}

	orgID := claims.OrgID
	funnels, err := handler.module.List(r.Context(), orgID)
	if err != nil {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "failed to list funnels: %v", err))
		return
	}

	var response []tf.FunnelResponse
	for _, f := range funnels {
		funnelResp := tf.FunnelResponse{
			FunnelName:  f.Name,
			FunnelID:    f.ID.String(),
			CreatedAt:   f.CreatedAt.UnixNano() / 1000000,
			CreatedBy:   f.CreatedBy,
			OrgID:       f.OrgID.String(),
			UpdatedAt:   f.UpdatedAt.UnixNano() / 1000000,
			UpdatedBy:   f.UpdatedBy,
			Description: f.Description,
		}

		// Get user email if available
		if f.CreatedByUser != nil {
			funnelResp.UserEmail = f.CreatedByUser.Email
		}

		response = append(response, funnelResp)
	}

	render.Success(rw, http.StatusOK, response)
}

func (handler *handler) Get(rw http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	funnelID := vars["funnel_id"]

	funnel, err := handler.module.Get(r.Context(), funnelID)
	if err != nil {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "funnel not found: %v", err))
		return
	}

	// Create a response with all funnel details including step IDs
	response := tf.FunnelResponse{
		FunnelID:    funnel.ID.String(),
		FunnelName:  funnel.Name,
		Description: funnel.Description,
		CreatedAt:   funnel.CreatedAt.UnixNano() / 1000000,
		UpdatedAt:   funnel.UpdatedAt.UnixNano() / 1000000,
		CreatedBy:   funnel.CreatedBy,
		UpdatedBy:   funnel.UpdatedBy,
		OrgID:       funnel.OrgID.String(),
		Steps:       funnel.Steps,
	}

	// Add user email if available
	if funnel.CreatedByUser != nil {
		response.UserEmail = funnel.CreatedByUser.Email
	}

	render.Success(rw, http.StatusOK, response)
}

func (handler *handler) Delete(rw http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	funnelID := vars["funnel_id"]

	err := handler.module.Delete(r.Context(), funnelID)
	if err != nil {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "failed to delete funnel: %v", err))
		return
	}

	render.Success(rw, http.StatusOK, nil)
}

func (handler *handler) Save(rw http.ResponseWriter, r *http.Request) {
	var req tf.FunnelRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "invalid request: %v", err))
		return
	}

	claims, err := authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "unauthenticated"))
		return
	}
	orgID := claims.OrgID
	usrID := claims.UserID

	funnel, err := handler.module.Get(r.Context(), req.FunnelID.String())
	if err != nil {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "funnel not found: %v", err))
		return
	}

	updateTimestamp := req.Timestamp
	if updateTimestamp == 0 {
		updateTimestamp = time.Now().UnixMilli()
	} else if !tracefunnel.ValidateTimestampIsMilliseconds(updateTimestamp) {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "timestamp must be in milliseconds format (13 digits)"))
		return
	}
	funnel.UpdatedAt = time.Unix(0, updateTimestamp*1000000) // Convert to nanoseconds

	if req.UserID != "" {
		funnel.UpdatedBy = usrID
	}

	funnel.Description = req.Description

	if err := handler.module.Save(r.Context(), funnel, funnel.UpdatedBy, orgID); err != nil {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "failed to save funnel: %v", err))
		return
	}

	// Try to fetch metadata from DB
	createdAt, updatedAt, extraDataFromDB, err := handler.module.GetFunnelMetadata(r.Context(), funnel.ID.String())
	if err != nil {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "failed to get funnel metadata: %v", err))
		return
	}

	resp := tf.FunnelResponse{
		FunnelName:  funnel.Name,
		CreatedAt:   createdAt,
		UpdatedAt:   updatedAt,
		CreatedBy:   funnel.CreatedBy,
		UpdatedBy:   funnel.UpdatedBy,
		OrgID:       funnel.OrgID.String(),
		Description: extraDataFromDB,
	}

	render.Success(rw, http.StatusOK, resp)
}

//func (handler *handler) ValidateTraces(rw http.ResponseWriter, r *http.Request) {
//	vars := mux.Vars(r)
//	funnelID := vars["funnel_id"]
//
//	funnel, err := handler.module.Get(r.Context(), funnelID)
//	if err != nil {
//		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "funnel not found: %v", err))
//		return
//	}
//
//	var timeRange tf.TimeRange
//	if err := json.NewDecoder(r.Body).Decode(&timeRange); err != nil {
//		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "error decoding time range: %v", err))
//		return
//	}
//
//	response, err := handler.module.ValidateTraces(r.Context(), funnel, timeRange)
//	if err != nil {
//		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "error validating traces: %v", err))
//		return
//	}
//
//	render.Success(rw, http.StatusOK, response)
//}
//
//func (handler *handler) FunnelAnalytics(rw http.ResponseWriter, r *http.Request) {
//	vars := mux.Vars(r)
//	funnelID := vars["funnel_id"]
//
//	funnel, err := handler.module.Get(r.Context(), funnelID)
//	if err != nil {
//		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "funnel not found: %v", err))
//		return
//	}
//
//	var timeRange tf.TimeRange
//	if err := json.NewDecoder(r.Body).Decode(&timeRange); err != nil {
//		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "error decoding time range: %v", err))
//		return
//	}
//
//	response, err := handler.module.GetFunnelAnalytics(r.Context(), funnel, timeRange)
//	if err != nil {
//		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "error getting funnel analytics: %v", err))
//		return
//	}
//
//	render.Success(rw, http.StatusOK, response)
//}
//
//func (handler *handler) StepAnalytics(rw http.ResponseWriter, r *http.Request) {
//	vars := mux.Vars(r)
//	funnelID := vars["funnel_id"]
//
//	funnel, err := handler.module.Get(r.Context(), funnelID)
//	if err != nil {
//		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "funnel not found: %v", err))
//		return
//	}
//
//	var timeRange tf.TimeRange
//	if err := json.NewDecoder(r.Body).Decode(&timeRange); err != nil {
//		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "error decoding time range: %v", err))
//		return
//	}
//
//	response, err := handler.module.GetStepAnalytics(r.Context(), funnel, timeRange)
//	if err != nil {
//		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "error getting step analytics: %v", err))
//		return
//	}
//
//	render.Success(rw, http.StatusOK, response)
//}
//
//func (handler *handler) SlowestTraces(rw http.ResponseWriter, r *http.Request) {
//	handler.handleTracesWithLatency(rw, r, false)
//}
//
//func (handler *handler) ErrorTraces(rw http.ResponseWriter, r *http.Request) {
//	handler.handleTracesWithLatency(rw, r, true)
//}
//
//// handleTracesWithLatency handles both slow and error traces with common logic
//func (handler *handler) handleTracesWithLatency(rw http.ResponseWriter, r *http.Request, isError bool) {
//	funnel, req, err := handler.validateTracesRequest(r)
//	if err != nil {
//		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "%v", err))
//		return
//	}
//
//	if err := tracefunnel.ValidateSteps(funnel, req.StepAOrder, req.StepBOrder); err != nil {
//		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "%v", err))
//		return
//	}
//
//	response, err := handler.module.GetSlowestTraces(r.Context(), funnel, req.StepAOrder, req.StepBOrder, req.TimeRange, isError)
//	if err != nil {
//		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "error getting traces: %v", err))
//		return
//	}
//
//	render.Success(rw, http.StatusOK, response)
//}
//
//// validateTracesRequest validates and extracts the request parameters
//func (handler *handler) validateTracesRequest(r *http.Request) (*tf.Funnel, *tf.StepTransitionRequest, error) {
//	vars := mux.Vars(r)
//	funnelID := vars["funnel_id"]
//
//	funnel, err := handler.module.Get(r.Context(), funnelID)
//	if err != nil {
//		return nil, nil, fmt.Errorf("funnel not found: %v", err)
//	}
//
//	var req tf.StepTransitionRequest
//	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
//		return nil, nil, fmt.Errorf("invalid request body: %v", err)
//	}
//
//	return funnel, &req, nil
//}

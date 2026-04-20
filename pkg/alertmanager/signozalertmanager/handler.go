package signozalertmanager

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"time"

	"github.com/SigNoz/signoz/pkg/alertmanager"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/gorilla/mux"
)

type handler struct {
	alertmanager alertmanager.Alertmanager
}

func NewHandler(alertmanager alertmanager.Alertmanager) alertmanager.Handler {
	return &handler{alertmanager: alertmanager}
}

func (handler *handler) GetAlerts(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 30*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	params, err := alertmanagertypes.NewGettableAlertsParams(req)
	if err != nil {
		render.Error(rw, err)
		return
	}

	alerts, err := handler.alertmanager.GetAlerts(ctx, claims.OrgID, params)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, alerts)
}

func (handler *handler) TestReceiver(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 30*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	body, err := io.ReadAll(req.Body)
	if err != nil {
		render.Error(rw, err)
		return
	}
	defer req.Body.Close() //nolint:errcheck

	receiver, err := alertmanagertypes.NewReceiver(string(body))
	if err != nil {
		render.Error(rw, err)
		return
	}

	err = handler.alertmanager.TestReceiver(ctx, claims.OrgID, receiver)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusNoContent, nil)
}

func (handler *handler) ListChannels(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 30*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	channels, err := handler.alertmanager.ListChannels(ctx, claims.OrgID)
	if err != nil {
		render.Error(rw, err)
		return
	}

	// This ensures that the UI receives an empty array instead of null
	if len(channels) == 0 {
		channels = make([]*alertmanagertypes.Channel, 0)
	}

	render.Success(rw, http.StatusOK, channels)
}

func (handler *handler) ListAllChannels(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 30*time.Second)
	defer cancel()

	channels, err := handler.alertmanager.ListAllChannels(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, channels)
}

func (handler *handler) GetChannelByID(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 30*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	vars := mux.Vars(req)
	if vars == nil {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "id is required in path"))
		return
	}

	idString, ok := vars["id"]
	if !ok {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "id is required in path"))
		return
	}

	id, err := valuer.NewUUID(idString)
	if err != nil {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "id is not a valid uuid-v7"))
		return
	}

	channel, err := handler.alertmanager.GetChannelByID(ctx, claims.OrgID, id)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, channel)
}

func (handler *handler) UpdateChannelByID(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 30*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	vars := mux.Vars(req)
	if vars == nil {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "id is required in path"))
		return
	}

	idString, ok := vars["id"]
	if !ok {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "id is required in path"))
		return
	}

	id, err := valuer.NewUUID(idString)
	if err != nil {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "id is not a valid uuid-v7"))
		return
	}

	body, err := io.ReadAll(req.Body)
	if err != nil {
		render.Error(rw, err)
		return
	}
	defer req.Body.Close() //nolint:errcheck

	receiver, err := alertmanagertypes.NewReceiver(string(body))
	if err != nil {
		render.Error(rw, err)
		return
	}

	err = handler.alertmanager.UpdateChannelByReceiverAndID(ctx, claims.OrgID, receiver, id)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusNoContent, nil)
}

func (handler *handler) DeleteChannelByID(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 30*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	vars := mux.Vars(req)
	if vars == nil {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "id is required in path"))
		return
	}

	idString, ok := vars["id"]
	if !ok {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "id is required in path"))
		return
	}

	id, err := valuer.NewUUID(idString)
	if err != nil {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "id is not a valid uuid-v7"))
		return
	}

	err = handler.alertmanager.DeleteChannelByID(ctx, claims.OrgID, id)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusNoContent, nil)
}

func (handler *handler) CreateChannel(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 30*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	body, err := io.ReadAll(req.Body)
	if err != nil {
		render.Error(rw, err)
		return
	}
	defer req.Body.Close() //nolint:errcheck

	receiver, err := alertmanagertypes.NewReceiver(string(body))
	if err != nil {
		render.Error(rw, err)
		return
	}

	channel, err := handler.alertmanager.CreateChannel(ctx, claims.OrgID, receiver)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusCreated, channel)
}

func (handler *handler) CreateRoutePolicy(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 30*time.Second)
	defer cancel()

	body, err := io.ReadAll(req.Body)
	if err != nil {
		render.Error(rw, err)
		return
	}
	defer req.Body.Close()
	var policy alertmanagertypes.PostableRoutePolicy
	err = json.Unmarshal(body, &policy)
	if err != nil {
		render.Error(rw, err)
		return
	}

	policy.ExpressionKind = alertmanagertypes.PolicyBasedExpression

	// Validate the postable route
	if err := policy.Validate(); err != nil {
		render.Error(rw, err)
		return
	}

	result, err := handler.alertmanager.CreateRoutePolicy(ctx, &policy)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusCreated, result)
}

func (handler *handler) GetAllRoutePolicies(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 30*time.Second)
	defer cancel()

	policies, err := handler.alertmanager.GetAllRoutePolicies(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, policies)
}

func (handler *handler) GetRoutePolicyByID(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 30*time.Second)
	defer cancel()

	vars := mux.Vars(req)
	policyID := vars["id"]
	if policyID == "" {
		render.Error(rw, errors.NewInvalidInputf(errors.CodeInvalidInput, "policy ID is required"))
		return
	}

	policy, err := handler.alertmanager.GetRoutePolicyByID(ctx, policyID)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, policy)
}

func (handler *handler) DeleteRoutePolicyByID(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 30*time.Second)
	defer cancel()

	vars := mux.Vars(req)
	policyID := vars["id"]
	if policyID == "" {
		render.Error(rw, errors.NewInvalidInputf(errors.CodeInvalidInput, "policy ID is required"))
		return
	}

	err := handler.alertmanager.DeleteRoutePolicyByID(ctx, policyID)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusNoContent, nil)
}

func (handler *handler) UpdateRoutePolicy(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 30*time.Second)
	defer cancel()

	vars := mux.Vars(req)
	policyID := vars["id"]
	if policyID == "" {
		render.Error(rw, errors.NewInvalidInputf(errors.CodeInvalidInput, "policy ID is required"))
		return
	}
	body, err := io.ReadAll(req.Body)
	if err != nil {
		render.Error(rw, err)
		return
	}
	defer req.Body.Close()
	var policy alertmanagertypes.PostableRoutePolicy
	err = json.Unmarshal(body, &policy)
	if err != nil {
		render.Error(rw, err)
		return
	}
	policy.ExpressionKind = alertmanagertypes.PolicyBasedExpression

	// Validate the postable route
	if err := policy.Validate(); err != nil {
		render.Error(rw, err)
		return
	}

	result, err := handler.alertmanager.UpdateRoutePolicyByID(ctx, policyID, &policy)
	if err != nil {
		render.Error(rw, err)
		return
	}
	render.Success(rw, http.StatusOK, result)
}

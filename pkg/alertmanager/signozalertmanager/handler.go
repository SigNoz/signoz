package signozalertmanager

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"time"

	"github.com/SigNoz/signoz/pkg/alertmanager"
	"github.com/SigNoz/signoz/pkg/alertmanager/signozalertmanager/atlassian"
	"github.com/SigNoz/signoz/pkg/alertmanager/signozalertmanager/jira"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/gorilla/mux"
)

type handler struct {
	alertmanager alertmanager.Alertmanager
	atlassian    *atlassian.Handler
	jira         *jira.Handler
}

func NewHandler(alertmanager alertmanager.Alertmanager) alertmanager.Handler {
	return &handler{
		alertmanager: alertmanager,
		atlassian:    atlassian.NewHandler(alertmanager),
		jira:         jira.NewHandler(alertmanager),
	}
}

// AtlassianOAuthSession starts the Atlassian OAuth flow and returns the consent URL.
func (handler *handler) AtlassianOAuthSession(rw http.ResponseWriter, req *http.Request) {
	handler.atlassian.OAuthSession(rw, req)
}

// AtlassianOAuthCallback completes the Atlassian OAuth flow and persists the connection.
func (handler *handler) AtlassianOAuthCallback(rw http.ResponseWriter, req *http.Request) {
	handler.atlassian.OAuthCallback(rw, req)
}

// AtlassianConnections lists the org's reusable Atlassian OAuth connections.
func (handler *handler) AtlassianConnections(rw http.ResponseWriter, req *http.Request) {
	handler.atlassian.ListConnections(rw, req)
}

// AtlassianConnectionDelete removes an Atlassian OAuth connection.
func (handler *handler) AtlassianConnectionDelete(rw http.ResponseWriter, req *http.Request) {
	handler.atlassian.DeleteConnection(rw, req)
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

	if err := handler.atlassian.ResolveConnections(ctx, claims.OrgID, receiver); err != nil {
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

// GetJiraMetadata returns the create-issue field metadata for a project and issue type.
func (handler *handler) GetJiraMetadata(rw http.ResponseWriter, req *http.Request) {
	handler.jira.Metadata(rw, req)
}

// ListJiraProjects lists the Jira projects visible to a connection.
func (handler *handler) ListJiraProjects(rw http.ResponseWriter, req *http.Request) {
	handler.jira.Projects(rw, req)
}

// ListJiraProjectIssueTypes lists the creatable issue types for a project.
func (handler *handler) ListJiraProjectIssueTypes(rw http.ResponseWriter, req *http.Request) {
	handler.jira.ProjectIssueTypes(rw, req)
}

// ListJiraUsers lists the users assignable to issues in a project.
func (handler *handler) ListJiraUsers(rw http.ResponseWriter, req *http.Request) {
	handler.jira.Users(rw, req)
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

	// For Jira, validate the referenced connection belongs to the org and stamp OrgID.
	if err := handler.atlassian.ResolveConnections(ctx, claims.OrgID, receiver); err != nil {
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

	// TODO: Move to PostableChannel and binding package
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

	if err := handler.atlassian.ResolveConnections(ctx, claims.OrgID, receiver); err != nil {
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

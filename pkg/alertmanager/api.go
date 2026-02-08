package alertmanager

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"strconv"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/gorilla/mux"
)

type API struct {
	alertmanager Alertmanager
}

func NewAPI(alertmanager Alertmanager) *API {
	return &API{
		alertmanager: alertmanager,
	}
}

func (api *API) GetAlerts(rw http.ResponseWriter, req *http.Request) {
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

	alerts, err := api.alertmanager.GetAlerts(ctx, claims.OrgID, params)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, alerts)
}

func (api *API) TestReceiver(rw http.ResponseWriter, req *http.Request) {
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

	err = api.alertmanager.TestReceiver(ctx, claims.OrgID, receiver)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusNoContent, nil)
}

func (api *API) ListChannels(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 30*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	channels, err := api.alertmanager.ListChannels(ctx, claims.OrgID)
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

func (api *API) ListAllChannels(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 30*time.Second)
	defer cancel()

	channels, err := api.alertmanager.ListAllChannels(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, channels)
}

func (api *API) GetChannelByID(rw http.ResponseWriter, req *http.Request) {
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

	channel, err := api.alertmanager.GetChannelByID(ctx, claims.OrgID, id)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, channel)
}

func (api *API) UpdateChannelByID(rw http.ResponseWriter, req *http.Request) {
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

	err = api.alertmanager.UpdateChannelByReceiverAndID(ctx, claims.OrgID, receiver, id)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusNoContent, nil)
}

func (api *API) DeleteChannelByID(rw http.ResponseWriter, req *http.Request) {
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

	err = api.alertmanager.DeleteChannelByID(ctx, claims.OrgID, id)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusNoContent, nil)
}

func (api *API) CreateChannel(rw http.ResponseWriter, req *http.Request) {
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

	channel, err := api.alertmanager.CreateChannel(ctx, claims.OrgID, receiver)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusCreated, channel)
}

func (api *API) CreateRoutePolicy(rw http.ResponseWriter, req *http.Request) {
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

	result, err := api.alertmanager.CreateRoutePolicy(ctx, &policy)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusCreated, result)
}

func (api *API) GetAllRoutePolicies(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 30*time.Second)
	defer cancel()

	policies, err := api.alertmanager.GetAllRoutePolicies(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, policies)
}

func (api *API) GetRoutePolicyByID(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 30*time.Second)
	defer cancel()

	vars := mux.Vars(req)
	policyID := vars["id"]
	if policyID == "" {
		render.Error(rw, errors.NewInvalidInputf(errors.CodeInvalidInput, "policy ID is required"))
		return
	}

	policy, err := api.alertmanager.GetRoutePolicyByID(ctx, policyID)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, policy)
}

func (api *API) DeleteRoutePolicyByID(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 30*time.Second)
	defer cancel()

	vars := mux.Vars(req)
	policyID := vars["id"]
	if policyID == "" {
		render.Error(rw, errors.NewInvalidInputf(errors.CodeInvalidInput, "policy ID is required"))
		return
	}

	err := api.alertmanager.DeleteRoutePolicyByID(ctx, policyID)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusNoContent, nil)
}

func (api *API) UpdateRoutePolicy(rw http.ResponseWriter, req *http.Request) {
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

	result, err := api.alertmanager.UpdateRoutePolicyByID(ctx, policyID, &policy)
	if err != nil {
		render.Error(rw, err)
		return
	}
	render.Success(rw, http.StatusOK, result)
}

func (api *API) ListDowntimeSchedules(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 30*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	schedules, err := api.alertmanager.GetAllPlannedMaintenance(ctx, claims.OrgID)
	if err != nil {
		render.Error(rw, err)
		return
	}

	if q := req.URL.Query().Get("active"); q != "" {
		active, _ := strconv.ParseBool(q)
		filtered := make([]*alertmanagertypes.GettablePlannedMaintenance, 0)
		for _, schedule := range schedules {
			now := time.Now().In(time.FixedZone(schedule.Schedule.Timezone, 0))
			if schedule.IsActive(now) == active {
				filtered = append(filtered, schedule)
			}
		}
		schedules = filtered
	}

	if q := req.URL.Query().Get("recurring"); q != "" {
		recurring, _ := strconv.ParseBool(q)
		filtered := make([]*alertmanagertypes.GettablePlannedMaintenance, 0)
		for _, schedule := range schedules {
			if schedule.IsRecurring() == recurring {
				filtered = append(filtered, schedule)
			}
		}
		schedules = filtered
	}

	render.Success(rw, http.StatusOK, schedules)
}

func (api *API) GetDowntimeSchedule(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 30*time.Second)
	defer cancel()

	vars := mux.Vars(req)
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

	schedule, err := api.alertmanager.GetPlannedMaintenanceByID(ctx, id)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, schedule)
}

func (api *API) CreateDowntimeSchedule(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 30*time.Second)
	defer cancel()

	body, err := io.ReadAll(req.Body)
	if err != nil {
		render.Error(rw, err)
		return
	}
	defer req.Body.Close() //nolint:errcheck

	var schedule alertmanagertypes.GettablePlannedMaintenance
	if err := json.Unmarshal(body, &schedule); err != nil {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "invalid request body: %v", err))
		return
	}

	if err := schedule.Validate(); err != nil {
		render.Error(rw, err)
		return
	}

	_, err = api.alertmanager.CreatePlannedMaintenance(ctx, schedule)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, nil)
}

func (api *API) EditDowntimeSchedule(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 30*time.Second)
	defer cancel()

	vars := mux.Vars(req)
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

	var schedule alertmanagertypes.GettablePlannedMaintenance
	if err := json.Unmarshal(body, &schedule); err != nil {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "invalid request body: %v", err))
		return
	}

	if err := schedule.Validate(); err != nil {
		render.Error(rw, err)
		return
	}

	err = api.alertmanager.EditPlannedMaintenance(ctx, schedule, id)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, nil)
}

func (api *API) DeleteDowntimeSchedule(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 30*time.Second)
	defer cancel()

	vars := mux.Vars(req)
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

	err = api.alertmanager.DeletePlannedMaintenance(ctx, id)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusNoContent, nil)
}

func (api *API) GetRuleStateHistoryTimeline(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 30*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	ruleID := mux.Vars(req)["id"]
	if ruleID == "" {
		render.Error(rw, errors.NewInvalidInputf(errors.CodeInvalidInput, "rule ID is required"))
		return
	}

	var params alertmanagertypes.QueryRuleStateHistory
	if err := json.NewDecoder(req.Body).Decode(&params); err != nil {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "invalid request body: %v", err))
		return
	}
	if err := params.Validate(); err != nil {
		render.Error(rw, err)
		return
	}

	result, err := api.alertmanager.GetRuleStateHistoryTimeline(ctx, claims.OrgID, ruleID, &params)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, result)
}

func (api *API) GetRuleStats(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 30*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	ruleID := mux.Vars(req)["id"]
	if ruleID == "" {
		render.Error(rw, errors.NewInvalidInputf(errors.CodeInvalidInput, "rule ID is required"))
		return
	}

	var params alertmanagertypes.QueryRuleStateHistory
	if err := json.NewDecoder(req.Body).Decode(&params); err != nil {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "invalid request body: %v", err))
		return
	}
	if err := params.Validate(); err != nil {
		render.Error(rw, err)
		return
	}

	result, err := api.alertmanager.GetRuleStats(ctx, claims.OrgID, ruleID, &params)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, result)
}

func (api *API) GetRuleStateHistoryTopContributors(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 30*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	ruleID := mux.Vars(req)["id"]
	if ruleID == "" {
		render.Error(rw, errors.NewInvalidInputf(errors.CodeInvalidInput, "rule ID is required"))
		return
	}

	var params alertmanagertypes.QueryRuleStateHistory
	if err := json.NewDecoder(req.Body).Decode(&params); err != nil {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "invalid request body: %v", err))
		return
	}
	if err := params.Validate(); err != nil {
		render.Error(rw, err)
		return
	}

	result, err := api.alertmanager.GetRuleStateHistoryTopContributors(ctx, claims.OrgID, ruleID, &params)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, result)
}

func (api *API) GetOverallStateTransitions(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 30*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	ruleID := mux.Vars(req)["id"]
	if ruleID == "" {
		render.Error(rw, errors.NewInvalidInputf(errors.CodeInvalidInput, "rule ID is required"))
		return
	}

	var params alertmanagertypes.QueryRuleStateHistory
	if err := json.NewDecoder(req.Body).Decode(&params); err != nil {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "invalid request body: %v", err))
		return
	}
	if err := params.Validate(); err != nil {
		render.Error(rw, err)
		return
	}

	result, err := api.alertmanager.GetOverallStateTransitions(ctx, claims.OrgID, ruleID, &params)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, result)
}

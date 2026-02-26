package implcloudintergations

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/modules/cloudintegrations"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/integrationtypes"
	"github.com/gorilla/mux"
)

type handler struct {
	module cloudintegrations.Module
}

func NewHandler(module cloudintegrations.Module) *handler {
	return &handler{
		module: module,
	}
}

func (h *handler) CloudIntegrationsAgentCheckIn(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	cloudProviderString := mux.Vars(r)["cloudProvider"]

	cloudProvider, err := integrationtypes.NewCloudProvider(cloudProviderString)
	if err != nil {
		render.Error(rw, err)
		return
	}

	req := new(integrationtypes.PostableAgentCheckInPayload)
	if err = json.NewDecoder(r.Body).Decode(req); err != nil {
		render.Error(rw, errors.WrapInvalidInputf(err, errors.CodeInvalidInput, "invalid request body"))
		return
	}

	req.OrgID = claims.OrgID

	// we need to get the config

	resp, err := h.cloudIntegrationsRegistry[cloudProvider].AgentCheckIn(r.Context(), req)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, resp)
}

func (h *handler) ListServices(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		render.Error(rw, err)
		return
	}

	cloudProviderString := mux.Vars(r)["cloudProvider"]

	cloudProvider, err := integrationtypes.NewCloudProvider(cloudProviderString)
	if err != nil {
		render.Error(rw, err)
		return
	}

	var cloudAccountId *string

	cloudAccountIdQP := r.URL.Query().Get("cloud_account_id")
	if len(cloudAccountIdQP) > 0 {
		cloudAccountId = &cloudAccountIdQP
	}

	// give me the provider and then use it

	resp, err := h.module.ListServices(ctx, claims.OrgID, cloudProvider, cloudAccountId)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, resp)

}

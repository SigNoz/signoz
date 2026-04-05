package implcloudintegration

import (
	"context"
	"net/http"
	"time"

	"github.com/SigNoz/signoz/pkg/http/binding"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/modules/cloudintegration"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/cloudintegrationtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/gorilla/mux"
)

type handler struct {
	module cloudintegration.Module
}

func NewHandler(module cloudintegration.Module) cloudintegration.Handler {
	return &handler{
		module: module,
	}
}

func (handler *handler) GetConnectionCredentials(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	providerString := mux.Vars(r)["cloud_provider"]
	provider, err := cloudintegrationtypes.NewCloudProvider(providerString)
	if err != nil {
		render.Error(rw, err)
		return
	}

	creds, err := handler.module.GetConnectionCredentials(ctx, valuer.MustNewUUID(claims.OrgID), provider)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, creds)
}

func (handler *handler) CreateAccount(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	providerString := mux.Vars(r)["cloud_provider"]
	provider, err := cloudintegrationtypes.NewCloudProvider(providerString)
	if err != nil {
		render.Error(rw, err)
		return
	}

	postableConnectionArtifact := new(cloudintegrationtypes.PostableConnectionArtifact)

	err = binding.JSON.BindBody(r.Body, postableConnectionArtifact)
	if err != nil {
		render.Error(rw, err)
		return
	}

	if err := postableConnectionArtifact.Validate(provider); err != nil {
		render.Error(rw, err)
		return
	}

	accountConfig, err := cloudintegrationtypes.NewAccountConfigFromPostableArtifact(provider, postableConnectionArtifact)
	if err != nil {
		render.Error(rw, err)
		return
	}

	account := cloudintegrationtypes.NewAccount(valuer.MustNewUUID(claims.OrgID), provider, accountConfig)
	err = handler.module.CreateAccount(ctx, account)
	if err != nil {
		render.Error(rw, err)
		return
	}

	connectionArtifactRequest, err := cloudintegrationtypes.NewArtifactRequestFromPostableArtifact(provider, postableConnectionArtifact)
	if err != nil {
		render.Error(rw, err)
		return
	}

	connectionArtifact, err := handler.module.GetConnectionArtifact(ctx, account, connectionArtifactRequest)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, &cloudintegrationtypes.GettableAccountWithArtifact{
		ID:       account.ID,
		Artifact: connectionArtifact,
	})
}

func (handler *handler) GetAccount(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	providerString := mux.Vars(r)["cloud_provider"]
	provider, err := cloudintegrationtypes.NewCloudProvider(providerString)
	if err != nil {
		render.Error(rw, err)
		return
	}

	accountIDString := mux.Vars(r)["id"]
	accountID, err := valuer.NewUUID(accountIDString)
	if err != nil {
		render.Error(rw, err)
		return
	}

	account, err := handler.module.GetAccount(ctx, valuer.MustNewUUID(claims.OrgID), accountID, provider)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, account)
}

func (handler *handler) ListAccounts(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	providerString := mux.Vars(r)["cloud_provider"]
	provider, err := cloudintegrationtypes.NewCloudProvider(providerString)
	if err != nil {
		render.Error(rw, err)
		return
	}

	accounts, err := handler.module.ListAccounts(ctx, valuer.MustNewUUID(claims.OrgID), provider)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, &cloudintegrationtypes.GettableAccounts{
		Accounts: accounts,
	})
}

func (handler *handler) UpdateAccount(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	providerString := mux.Vars(r)["cloud_provider"]
	provider, err := cloudintegrationtypes.NewCloudProvider(providerString)
	if err != nil {
		render.Error(rw, err)
		return
	}

	id := mux.Vars(r)["id"]
	cloudIntegrationID, err := valuer.NewUUID(id)
	if err != nil {
		render.Error(rw, err)
		return
	}

	req := new(cloudintegrationtypes.UpdatableAccount)
	if err := binding.JSON.BindBody(r.Body, req); err != nil {
		render.Error(rw, err)
		return
	}

	if err := req.Validate(provider); err != nil {
		render.Error(rw, err)
		return
	}

	account, err := handler.module.GetAccount(ctx, valuer.MustNewUUID(claims.OrgID), cloudIntegrationID, provider)
	if err != nil {
		render.Error(rw, err)
		return
	}

	if err := account.Update(req.Config); err != nil {
		render.Error(rw, err)
		return
	}

	err = handler.module.UpdateAccount(ctx, account)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusNoContent, nil)
}

func (handler *handler) DisconnectAccount(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	providerString := mux.Vars(r)["cloud_provider"]
	provider, err := cloudintegrationtypes.NewCloudProvider(providerString)
	if err != nil {
		render.Error(rw, err)
		return
	}

	id := mux.Vars(r)["id"]
	cloudIntegrationID, err := valuer.NewUUID(id)
	if err != nil {
		render.Error(rw, err)
		return
	}

	err = handler.module.DisconnectAccount(ctx, valuer.MustNewUUID(claims.OrgID), cloudIntegrationID, provider)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusNoContent, nil)
}

func (handler *handler) ListServicesMetadata(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	providerString := mux.Vars(r)["cloud_provider"]
	provider, err := cloudintegrationtypes.NewCloudProvider(providerString)
	if err != nil {
		render.Error(rw, err)
		return
	}

	var integrationID *valuer.UUID
	if idStr := r.URL.Query().Get("cloud_integration_id"); idStr != "" {
		id, err := valuer.NewUUID(idStr)
		if err != nil {
			render.Error(rw, err)
			return
		}
		integrationID = &id
	}

	services, err := handler.module.ListServicesMetadata(ctx, valuer.MustNewUUID(claims.OrgID), provider, integrationID)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, &cloudintegrationtypes.GettableServicesMetadata{
		Services: services,
	})
}

func (handler *handler) GetService(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	providerString := mux.Vars(r)["cloud_provider"]
	provider, err := cloudintegrationtypes.NewCloudProvider(providerString)
	if err != nil {
		render.Error(rw, err)
		return
	}

	serviceIDString := mux.Vars(r)["service_id"]
	serviceID, err := cloudintegrationtypes.NewServiceID(provider, serviceIDString)
	if err != nil {
		render.Error(rw, err)
		return
	}

	var integrationID *valuer.UUID
	if idStr := r.URL.Query().Get("cloud_integration_id"); idStr != "" {
		id, err := valuer.NewUUID(idStr)
		if err != nil {
			render.Error(rw, err)
			return
		}
		integrationID = &id
	}

	svc, err := handler.module.GetService(ctx, valuer.MustNewUUID(claims.OrgID), integrationID, serviceID, provider)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, svc)
}

func (handler *handler) UpdateService(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	providerString := mux.Vars(r)["cloud_provider"]
	provider, err := cloudintegrationtypes.NewCloudProvider(providerString)
	if err != nil {
		render.Error(rw, err)
		return
	}

	serviceIDString := mux.Vars(r)["service_id"]
	serviceID, err := cloudintegrationtypes.NewServiceID(provider, serviceIDString)
	if err != nil {
		render.Error(rw, err)
		return
	}

	req := new(cloudintegrationtypes.UpdatableService)
	if err := binding.JSON.BindBody(r.Body, req); err != nil {
		render.Error(rw, err)
		return
	}

	cloudIntegrationID, err := valuer.NewUUID(mux.Vars(r)["id"])
	if err != nil {
		render.Error(rw, err)
		return
	}

	orgID := valuer.MustNewUUID(claims.OrgID)

	svc, err := handler.module.GetService(ctx, orgID, &cloudIntegrationID, serviceID, provider)
	if err != nil {
		render.Error(rw, err)
		return
	}

	if svc.CloudIntegrationService == nil {
		cloudIntegrationService := cloudintegrationtypes.NewCloudIntegrationService(serviceID, cloudIntegrationID, req.Config)
		err = handler.module.CreateService(ctx, orgID, cloudIntegrationService, provider)
	} else {
		svc.CloudIntegrationService.Update(req.Config)
		err = handler.module.UpdateService(ctx, orgID, svc.CloudIntegrationService, provider)
	}
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusNoContent, nil)
}

func (handler *handler) AgentCheckIn(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	providerString := mux.Vars(r)["cloud_provider"]
	provider, err := cloudintegrationtypes.NewCloudProvider(providerString)
	if err != nil {
		render.Error(rw, err)
		return
	}

	req := new(cloudintegrationtypes.PostableAgentCheckInRequest)
	if err := binding.JSON.BindBody(r.Body, req); err != nil {
		render.Error(rw, err)
		return
	}

	if err := req.Validate(); err != nil {
		render.Error(rw, err)
		return
	}

	// Map old fields → new fields for backward compatibility with old agents
	// Old agents send account_id (=> cloudIntegrationId) and cloud_account_id (=> providerAccountId)
	if req.ID != "" {
		id, err := valuer.NewUUID(req.ID)
		if err != nil {
			render.Error(rw, err)
			return
		}
		req.CloudIntegrationID = id
		req.ProviderAccountID = req.AccountID
	}

	orgID := valuer.MustNewUUID(claims.OrgID)
	resp, err := handler.module.AgentCheckIn(ctx, orgID, provider, &req.AgentCheckInRequest)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, cloudintegrationtypes.NewGettableAgentCheckInResponse(provider, resp))
}

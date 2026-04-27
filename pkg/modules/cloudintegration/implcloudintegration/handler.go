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

	provider, err := cloudintegrationtypes.NewCloudProvider(mux.Vars(r)["cloud_provider"])
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

	provider, err := cloudintegrationtypes.NewCloudProvider(mux.Vars(r)["cloud_provider"])
	if err != nil {
		render.Error(rw, err)
		return
	}

	postableAccount := new(cloudintegrationtypes.PostableAccount)
	err = binding.JSON.BindBody(r.Body, postableAccount)
	if err != nil {
		render.Error(rw, err)
		return
	}

	accountConfig, err := cloudintegrationtypes.NewAccountConfigFromPostable(provider, postableAccount.Config)
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

	connectionArtifact, err := handler.module.GetConnectionArtifact(ctx, account, postableAccount)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusCreated, cloudintegrationtypes.NewGettableAccountWithConnectionArtifact(account, connectionArtifact))
}

func (handler *handler) GetAccount(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	provider, err := cloudintegrationtypes.NewCloudProvider(mux.Vars(r)["cloud_provider"])
	if err != nil {
		render.Error(rw, err)
		return
	}

	accountID, err := valuer.NewUUID(mux.Vars(r)["id"])
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

	provider, err := cloudintegrationtypes.NewCloudProvider(mux.Vars(r)["cloud_provider"])
	if err != nil {
		render.Error(rw, err)
		return
	}

	accounts, err := handler.module.ListAccounts(ctx, valuer.MustNewUUID(claims.OrgID), provider)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, cloudintegrationtypes.NewGettableAccounts(accounts))
}

func (handler *handler) UpdateAccount(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	provider, err := cloudintegrationtypes.NewCloudProvider(mux.Vars(r)["cloud_provider"])
	if err != nil {
		render.Error(rw, err)
		return
	}

	cloudIntegrationID, err := valuer.NewUUID(mux.Vars(r)["id"])
	if err != nil {
		render.Error(rw, err)
		return
	}

	req := new(cloudintegrationtypes.UpdatableAccount)
	if err := binding.JSON.BindBody(r.Body, req); err != nil {
		render.Error(rw, err)
		return
	}

	account, err := handler.module.GetConnectedAccount(ctx, valuer.MustNewUUID(claims.OrgID), cloudIntegrationID, provider)
	if err != nil {
		render.Error(rw, err)
		return
	}

	accountConfig, err := cloudintegrationtypes.NewAccountConfigFromUpdatable(provider, req)
	if err != nil {
		render.Error(rw, err)
		return
	}

	if err := account.Update(provider, accountConfig); err != nil {
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

	provider, err := cloudintegrationtypes.NewCloudProvider(mux.Vars(r)["cloud_provider"])
	if err != nil {
		render.Error(rw, err)
		return
	}

	cloudIntegrationID, err := valuer.NewUUID(mux.Vars(r)["id"])
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

	provider, err := cloudintegrationtypes.NewCloudProvider(mux.Vars(r)["cloud_provider"])
	if err != nil {
		render.Error(rw, err)
		return
	}

	queryParams := new(cloudintegrationtypes.ListServicesMetadataParams)
	if err := binding.Query.BindQuery(r.URL.Query(), queryParams); err != nil {
		render.Error(rw, err)
		return
	}

	orgID := valuer.MustNewUUID(claims.OrgID)
	// check if integration account exists and is not removed.
	if !queryParams.CloudIntegrationID.IsZero() {
		_, err := handler.module.GetConnectedAccount(ctx, orgID, queryParams.CloudIntegrationID, provider)
		if err != nil {
			render.Error(rw, err)
			return
		}
	}

	services, err := handler.module.ListServicesMetadata(ctx, orgID, provider, queryParams.CloudIntegrationID)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, cloudintegrationtypes.NewGettableServicesMetadata(services))
}

func (handler *handler) GetService(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	provider, err := cloudintegrationtypes.NewCloudProvider(mux.Vars(r)["cloud_provider"])
	if err != nil {
		render.Error(rw, err)
		return
	}

	serviceID, err := cloudintegrationtypes.NewServiceID(provider, mux.Vars(r)["service_id"])
	if err != nil {
		render.Error(rw, err)
		return
	}

	queryParams := new(cloudintegrationtypes.GetServiceParams)
	if err := binding.Query.BindQuery(r.URL.Query(), queryParams); err != nil {
		render.Error(rw, err)
		return
	}

	// check if integration account exists and is not removed.
	if !queryParams.CloudIntegrationID.IsZero() {
		_, err := handler.module.GetConnectedAccount(ctx, valuer.MustNewUUID(claims.OrgID), queryParams.CloudIntegrationID, provider)
		if err != nil {
			render.Error(rw, err)
			return
		}
	}

	svc, err := handler.module.GetService(ctx, valuer.MustNewUUID(claims.OrgID), serviceID, provider, queryParams.CloudIntegrationID)
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

	provider, err := cloudintegrationtypes.NewCloudProvider(mux.Vars(r)["cloud_provider"])
	if err != nil {
		render.Error(rw, err)
		return
	}

	serviceID, err := cloudintegrationtypes.NewServiceID(provider, mux.Vars(r)["service_id"])
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

	// check if integration account exists and is not removed.
	_, err = handler.module.GetConnectedAccount(ctx, orgID, cloudIntegrationID, provider)
	if err != nil {
		render.Error(rw, err)
		return
	}

	svc, err := handler.module.GetService(ctx, orgID, serviceID, provider, cloudIntegrationID)
	if err != nil {
		render.Error(rw, err)
		return
	}

	// update or create service
	if svc.CloudIntegrationService == nil {
		var cloudIntegrationService *cloudintegrationtypes.CloudIntegrationService
		cloudIntegrationService, err = cloudintegrationtypes.NewCloudIntegrationService(serviceID, cloudIntegrationID, provider, req.Config)
		if err != nil {
			render.Error(rw, err)
			return
		}

		err = handler.module.CreateService(ctx, orgID, cloudIntegrationService, provider)
	} else {
		err = svc.CloudIntegrationService.Update(provider, serviceID, req.Config)
		if err != nil {
			render.Error(rw, err)
			return
		}

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

	provider, err := cloudintegrationtypes.NewCloudProvider(mux.Vars(r)["cloud_provider"])
	if err != nil {
		render.Error(rw, err)
		return
	}

	req := new(cloudintegrationtypes.PostableAgentCheckIn)
	if err := binding.JSON.BindBody(r.Body, req); err != nil {
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

	resp, err := handler.module.AgentCheckIn(ctx, valuer.MustNewUUID(claims.OrgID), provider, &req.AgentCheckInRequest)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, cloudintegrationtypes.NewGettableAgentCheckIn(provider, resp))
}

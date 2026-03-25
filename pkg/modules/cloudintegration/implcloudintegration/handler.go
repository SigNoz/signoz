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

	render.Success(rw, http.StatusOK, cloudintegrationtypes.GettableAccountWithArtifact{
		ID:       account.ID,
		Artifact: connectionArtifact,
	})
}

func (handler *handler) ListAccounts(writer http.ResponseWriter, request *http.Request) {
	// TODO implement me
	panic("implement me")
}

func (handler *handler) GetAccount(writer http.ResponseWriter, request *http.Request) {
	// TODO implement me
	panic("implement me")
}

func (handler *handler) UpdateAccount(writer http.ResponseWriter, request *http.Request) {
	// TODO implement me
	panic("implement me")
}

func (handler *handler) DisconnectAccount(writer http.ResponseWriter, request *http.Request) {
	// TODO implement me
	panic("implement me")
}

func (handler *handler) ListServicesMetadata(writer http.ResponseWriter, request *http.Request) {
	// TODO implement me
	panic("implement me")
}

func (handler *handler) GetService(writer http.ResponseWriter, request *http.Request) {
	// TODO implement me
	panic("implement me")
}

func (handler *handler) UpdateService(writer http.ResponseWriter, request *http.Request) {
	// TODO implement me
	panic("implement me")
}

func (handler *handler) AgentCheckIn(writer http.ResponseWriter, request *http.Request) {
	// TODO implement me
	panic("implement me")
}

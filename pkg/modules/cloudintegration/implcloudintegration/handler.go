package implcloudintegration

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/modules/cloudintegration"
)

type handler struct{}

func NewHandler() cloudintegration.Handler {
	return &handler{}
}

func (handler *handler) CreateAccount(writer http.ResponseWriter, request *http.Request) {
	// TODO implement me
	panic("implement me")
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

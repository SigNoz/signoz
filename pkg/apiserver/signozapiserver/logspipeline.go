package signozapiserver

import (
	"net/http"

	"github.com/gorilla/mux"
)

func (provider *provider) addLogspipelineRoutes(router *mux.Router) error {
	router.HandleFunc("/api/v2/pipelines", provider.logspipelineHandler.ListPipelines).Methods(http.MethodGet)
	return nil
}

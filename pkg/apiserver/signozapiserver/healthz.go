package signozapiserver

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/gorilla/mux"
)

func (provider *provider) addHealthzRoutes(router *mux.Router) error {
	if err := router.Handle("/healthz", handler.New(
		provider.authZ.OpenAccess(provider.factoryHandler.Healthz),
		handler.OpenAPIDef{
			ID:                  "Healthz",
			Tags:                []string{"health"},
			Summary:             "Health check",
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
		},
	)).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	return nil
}

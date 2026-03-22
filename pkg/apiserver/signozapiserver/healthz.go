package signozapiserver

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/gorilla/mux"
)

func (provider *provider) addHealthzRoutes(router *mux.Router) error {
	if err := router.Handle("/api/v2/healthz", handler.New(
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

	if err := router.Handle("/api/v2/readyz", handler.New(
		provider.authZ.OpenAccess(provider.factoryHandler.Readyz),
		handler.OpenAPIDef{
			ID:                  "Readyz",
			Tags:                []string{"health"},
			Summary:             "Readiness check",
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
		},
	)).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/livez", handler.New(
		provider.authZ.OpenAccess(provider.factoryHandler.Livez),
		handler.OpenAPIDef{
			ID:                  "Livez",
			Tags:                []string{"health"},
			Summary:             "Liveness check",
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
		},
	)).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	return nil
}

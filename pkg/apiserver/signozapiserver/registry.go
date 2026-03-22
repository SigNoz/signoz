package signozapiserver

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/factory"
	pkghandler "github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/gorilla/mux"
	openapi "github.com/swaggest/openapi-go"
)

type healthOpenAPIHandler struct {
	handlerFunc http.HandlerFunc
	id          string
	summary     string
}

func newHealthOpenAPIHandler(handlerFunc http.HandlerFunc, id, summary string) pkghandler.Handler {
	return &healthOpenAPIHandler{
		handlerFunc: handlerFunc,
		id:          id,
		summary:     summary,
	}
}

func (handler *healthOpenAPIHandler) ServeHTTP(rw http.ResponseWriter, req *http.Request) {
	handler.handlerFunc.ServeHTTP(rw, req)
}

func (handler *healthOpenAPIHandler) ServeOpenAPI(opCtx openapi.OperationContext) {
	opCtx.SetID(handler.id)
	opCtx.SetTags("health")
	opCtx.SetSummary(handler.summary)

	response := render.SuccessResponse{
		Status: render.StatusSuccess.String(),
		Data:   new(factory.Response),
	}

	opCtx.AddRespStructure(
		response,
		openapi.WithContentType("application/json"),
		openapi.WithHTTPStatus(http.StatusOK),
	)
	opCtx.AddRespStructure(
		response,
		openapi.WithContentType("application/json"),
		openapi.WithHTTPStatus(http.StatusServiceUnavailable),
	)
}

func (provider *provider) addRegistryRoutes(router *mux.Router) error {
	if err := router.Handle("/api/v2/healthz", newHealthOpenAPIHandler(
		provider.authZ.OpenAccess(provider.factoryHandler.Healthz),
		"Healthz",
		"Health check",
	)).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/readyz", newHealthOpenAPIHandler(
		provider.authZ.OpenAccess(provider.factoryHandler.Readyz),
		"Readyz",
		"Readiness check",
	)).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/livez", pkghandler.New(provider.authZ.OpenAccess(provider.factoryHandler.Livez),
		pkghandler.OpenAPIDef{
			ID:                  "Livez",
			Tags:                []string{"health"},
			Summary:             "Liveness check",
			Response:            new(factory.Response),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
		},
	)).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	return nil
}

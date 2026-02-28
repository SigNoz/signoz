package signozapiserver

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/gorilla/mux"
)

func (provider *provider) addInfrastructureMonitoringRoutes(router *mux.Router) error {
	if err := router.Handle("/api/v2/infra-monitoring/health", handler.New(
		provider.authZ.ViewAccess(provider.infrastructureMonitoringHandler.HealthCheck),
		handler.OpenAPIDef{
			ID:                  "InfrastructureMonitoringHealth",
			Tags:                []string{"infrastructuremonitoring"},
			Summary:             "Test Health Check endpoint",
			Description:         "This endpoint returns a health ok message from the Infrastructure Monitoring module",
			Request:             nil,
			RequestContentType:  "",
			Response:            nil, // String response
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized, http.StatusInternalServerError},
			Deprecated:          false,
			SecuritySchemes:     newSecuritySchemes(types.RoleViewer),
		})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	return nil
}

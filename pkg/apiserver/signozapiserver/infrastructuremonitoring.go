package signozapiserver

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/infrastructuremonitoringtypes"
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

	if err := router.Handle("/api/v2/infra-monitoring/pods/list", handler.New(
		provider.authZ.ViewAccess(provider.infrastructureMonitoringHandler.GetPodsList),
		handler.OpenAPIDef{
			ID:                  "InfrastructureMonitoringGetPodsList",
			Tags:                []string{"infrastructuremonitoring"},
			Summary:             "Get Pods List",
			Description:         "This endpoint returns a list of pods for infrastructure monitoring",
			Request:             &infrastructuremonitoringtypes.PodsListRequest{},
			RequestContentType:  "application/json",
			Response:            &infrastructuremonitoringtypes.PodsListResponse{},
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized, http.StatusInternalServerError},
			Deprecated:          false,
			SecuritySchemes:     newSecuritySchemes(types.RoleViewer),
		})).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	return nil
}

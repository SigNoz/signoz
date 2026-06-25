package signozapiserver

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/gorilla/mux"
)

func (provider *provider) addStatsReporterRoutes(router *mux.Router) error {
	if err := router.Handle("/api/v1/stats", handler.New(
		provider.authzMiddleware.ViewAccess(provider.statsHandler.Get),
		handler.OpenAPIDef{
			ID:                  "GetStats",
			Tags:                []string{"stats"},
			Summary:             "Get stats",
			Description:         "This endpoint returns the collected stats for the organization",
			Request:             nil,
			RequestContentType:  "",
			Response:            map[string]any{},
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{},
			Deprecated:          false,
			SecuritySchemes:     newSecuritySchemes(types.RoleViewer),
		},
	)).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	return nil
}

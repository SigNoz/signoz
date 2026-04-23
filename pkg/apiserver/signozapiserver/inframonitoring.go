package signozapiserver

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/inframonitoringtypes"
	"github.com/gorilla/mux"
)

func (provider *provider) addInfraMonitoringRoutes(router *mux.Router) error {
	if err := router.Handle("/api/v2/infra_monitoring/hosts", handler.New(
		provider.authZ.ViewAccess(provider.infraMonitoringHandler.ListHosts),
		handler.OpenAPIDef{
			ID:                  "ListHosts",
			Tags:                []string{"inframonitoring"},
			Summary:             "List Hosts for Infra Monitoring",
			Description:         "Returns a paginated list of hosts with key infrastructure metrics: CPU usage (%), memory usage (%), I/O wait (%), disk usage (%), and 15-minute load average. Each host includes its current status (active/inactive based on metrics reported in the last 10 minutes) and metadata attributes (e.g., os.type). Supports filtering via a filter expression, filtering by host status, custom groupBy to aggregate hosts by any attribute, ordering by any of the five metrics, and pagination via offset/limit. The response type is 'list' for the default host.name grouping or 'grouped_list' for custom groupBy keys. Also reports missing required metrics and whether the requested time range falls before the data retention boundary.",
			Request:             new(inframonitoringtypes.PostableHosts),
			RequestContentType:  "application/json",
			Response:            new(inframonitoringtypes.Hosts),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized},
			Deprecated:          false,
			SecuritySchemes:     newSecuritySchemes(types.RoleViewer),
		})).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	return nil
}

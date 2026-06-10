package signozapiserver

import (
	"net/http"

	"github.com/gorilla/mux"

	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/emptystatetypes"
)

func (provider *provider) addEmptyStateRoutes(router *mux.Router) error {
	if err := router.Handle("/api/v1/empty_state/org_context", handler.New(
		provider.authzMiddleware.ViewAccess(provider.statsReporterHandler.GetOrgContext),
		handler.OpenAPIDef{
			ID:                  "GetOrgContext",
			Tags:                []string{"emptystate"},
			Summary:             "Get org context for empty states",
			Description:         "This endpoint returns raw org-level observability signals used to render contextual empty states",
			Request:             nil,
			RequestContentType:  "",
			Response:            new(emptystatetypes.OrgContext),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{},
			SecuritySchemes:     newSecuritySchemes(types.RoleViewer),
		},
	)).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	return nil
}

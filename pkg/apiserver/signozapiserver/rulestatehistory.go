package signozapiserver

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/rulestatehistorytypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/gorilla/mux"
)

func (provider *provider) addRuleStateHistoryRoutes(router *mux.Router) error {

	if err := router.Handle("/api/v2/rules/{id}/history/stats", handler.New(
		provider.authzMiddleware.ViewAccess(provider.ruleStateHistoryHandler.GetRuleHistoryStats),
		handler.OpenAPIDef{
			ID:                  "GetRuleHistoryStats",
			Tags:                []string{"rules"},
			Summary:             "Get rule history stats",
			Description:         "Returns trigger and resolution statistics for a rule in the selected time range.",
			RequestQuery:        new(rulestatehistorytypes.PostableRuleStateHistoryBaseQuery),
			Response:            new(rulestatehistorytypes.GettableRuleStateHistoryStats),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized, http.StatusInternalServerError},
			SecuritySchemes:     newSecuritySchemes(types.RoleViewer),
		})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/rules/{id}/history/timeline", handler.New(
		provider.authzMiddleware.ViewAccess(provider.ruleStateHistoryHandler.GetRuleHistoryTimeline),
		handler.OpenAPIDef{
			ID:                  "GetRuleHistoryTimeline",
			Tags:                []string{"rules"},
			Summary:             "Get rule history timeline",
			Description:         "Returns paginated timeline entries for rule state transitions.",
			RequestQuery:        new(rulestatehistorytypes.PostableRuleStateHistoryTimelineQuery),
			Response:            new(rulestatehistorytypes.GettableRuleStateTimeline),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized, http.StatusInternalServerError},
			SecuritySchemes:     newSecuritySchemes(types.RoleViewer),
		})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/rules/{id}/history/top_contributors", handler.New(
		provider.authzMiddleware.ViewAccess(provider.ruleStateHistoryHandler.GetRuleHistoryContributors),
		handler.OpenAPIDef{
			ID:                  "GetRuleHistoryTopContributors",
			Tags:                []string{"rules"},
			Summary:             "Get top contributors to rule firing",
			Description:         "Returns top label combinations contributing to rule firing in the selected time range.",
			RequestQuery:        new(rulestatehistorytypes.PostableRuleStateHistoryBaseQuery),
			Response:            new([]rulestatehistorytypes.GettableRuleStateHistoryContributor),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized, http.StatusInternalServerError},
			SecuritySchemes:     newSecuritySchemes(types.RoleViewer),
		})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/rules/{id}/history/filter_keys", handler.New(
		provider.authzMiddleware.ViewAccess(provider.ruleStateHistoryHandler.GetRuleHistoryFilterKeys),
		handler.OpenAPIDef{
			ID:                  "GetRuleHistoryFilterKeys",
			Tags:                []string{"rules"},
			Summary:             "Get rule history filter keys",
			Description:         "Returns distinct label keys from rule history entries for the selected range.",
			RequestQuery:        new(telemetrytypes.PostableFieldKeysParams),
			Response:            new(telemetrytypes.GettableFieldKeys),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized, http.StatusInternalServerError},
			SecuritySchemes:     newSecuritySchemes(types.RoleViewer),
		})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/rules/{id}/history/filter_values", handler.New(
		provider.authzMiddleware.ViewAccess(provider.ruleStateHistoryHandler.GetRuleHistoryFilterValues),
		handler.OpenAPIDef{
			ID:                  "GetRuleHistoryFilterValues",
			Tags:                []string{"rules"},
			Summary:             "Get rule history filter values",
			Description:         "Returns distinct label values for a given key from rule history entries.",
			RequestQuery:        new(telemetrytypes.PostableFieldValueParams),
			Response:            new(telemetrytypes.GettableFieldValues),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized, http.StatusInternalServerError},
			SecuritySchemes:     newSecuritySchemes(types.RoleViewer),
		})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/rules/{id}/history/overall_status", handler.New(
		provider.authzMiddleware.ViewAccess(provider.ruleStateHistoryHandler.GetRuleHistoryOverallStatus),
		handler.OpenAPIDef{
			ID:                  "GetRuleHistoryOverallStatus",
			Tags:                []string{"rules"},
			Summary:             "Get rule overall status timeline",
			Description:         "Returns overall firing/inactive intervals for a rule in the selected time range.",
			RequestQuery:        new(rulestatehistorytypes.PostableRuleStateHistoryBaseQuery),
			Response:            new([]rulestatehistorytypes.GettableRuleStateWindow),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusUnauthorized, http.StatusInternalServerError},
			SecuritySchemes:     newSecuritySchemes(types.RoleViewer),
		})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	return nil
}

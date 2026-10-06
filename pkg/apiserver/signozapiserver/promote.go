package signozapiserver

import (
	"net/http"

	"github.com/gorilla/mux"

	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/types/promotetypes"
)

func (provider *provider) addPromoteRoutes(router *mux.Router) error {
	if err := router.Handle("/api/v1/promoted_paths", handler.New(provider.authzMiddleware.CheckResources(provider.promoteHandler.PromotePaths, authtypes.SigNozAdminRoleName, authtypes.SigNozEditorRoleName), handler.OpenAPIDef{
		ID:                 "PromotePaths",
		Tags:               []string{"promote"},
		Summary:            "Promote paths",
		Description:        "This endpoint promotes paths of JSON columns to their promoted columns. Each path names its promotion target with its signal and context, e.g. traces/attribute. Requires the update scope of each signal in the request.",
		Request:            new([]*promotetypes.PromotePath),
		RequestContentType: "application/json",
		RequestExamples: []handler.OpenAPIExample{
			{
				Name:    "logs_body",
				Summary: "Logs body: promote a path and index it",
				Value: []map[string]any{
					{
						"signal":  "logs",
						"context": "body",
						"path":    "user.name",
						"promote": true,
						"indexes": []map[string]any{
							{"fieldDataType": "string", "type": "ngrambf_v1(4, 1024, 2, 0)", "granularity": 1},
						},
					},
				},
			},
			{
				Name:    "traces_attribute",
				Summary: "Traces attribute: promote a path",
				Value: []map[string]any{
					{
						"signal":  "traces",
						"context": "attribute",
						"path":    "http.method",
						"promote": true,
					},
				},
			},
		},
		Response:            nil,
		ResponseContentType: "",
		SuccessStatusCode:   http.StatusCreated,
		ErrorStatusCodes:    []int{http.StatusBadRequest},
		SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceLogsField.Scope(coretypes.VerbUpdate), coretypes.ResourceMetaResourceTracesField.Scope(coretypes.VerbUpdate)}),
	}, handler.WithResourceDefs(handler.TelemetryResourceDef{
		Verb:      coretypes.VerbUpdate,
		Category:  coretypes.ActionCategoryConfigurationChange,
		Selector:  coretypes.WildcardSelector,
		Resources: promotetypes.PromotePathsResources,
	}))).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/promoted_paths", handler.New(provider.authzMiddleware.CheckResources(provider.promoteHandler.ListPromotedPaths, authtypes.SigNozAdminRoleName, authtypes.SigNozEditorRoleName, authtypes.SigNozViewerRoleName), handler.OpenAPIDef{
		ID:                  "ListPromotedPaths",
		Tags:                []string{"promote"},
		Summary:             "List promoted paths",
		Description:         "This endpoint lists the promoted paths of every JSON column, each annotated with its signal and context. The signal, context, promoted and indexes query parameters filter the listing. Requires the list scope of each signal the filters select, or of every signal when none match.",
		Request:             nil,
		RequestQuery:        new(promotetypes.ListPromotedPathsFilters),
		RequestContentType:  "",
		Response:            new([]*promotetypes.PromotePath),
		ResponseContentType: "",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{http.StatusBadRequest},
		SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceLogsField.Scope(coretypes.VerbList), coretypes.ResourceMetaResourceTracesField.Scope(coretypes.VerbList)}),
	}, handler.WithResourceDefs(handler.TelemetryResourceDef{
		Verb:      coretypes.VerbList,
		Category:  coretypes.ActionCategoryDataAccess,
		Selector:  coretypes.WildcardSelector,
		Resources: promotetypes.ListPromotedPathsResources,
	}))).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	return nil
}

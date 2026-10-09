package signozapiserver

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/promotetypes"
	"github.com/gorilla/mux"
)

func (provider *provider) addPromoteRoutes(router *mux.Router) error {
	if err := router.Handle("/api/v1/promoted_paths", handler.New(provider.authzMiddleware.EditAccess(provider.promoteHandler.PromotePaths), handler.OpenAPIDef{
		ID:                 "PromotePaths",
		Tags:               []string{"promote"},
		Summary:            "Promote paths",
		Description:        "This endpoint promotes paths of JSON columns to their promoted columns. Each path names its promotion domain with its signal and context, e.g. traces/attribute.",
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
						"path":    "body.user.name",
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
		SecuritySchemes:     newSecuritySchemes(types.RoleEditor),
	})).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/promoted_paths", handler.New(provider.authzMiddleware.ViewAccess(provider.promoteHandler.ListPromotedPaths), handler.OpenAPIDef{
		ID:                  "ListPromotedPaths",
		Tags:                []string{"promote"},
		Summary:             "List promoted paths",
		Description:         "This endpoint lists the promoted paths of every JSON column, each annotated with its signal and context. The signal, context, promoted and indexes query parameters filter the listing.",
		Request:             nil,
		RequestQuery:        new(promotetypes.ListPromotedPathsFilters),
		RequestContentType:  "",
		Response:            new([]*promotetypes.PromotePath),
		ResponseContentType: "",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{http.StatusBadRequest},
		SecuritySchemes:     newSecuritySchemes(types.RoleViewer),
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	return nil
}

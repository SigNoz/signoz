package signozapiserver

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/types/gatewaytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/gorilla/mux"
)

func (provider *provider) addGatewayRoutes(router *mux.Router) error {
	if err := router.Handle("/api/v2/gateway/ingestion_keys", handler.New(
		provider.authzMiddleware.CheckResources(provider.gatewayHandler.GetIngestionKeys, authtypes.SigNozAdminRoleName, authtypes.SigNozEditorRoleName),
		handler.OpenAPIDef{
			ID:                  "GetIngestionKeys",
			Tags:                []string{"gateway"},
			Summary:             "Get ingestion keys for workspace",
			Description:         "This endpoint returns the ingestion keys for a workspace",
			Request:             nil,
			RequestQuery:        new(gatewaytypes.IngestionKeysParams),
			RequestContentType:  "",
			Response:            new(gatewaytypes.GettableIngestionKeys),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{},
			Deprecated:          false,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceIngestionKey.Scope(coretypes.VerbList)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceMetaResourceIngestionKey,
			Verb:     coretypes.VerbList,
			Category: coretypes.ActionCategoryConfigurationChange,
			Selector: coretypes.WildcardSelector,
		}),
	)).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/gateway/ingestion_keys/search", handler.New(
		provider.authzMiddleware.CheckResources(provider.gatewayHandler.SearchIngestionKeys, authtypes.SigNozAdminRoleName, authtypes.SigNozEditorRoleName),
		handler.OpenAPIDef{
			ID:                  "SearchIngestionKeys",
			Tags:                []string{"gateway"},
			Summary:             "Search ingestion keys for workspace",
			Description:         "This endpoint returns the ingestion keys for a workspace",
			Request:             nil,
			RequestQuery:        new(gatewaytypes.SearchIngestionKeysParams),
			RequestContentType:  "",
			Response:            new(gatewaytypes.GettableIngestionKeys),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{},
			Deprecated:          false,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceIngestionKey.Scope(coretypes.VerbList)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceMetaResourceIngestionKey,
			Verb:     coretypes.VerbList,
			Category: coretypes.ActionCategoryConfigurationChange,
			Selector: coretypes.WildcardSelector,
		}),
	)).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/gateway/ingestion_keys", handler.New(
		provider.authzMiddleware.CheckResources(provider.gatewayHandler.CreateIngestionKey, authtypes.SigNozAdminRoleName, authtypes.SigNozEditorRoleName),
		handler.OpenAPIDef{
			ID:                  "CreateIngestionKey",
			Tags:                []string{"gateway"},
			Summary:             "Create ingestion key for workspace",
			Description:         "This endpoint creates an ingestion key for the workspace",
			Request:             new(gatewaytypes.PostableIngestionKey),
			RequestContentType:  "application/json",
			Response:            new(gatewaytypes.GettableCreatedIngestionKey),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusCreated,
			ErrorStatusCodes:    []int{},
			Deprecated:          false,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceIngestionKey.Scope(coretypes.VerbCreate)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceMetaResourceIngestionKey,
			Verb:     coretypes.VerbCreate,
			Category: coretypes.ActionCategoryConfigurationChange,
			ID:       coretypes.ResponseJSONPath("data.id"),
			Selector: coretypes.WildcardSelector,
		}),
	)).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/gateway/ingestion_keys/{keyId}", handler.New(
		provider.authzMiddleware.CheckResources(provider.gatewayHandler.UpdateIngestionKey, authtypes.SigNozAdminRoleName, authtypes.SigNozEditorRoleName),
		handler.OpenAPIDef{
			ID:                  "UpdateIngestionKey",
			Tags:                []string{"gateway"},
			Summary:             "Update ingestion key for workspace",
			Description:         "This endpoint updates an ingestion key for the workspace",
			Request:             new(gatewaytypes.PostableIngestionKey),
			RequestContentType:  "application/json",
			Response:            nil,
			ResponseContentType: "",
			SuccessStatusCode:   http.StatusNoContent,
			ErrorStatusCodes:    []int{},
			Deprecated:          false,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceIngestionKey.Scope(coretypes.VerbUpdate)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceMetaResourceIngestionKey,
			Verb:     coretypes.VerbUpdate,
			Category: coretypes.ActionCategoryConfigurationChange,
			ID:       coretypes.PathParam("keyId"),
			Selector: coretypes.IDSelector,
		}),
	)).Methods(http.MethodPatch).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/gateway/ingestion_keys/{keyId}", handler.New(
		provider.authzMiddleware.CheckResources(provider.gatewayHandler.DeleteIngestionKey, authtypes.SigNozAdminRoleName, authtypes.SigNozEditorRoleName),
		handler.OpenAPIDef{
			ID:                  "DeleteIngestionKey",
			Tags:                []string{"gateway"},
			Summary:             "Delete ingestion key for workspace",
			Description:         "This endpoint deletes an ingestion key for the workspace",
			Request:             nil,
			RequestContentType:  "",
			Response:            nil,
			ResponseContentType: "",
			SuccessStatusCode:   http.StatusNoContent,
			ErrorStatusCodes:    []int{},
			Deprecated:          false,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceIngestionKey.Scope(coretypes.VerbDelete)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceMetaResourceIngestionKey,
			Verb:     coretypes.VerbDelete,
			Category: coretypes.ActionCategoryConfigurationChange,
			ID:       coretypes.PathParam("keyId"),
			Selector: coretypes.IDSelector,
		}),
	)).Methods(http.MethodDelete).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/gateway/ingestion_keys/{keyId}", handler.New(
		provider.authzMiddleware.CheckResources(provider.gatewayHandler.GetIngestionKey, authtypes.SigNozAdminRoleName, authtypes.SigNozEditorRoleName),
		handler.OpenAPIDef{
			ID:                  "GetIngestionKey",
			Tags:                []string{"gateway"},
			Summary:             "Get ingestion key for workspace",
			Description:         "This endpoint returns an ingestion key for the workspace",
			Request:             nil,
			RequestContentType:  "",
			Response:            new(gatewaytypes.IngestionKey),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusNotFound},
			Deprecated:          false,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceIngestionKey.Scope(coretypes.VerbRead)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceMetaResourceIngestionKey,
			Verb:     coretypes.VerbRead,
			Category: coretypes.ActionCategoryConfigurationChange,
			ID:       coretypes.PathParam("keyId"),
			Selector: coretypes.IDSelector,
		}),
	)).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/gateway/ingestion_keys/{keyId}/limits", handler.New(
		provider.authzMiddleware.CheckResources(provider.gatewayHandler.DeprecatedCreateIngestionKeyLimit, authtypes.SigNozAdminRoleName, authtypes.SigNozEditorRoleName),
		handler.OpenAPIDef{
			ID:                  "CreateIngestionKeyLimit",
			Tags:                []string{"gateway"},
			Summary:             "Create limit for the ingestion key",
			Description:         "This endpoint creates an ingestion key limit.",
			Request:             new(gatewaytypes.DeprecatedPostableIngestionKeyLimit),
			RequestContentType:  "application/json",
			Response:            new(gatewaytypes.GettableCreatedIngestionKeyLimit),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusCreated,
			ErrorStatusCodes:    []int{},
			Deprecated:          true,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceIngestionLimit.Scope(coretypes.VerbCreate), coretypes.ResourceMetaResourceIngestionKey.Scope(coretypes.VerbAttach)}),
		},
		handler.WithResourceDefs(
			handler.BasicResourceDef{
				Resource: coretypes.ResourceMetaResourceIngestionLimit,
				Verb:     coretypes.VerbCreate,
				Category: coretypes.ActionCategoryConfigurationChange,
				ID:       coretypes.ResponseJSONPath("data.id"),
				Selector: coretypes.WildcardSelector,
			},
			handler.AttachDetachParentChildResourceDef{
				Verb:           coretypes.VerbAttach,
				Category:       coretypes.ActionCategoryConfigurationChange,
				ParentResource: coretypes.ResourceMetaResourceIngestionKey,
				ParentID:       coretypes.PathParam("keyId"),
				ParentSelector: coretypes.IDSelector,
				ChildResource:  coretypes.ResourceMetaResourceIngestionLimit,
				ChildIDs:       coretypes.OneID(coretypes.ResponseJSONPath("data.id")),
			},
		),
	)).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/gateway/ingestion_keys/limits/{limitId}", handler.New(
		provider.authzMiddleware.CheckResources(provider.gatewayHandler.UpdateIngestionKeyLimit, authtypes.SigNozAdminRoleName, authtypes.SigNozEditorRoleName),
		handler.OpenAPIDef{
			ID:                  "UpdateIngestionKeyLimit",
			Tags:                []string{"gateway"},
			Summary:             "Update limit for the ingestion key",
			Description:         "This endpoint updates an ingestion key limit.",
			Request:             new(gatewaytypes.UpdatableIngestionKeyLimit),
			RequestContentType:  "application/json",
			Response:            nil,
			ResponseContentType: "",
			SuccessStatusCode:   http.StatusNoContent,
			ErrorStatusCodes:    []int{},
			Deprecated:          true,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceIngestionLimit.Scope(coretypes.VerbUpdate)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceMetaResourceIngestionLimit,
			Verb:     coretypes.VerbUpdate,
			Category: coretypes.ActionCategoryConfigurationChange,
			ID:       coretypes.PathParam("limitId"),
			Selector: coretypes.IDSelector,
		}),
	)).Methods(http.MethodPatch).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/gateway/ingestion_keys/limits/{limitId}", handler.New(
		provider.authzMiddleware.CheckResources(provider.gatewayHandler.DeleteIngestionKeyLimit, authtypes.SigNozAdminRoleName, authtypes.SigNozEditorRoleName),
		handler.OpenAPIDef{
			ID:                  "DeleteIngestionKeyLimit",
			Tags:                []string{"gateway"},
			Summary:             "Delete limit for the ingestion key",
			Description:         "This endpoint deletes an ingestion key limit",
			Request:             nil,
			RequestContentType:  "application/json",
			Response:            nil,
			ResponseContentType: "",
			SuccessStatusCode:   http.StatusNoContent,
			ErrorStatusCodes:    []int{},
			Deprecated:          true,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceIngestionLimit.Scope(coretypes.VerbDelete), coretypes.ResourceMetaResourceIngestionKey.Scope(coretypes.VerbDetach)}),
		},
		handler.WithResourceDefs(
			handler.BasicResourceDef{
				Resource: coretypes.ResourceMetaResourceIngestionLimit,
				Verb:     coretypes.VerbDelete,
				Category: coretypes.ActionCategoryConfigurationChange,
				ID:       coretypes.PathParam("limitId"),
				Selector: coretypes.IDSelector,
			},
			handler.AttachDetachParentChildResourceDef{
				Verb:           coretypes.VerbDetach,
				Category:       coretypes.ActionCategoryConfigurationChange,
				ParentResource: coretypes.ResourceMetaResourceIngestionKey,
				ParentID:       provider.ingestionLimitParentKeyIDExtractor(),
				ParentSelector: coretypes.IDSelector,
				ChildResource:  coretypes.ResourceMetaResourceIngestionLimit,
				ChildIDs:       coretypes.OneID(coretypes.PathParam("limitId")),
			},
		),
	)).Methods(http.MethodDelete).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/gateway/ingestion_limits", handler.New(
		provider.authzMiddleware.CheckResources(provider.gatewayHandler.CreateIngestionKeyLimit, authtypes.SigNozAdminRoleName, authtypes.SigNozEditorRoleName),
		handler.OpenAPIDef{
			ID:                  "CreateIngestionLimit",
			Tags:                []string{"gateway"},
			Summary:             "Create ingestion limit",
			Description:         "This endpoint creates an ingestion limit for the ingestion key referenced by key_id",
			Request:             new(gatewaytypes.PostableIngestionKeyLimit),
			RequestContentType:  "application/json",
			Response:            new(types.Identifiable),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusCreated,
			ErrorStatusCodes:    []int{http.StatusBadRequest},
			Deprecated:          false,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceIngestionLimit.Scope(coretypes.VerbCreate), coretypes.ResourceMetaResourceIngestionKey.Scope(coretypes.VerbAttach)}),
		},
		handler.WithResourceDefs(
			handler.BasicResourceDef{
				Resource: coretypes.ResourceMetaResourceIngestionLimit,
				Verb:     coretypes.VerbCreate,
				Category: coretypes.ActionCategoryConfigurationChange,
				ID:       coretypes.ResponseJSONPath("data.id"),
				Selector: coretypes.WildcardSelector,
			},
			handler.AttachDetachParentChildResourceDef{
				Verb:           coretypes.VerbAttach,
				Category:       coretypes.ActionCategoryConfigurationChange,
				ParentResource: coretypes.ResourceMetaResourceIngestionKey,
				ParentID:       coretypes.BodyJSONPath("key_id"),
				ParentSelector: coretypes.IDSelector,
				ChildResource:  coretypes.ResourceMetaResourceIngestionLimit,
				ChildIDs:       coretypes.OneID(coretypes.ResponseJSONPath("data.id")),
			},
		),
	)).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/gateway/ingestion_limits/{limitId}", handler.New(
		provider.authzMiddleware.CheckResources(provider.gatewayHandler.GetIngestionKeyLimit, authtypes.SigNozAdminRoleName, authtypes.SigNozEditorRoleName),
		handler.OpenAPIDef{
			ID:                  "GetIngestionLimit",
			Tags:                []string{"gateway"},
			Summary:             "Get ingestion limit",
			Description:         "This endpoint returns an ingestion limit",
			Request:             nil,
			RequestContentType:  "",
			Response:            new(gatewaytypes.Limit),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusNotFound},
			Deprecated:          false,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceIngestionLimit.Scope(coretypes.VerbRead)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceMetaResourceIngestionLimit,
			Verb:     coretypes.VerbRead,
			Category: coretypes.ActionCategoryConfigurationChange,
			ID:       coretypes.PathParam("limitId"),
			Selector: coretypes.IDSelector,
		}),
	)).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/gateway/ingestion_limits/{limitId}", handler.New(
		provider.authzMiddleware.CheckResources(provider.gatewayHandler.UpdateIngestionKeyLimit, authtypes.SigNozAdminRoleName, authtypes.SigNozEditorRoleName),
		handler.OpenAPIDef{
			ID:                  "UpdateIngestionLimit",
			Tags:                []string{"gateway"},
			Summary:             "Update ingestion limit",
			Description:         "This endpoint updates an ingestion limit",
			Request:             new(gatewaytypes.UpdatableIngestionKeyLimit),
			RequestContentType:  "application/json",
			Response:            nil,
			ResponseContentType: "",
			SuccessStatusCode:   http.StatusNoContent,
			ErrorStatusCodes:    []int{},
			Deprecated:          false,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceIngestionLimit.Scope(coretypes.VerbUpdate)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceMetaResourceIngestionLimit,
			Verb:     coretypes.VerbUpdate,
			Category: coretypes.ActionCategoryConfigurationChange,
			ID:       coretypes.PathParam("limitId"),
			Selector: coretypes.IDSelector,
		}),
	)).Methods(http.MethodPatch).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/gateway/ingestion_limits/{limitId}", handler.New(
		provider.authzMiddleware.CheckResources(provider.gatewayHandler.DeleteIngestionKeyLimit, authtypes.SigNozAdminRoleName, authtypes.SigNozEditorRoleName),
		handler.OpenAPIDef{
			ID:                  "DeleteIngestionLimit",
			Tags:                []string{"gateway"},
			Summary:             "Delete ingestion limit",
			Description:         "This endpoint deletes an ingestion limit",
			Request:             nil,
			RequestContentType:  "",
			Response:            nil,
			ResponseContentType: "",
			SuccessStatusCode:   http.StatusNoContent,
			ErrorStatusCodes:    []int{},
			Deprecated:          false,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceIngestionLimit.Scope(coretypes.VerbDelete), coretypes.ResourceMetaResourceIngestionKey.Scope(coretypes.VerbDetach)}),
		},
		handler.WithResourceDefs(
			handler.BasicResourceDef{
				Resource: coretypes.ResourceMetaResourceIngestionLimit,
				Verb:     coretypes.VerbDelete,
				Category: coretypes.ActionCategoryConfigurationChange,
				ID:       coretypes.PathParam("limitId"),
				Selector: coretypes.IDSelector,
			},
			handler.AttachDetachParentChildResourceDef{
				Verb:           coretypes.VerbDetach,
				Category:       coretypes.ActionCategoryConfigurationChange,
				ParentResource: coretypes.ResourceMetaResourceIngestionKey,
				ParentID:       provider.ingestionLimitParentKeyIDExtractor(),
				ParentSelector: coretypes.IDSelector,
				ChildResource:  coretypes.ResourceMetaResourceIngestionLimit,
				ChildIDs:       coretypes.OneID(coretypes.PathParam("limitId")),
			},
		),
	)).Methods(http.MethodDelete).GetError(); err != nil {
		return err
	}

	return nil
}

func (provider *provider) ingestionLimitParentKeyIDExtractor() coretypes.ResourceIDExtractor {
	return coretypes.NewResourceIDExtractor(coretypes.PhaseRequest, func(ec coretypes.ExtractorContext) (string, error) {
		if ec.Request == nil {
			return "", nil
		}

		claims, err := authtypes.ClaimsFromContext(ec.Request.Context())
		if err != nil {
			return "", err
		}

		limit, err := provider.gatewayService.GetIngestionKeyLimit(ec.Request.Context(), valuer.MustNewUUID(claims.OrgID), mux.Vars(ec.Request)["limitId"])
		if err != nil {
			return "", err
		}

		return limit.KeyID, nil
	})
}

package signozapiserver

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/types/spantypes"
	"github.com/gorilla/mux"
)

func (provider *provider) addSpanMapperRoutes(router *mux.Router) error {
	if err := router.Handle("/api/v1/span_mapper_groups", handler.New(
		provider.authzMiddleware.CheckResources(provider.spanMapperHandler.ListGroups, authtypes.SigNozAdminRoleName, authtypes.SigNozEditorRoleName, authtypes.SigNozViewerRoleName),
		handler.OpenAPIDef{
			ID:                  "ListSpanMapperGroups",
			Tags:                []string{"spanmapper"},
			Summary:             "List span attribute mapping groups",
			Description:         "Returns all span attribute mapping groups for the authenticated org.",
			Request:             nil,
			RequestContentType:  "",
			RequestQuery:        new(spantypes.ListSpanMapperGroupsQuery),
			Response:            new(spantypes.GettableSpanMapperGroups),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusBadRequest},
			Deprecated:          false,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceSpanMapperGroup.Scope(coretypes.VerbList)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceMetaResourceSpanMapperGroup,
			Verb:     coretypes.VerbList,
			Category: coretypes.ActionCategoryDataAccess,
			Selector: coretypes.WildcardSelector,
		}),
	)).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/span_mapper_groups", handler.New(
		provider.authzMiddleware.CheckResources(provider.spanMapperHandler.CreateGroup, authtypes.SigNozAdminRoleName),
		handler.OpenAPIDef{
			ID:                  "CreateSpanMapperGroup",
			Tags:                []string{"spanmapper"},
			Summary:             "Create a span attribute mapping group",
			Description:         "Creates a new span attribute mapping group for the org.",
			Request:             new(spantypes.PostableSpanMapperGroup),
			RequestContentType:  "application/json",
			Response:            new(spantypes.GettableSpanMapperGroup),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusCreated,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusConflict},
			Deprecated:          false,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceSpanMapperGroup.Scope(coretypes.VerbCreate)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceMetaResourceSpanMapperGroup,
			Verb:     coretypes.VerbCreate,
			Category: coretypes.ActionCategoryConfigurationChange,
			ID:       coretypes.ResponseJSONPath("data.id"),
			Selector: coretypes.WildcardSelector,
		}),
	)).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/span_mapper_groups/test", handler.New(
		provider.authzMiddleware.CheckResources(provider.spanMapperHandler.TestMappers, authtypes.SigNozAdminRoleName, authtypes.SigNozEditorRoleName, authtypes.SigNozViewerRoleName),
		handler.OpenAPIDef{
			ID:                  "TestSpanMappers",
			Tags:                []string{"spanmapper"},
			Summary:             "Test span mappers against sample spans",
			Description:         "Tests how span mappers would transform sample spans. Groups sent without mappers are read from the store by name.",
			Request:             new(spantypes.PostableSpanMapperTest),
			RequestContentType:  "application/json",
			Response:            new(spantypes.GettableSpanMapperTest),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusNotFound},
			Deprecated:          false,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceSpanMapperGroup.Scope(coretypes.VerbRead)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceMetaResourceSpanMapperGroup,
			Verb:     coretypes.VerbRead,
			Category: coretypes.ActionCategoryDataAccess,
			Selector: coretypes.WildcardSelector,
		}),
	)).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/span_mapper_groups/{groupId}", handler.New(
		provider.authzMiddleware.CheckResources(provider.spanMapperHandler.UpdateGroup, authtypes.SigNozAdminRoleName),
		handler.OpenAPIDef{
			ID:                 "UpdateSpanMapperGroup",
			Tags:               []string{"spanmapper"},
			Summary:            "Update a span attribute mapping group",
			Description:        "Partially updates an existing mapping group's name, condition, or enabled state.",
			Request:            new(spantypes.UpdatableSpanMapperGroup),
			RequestContentType: "application/json",
			SuccessStatusCode:  http.StatusNoContent,
			ErrorStatusCodes:   []int{http.StatusBadRequest, http.StatusNotFound},
			Deprecated:         false,
			SecuritySchemes:    newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceSpanMapperGroup.Scope(coretypes.VerbUpdate)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceMetaResourceSpanMapperGroup,
			Verb:     coretypes.VerbUpdate,
			Category: coretypes.ActionCategoryConfigurationChange,
			ID:       coretypes.PathParam("groupId"),
			Selector: coretypes.IDSelector,
		}),
	)).Methods(http.MethodPatch).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/span_mapper_groups/{groupId}", handler.New(
		provider.authzMiddleware.CheckResources(provider.spanMapperHandler.DeleteGroup, authtypes.SigNozAdminRoleName),
		handler.OpenAPIDef{
			ID:                  "DeleteSpanMapperGroup",
			Tags:                []string{"spanmapper"},
			Summary:             "Delete a span attribute mapping group",
			Description:         "Hard-deletes a mapping group and cascades to all its mappers.",
			Request:             nil,
			RequestContentType:  "",
			Response:            nil,
			ResponseContentType: "",
			SuccessStatusCode:   http.StatusNoContent,
			ErrorStatusCodes:    []int{http.StatusNotFound},
			Deprecated:          false,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceSpanMapperGroup.Scope(coretypes.VerbDelete)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceMetaResourceSpanMapperGroup,
			Verb:     coretypes.VerbDelete,
			Category: coretypes.ActionCategoryConfigurationChange,
			ID:       coretypes.PathParam("groupId"),
			Selector: coretypes.IDSelector,
		}),
	)).Methods(http.MethodDelete).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/span_mapper_groups/{groupId}/span_mappers", handler.New(
		provider.authzMiddleware.CheckResources(provider.spanMapperHandler.ListMappers, authtypes.SigNozAdminRoleName, authtypes.SigNozEditorRoleName, authtypes.SigNozViewerRoleName),
		handler.OpenAPIDef{
			ID:                  "ListSpanMappers",
			Tags:                []string{"spanmapper"},
			Summary:             "List span mappers for a group",
			Description:         "Returns all mappers belonging to a mapping group.",
			Request:             nil,
			RequestContentType:  "",
			Response:            new(spantypes.GettableSpanMappers),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusNotFound},
			Deprecated:          false,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceSpanMapperGroup.Scope(coretypes.VerbRead)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceMetaResourceSpanMapperGroup,
			Verb:     coretypes.VerbRead,
			Category: coretypes.ActionCategoryDataAccess,
			ID:       coretypes.PathParam("groupId"),
			Selector: coretypes.IDSelector,
		}),
	)).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/span_mapper_groups/{groupId}/span_mappers", handler.New(
		provider.authzMiddleware.CheckResources(provider.spanMapperHandler.CreateMapper, authtypes.SigNozAdminRoleName),
		handler.OpenAPIDef{
			ID:                  "CreateSpanMapper",
			Tags:                []string{"spanmapper"},
			Summary:             "Create a span mapper",
			Description:         "Adds a new mapper to the specified mapping group.",
			Request:             new(spantypes.PostableSpanMapper),
			RequestContentType:  "application/json",
			Response:            new(spantypes.GettableSpanMapper),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusCreated,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusNotFound, http.StatusConflict},
			Deprecated:          false,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceSpanMapper.Scope(coretypes.VerbCreate), coretypes.ResourceMetaResourceSpanMapperGroup.Scope(coretypes.VerbAttach)}),
		},
		handler.WithResourceDefs(
			handler.BasicResourceDef{
				Resource: coretypes.ResourceMetaResourceSpanMapper,
				Verb:     coretypes.VerbCreate,
				Category: coretypes.ActionCategoryConfigurationChange,
				ID:       coretypes.ResponseJSONPath("data.id"),
				Selector: coretypes.WildcardSelector,
			},
			handler.AttachDetachParentChildResourceDef{
				Verb:           coretypes.VerbAttach,
				Category:       coretypes.ActionCategoryConfigurationChange,
				ParentResource: coretypes.ResourceMetaResourceSpanMapperGroup,
				ParentID:       coretypes.PathParam("groupId"),
				ParentSelector: coretypes.IDSelector,
				ChildResource:  coretypes.ResourceMetaResourceSpanMapper,
				ChildIDs:       coretypes.OneID(coretypes.ResponseJSONPath("data.id")),
			},
		),
	)).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/span_mapper_groups/{groupId}/span_mappers/{mapperId}", handler.New(
		provider.authzMiddleware.CheckResources(provider.spanMapperHandler.UpdateMapper, authtypes.SigNozAdminRoleName),
		handler.OpenAPIDef{
			ID:                 "UpdateSpanMapper",
			Tags:               []string{"spanmapper"},
			Summary:            "Update a span mapper",
			Description:        "Partially updates an existing mapper's field context, config, or enabled state.",
			Request:            new(spantypes.UpdatableSpanMapper),
			RequestContentType: "application/json",
			SuccessStatusCode:  http.StatusNoContent,
			ErrorStatusCodes:   []int{http.StatusBadRequest, http.StatusNotFound},
			Deprecated:         false,
			SecuritySchemes:    newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceSpanMapper.Scope(coretypes.VerbUpdate)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceMetaResourceSpanMapper,
			Verb:     coretypes.VerbUpdate,
			Category: coretypes.ActionCategoryConfigurationChange,
			ID:       coretypes.PathParam("mapperId"),
			Selector: coretypes.IDSelector,
		}),
	)).Methods(http.MethodPatch).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/span_mapper_groups/{groupId}/span_mappers/{mapperId}", handler.New(
		provider.authzMiddleware.CheckResources(provider.spanMapperHandler.DeleteMapper, authtypes.SigNozAdminRoleName),
		handler.OpenAPIDef{
			ID:                  "DeleteSpanMapper",
			Tags:                []string{"spanmapper"},
			Summary:             "Delete a span mapper",
			Description:         "Hard-deletes a mapper from a mapping group.",
			Request:             nil,
			RequestContentType:  "",
			Response:            nil,
			ResponseContentType: "",
			SuccessStatusCode:   http.StatusNoContent,
			ErrorStatusCodes:    []int{http.StatusNotFound},
			Deprecated:          false,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceSpanMapper.Scope(coretypes.VerbDelete), coretypes.ResourceMetaResourceSpanMapperGroup.Scope(coretypes.VerbDetach)}),
		},
		handler.WithResourceDefs(
			handler.BasicResourceDef{
				Resource: coretypes.ResourceMetaResourceSpanMapper,
				Verb:     coretypes.VerbDelete,
				Category: coretypes.ActionCategoryConfigurationChange,
				ID:       coretypes.PathParam("mapperId"),
				Selector: coretypes.IDSelector,
			},
			handler.AttachDetachParentChildResourceDef{
				Verb:           coretypes.VerbDetach,
				Category:       coretypes.ActionCategoryConfigurationChange,
				ParentResource: coretypes.ResourceMetaResourceSpanMapperGroup,
				ParentID:       coretypes.PathParam("groupId"),
				ParentSelector: coretypes.IDSelector,
				ChildResource:  coretypes.ResourceMetaResourceSpanMapper,
				ChildIDs:       coretypes.OneID(coretypes.PathParam("mapperId")),
			},
		),
	)).Methods(http.MethodDelete).GetError(); err != nil {
		return err
	}

	return nil
}

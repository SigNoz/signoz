package signozapiserver

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/spantypes"
	"github.com/gorilla/mux"
)

func (provider *provider) addSpanMapperRoutes(router *mux.Router) error {
	if err := router.Handle("/api/v1/span_mapper_groups", handler.New(
		provider.authZ.ViewAccess(provider.spanMapperHandler.ListGroups),
		handler.OpenAPIDef{
			ID:                  "ListSpanAttributeMappingGroups",
			Tags:                []string{"span-attribute-mapping"},
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
			SecuritySchemes:     newSecuritySchemes(types.RoleViewer),
		},
	)).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/span_mapper_groups", handler.New(
		provider.authZ.AdminAccess(provider.spanMapperHandler.CreateGroup),
		handler.OpenAPIDef{
			ID:                  "CreateMappingGroup",
			Tags:                []string{"span-attribute-mapping"},
			Summary:             "Create a span attribute mapping group",
			Description:         "Creates a new span attribute mapping group for the org.",
			Request:             new(spantypes.PostableSpanMapperGroup),
			RequestContentType:  "application/json",
			Response:            new(spantypes.GettableSpanMapperGroup),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusCreated,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusConflict},
			Deprecated:          false,
			SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
		},
	)).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/span_mapper_groups/{groupId}", handler.New(
		provider.authZ.AdminAccess(provider.spanMapperHandler.UpdateGroup),
		handler.OpenAPIDef{
			ID:                 "UpdateMappingGroup",
			Tags:               []string{"span-attribute-mapping"},
			Summary:            "Update a span attribute mapping group",
			Description:        "Partially updates an existing mapping group's name, condition, or enabled state.",
			Request:            new(spantypes.UpdatableSpanMapperGroup),
			RequestContentType: "application/json",
			SuccessStatusCode:  http.StatusNoContent,
			ErrorStatusCodes:   []int{http.StatusBadRequest, http.StatusNotFound},
			Deprecated:         false,
			SecuritySchemes:    newSecuritySchemes(types.RoleAdmin),
		},
	)).Methods(http.MethodPatch).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/span_mapper_groups/{groupId}", handler.New(
		provider.authZ.AdminAccess(provider.spanMapperHandler.DeleteGroup),
		handler.OpenAPIDef{
			ID:                  "DeleteMappingGroup",
			Tags:                []string{"span-attribute-mapping"},
			Summary:             "Delete a span attribute mapping group",
			Description:         "Hard-deletes a mapping group and cascades to all its mappers.",
			Request:             nil,
			RequestContentType:  "",
			Response:            nil,
			ResponseContentType: "",
			SuccessStatusCode:   http.StatusNoContent,
			ErrorStatusCodes:    []int{http.StatusNotFound},
			Deprecated:          false,
			SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
		},
	)).Methods(http.MethodDelete).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/span_mapper_groups/{groupId}/span_mappers", handler.New(
		provider.authZ.ViewAccess(provider.spanMapperHandler.ListMappers),
		handler.OpenAPIDef{
			ID:                  "ListMappers",
			Tags:                []string{"span-attribute-mapping"},
			Summary:             "List span attribute mappers for a group",
			Description:         "Returns all attribute mappers belonging to a mapping group.",
			Request:             nil,
			RequestContentType:  "",
			Response:            new(spantypes.GettableSpanMapperGroups),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusNotFound},
			Deprecated:          false,
			SecuritySchemes:     newSecuritySchemes(types.RoleViewer),
		},
	)).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/span_mapper_groups/{groupId}/span_mappers", handler.New(
		provider.authZ.AdminAccess(provider.spanMapperHandler.CreateMapper),
		handler.OpenAPIDef{
			ID:                  "CreateMapper",
			Tags:                []string{"span-attribute-mapping"},
			Summary:             "Create a span attribute mapper",
			Description:         "Adds a new attribute mapper to the specified mapping group.",
			Request:             new(spantypes.PostableSpanMapper),
			RequestContentType:  "application/json",
			Response:            new(spantypes.GettableSpanMapper),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusCreated,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusNotFound, http.StatusConflict},
			Deprecated:          false,
			SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
		},
	)).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/span_mapper_groups/{groupId}/span_mappers/{mapperId}", handler.New(
		provider.authZ.AdminAccess(provider.spanMapperHandler.UpdateMapper),
		handler.OpenAPIDef{
			ID:                 "UpdateMapper",
			Tags:               []string{"span-attribute-mapping"},
			Summary:            "Update a span attribute mapper",
			Description:        "Partially updates an existing mapper's field context, config, or enabled state.",
			Request:            new(spantypes.UpdatableSpanMapper),
			RequestContentType: "application/json",
			SuccessStatusCode:  http.StatusNoContent,
			ErrorStatusCodes:   []int{http.StatusBadRequest, http.StatusNotFound},
			Deprecated:         false,
			SecuritySchemes:    newSecuritySchemes(types.RoleAdmin),
		},
	)).Methods(http.MethodPatch).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/span_mapper_groups/{groupId}/span_mappers/{mapperId}", handler.New(
		provider.authZ.AdminAccess(provider.spanMapperHandler.DeleteMapper),
		handler.OpenAPIDef{
			ID:                  "DeleteMapper",
			Tags:                []string{"span-attribute-mapping"},
			Summary:             "Delete a span attribute mapper",
			Description:         "Hard-deletes a mapper from a mapping group.",
			Request:             nil,
			RequestContentType:  "",
			Response:            nil,
			ResponseContentType: "",
			SuccessStatusCode:   http.StatusNoContent,
			ErrorStatusCodes:    []int{http.StatusNotFound},
			Deprecated:          false,
			SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
		},
	)).Methods(http.MethodDelete).GetError(); err != nil {
		return err
	}

	return nil
}

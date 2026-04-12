package signozapiserver

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/aio11ymappingtypes"
	"github.com/gorilla/mux"
)

func (provider *provider) addAIO11yMappingRoutes(router *mux.Router) error {
	// --- Mapping Groups ---

	if err := router.Handle("/api/v1/ai-o11y/mapping/groups", handler.New(
		provider.authZ.ViewAccess(provider.aio11yMappingHandler.ListGroups),
		handler.OpenAPIDef{
			ID:                  "ListMappingGroups",
			Tags:                []string{"ai-o11y"},
			Summary:             "List mapping groups",
			Description:         "Returns all span attribute mapping groups for the authenticated org.",
			Request:             nil,
			RequestContentType:  "",
			RequestQuery:        new(aio11ymappingtypes.ListMappingGroupsQuery),
			Response:            new(aio11ymappingtypes.ListMappingGroupsResponse),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusBadRequest},
			Deprecated:          false,
			SecuritySchemes:     newSecuritySchemes(types.RoleViewer),
		},
	)).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/ai-o11y/mapping/groups", handler.New(
		provider.authZ.AdminAccess(provider.aio11yMappingHandler.CreateGroup),
		handler.OpenAPIDef{
			ID:                  "CreateMappingGroup",
			Tags:                []string{"ai-o11y"},
			Summary:             "Create a mapping group",
			Description:         "Creates a new span attribute mapping group for the org.",
			Request:             new(aio11ymappingtypes.PostableMappingGroup),
			RequestContentType:  "application/json",
			Response:            new(aio11ymappingtypes.GettableMappingGroup),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusCreated,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusConflict},
			Deprecated:          false,
			SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
		},
	)).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/ai-o11y/mapping/groups/{id}", handler.New(
		provider.authZ.AdminAccess(provider.aio11yMappingHandler.UpdateGroup),
		handler.OpenAPIDef{
			ID:                  "UpdateMappingGroup",
			Tags:                []string{"ai-o11y"},
			Summary:             "Update a mapping group",
			Description:         "Partially updates an existing mapping group's name, condition, or enabled state.",
			Request:             new(aio11ymappingtypes.UpdatableMappingGroup),
			RequestContentType:  "application/json",
			Response:            new(aio11ymappingtypes.GettableMappingGroup),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusNotFound},
			Deprecated:          false,
			SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
		},
	)).Methods(http.MethodPut).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/ai-o11y/mapping/groups/{id}", handler.New(
		provider.authZ.AdminAccess(provider.aio11yMappingHandler.DeleteGroup),
		handler.OpenAPIDef{
			ID:                  "DeleteMappingGroup",
			Tags:                []string{"ai-o11y"},
			Summary:             "Delete a mapping group",
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

	// --- Mappers ---

	if err := router.Handle("/api/v1/ai-o11y/mapping/groups/{id}/mappers", handler.New(
		provider.authZ.ViewAccess(provider.aio11yMappingHandler.ListMappers),
		handler.OpenAPIDef{
			ID:                  "ListMappers",
			Tags:                []string{"ai-o11y"},
			Summary:             "List mappers for a group",
			Description:         "Returns all attribute mappers belonging to a mapping group.",
			Request:             nil,
			RequestContentType:  "",
			RequestQuery:        new(aio11ymappingtypes.ListMappersQuery),
			Response:            new(aio11ymappingtypes.ListMappersResponse),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusNotFound},
			Deprecated:          false,
			SecuritySchemes:     newSecuritySchemes(types.RoleViewer),
		},
	)).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/ai-o11y/mapping/groups/{id}/mappers", handler.New(
		provider.authZ.AdminAccess(provider.aio11yMappingHandler.CreateMapper),
		handler.OpenAPIDef{
			ID:                  "CreateMapper",
			Tags:                []string{"ai-o11y"},
			Summary:             "Create a mapper",
			Description:         "Adds a new attribute mapper to the specified mapping group.",
			Request:             new(aio11ymappingtypes.PostableMapper),
			RequestContentType:  "application/json",
			Response:            new(aio11ymappingtypes.GettableMapper),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusCreated,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusNotFound, http.StatusConflict},
			Deprecated:          false,
			SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
		},
	)).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/ai-o11y/mapping/groups/{groupId}/mappers/{mapperId}", handler.New(
		provider.authZ.AdminAccess(provider.aio11yMappingHandler.UpdateMapper),
		handler.OpenAPIDef{
			ID:                  "UpdateMapper",
			Tags:                []string{"ai-o11y"},
			Summary:             "Update a mapper",
			Description:         "Partially updates an existing mapper's field context, config, or enabled state.",
			Request:             new(aio11ymappingtypes.UpdatableMapper),
			RequestContentType:  "application/json",
			Response:            new(aio11ymappingtypes.GettableMapper),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusNotFound},
			Deprecated:          false,
			SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
		},
	)).Methods(http.MethodPut).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/ai-o11y/mapping/groups/{groupId}/mappers/{mapperId}", handler.New(
		provider.authZ.AdminAccess(provider.aio11yMappingHandler.DeleteMapper),
		handler.OpenAPIDef{
			ID:                  "DeleteMapper",
			Tags:                []string{"ai-o11y"},
			Summary:             "Delete a mapper",
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

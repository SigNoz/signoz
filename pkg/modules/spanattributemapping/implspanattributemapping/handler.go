package implspanattributemapping

import (
	"context"
	"net/http"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/http/binding"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/modules/spanattributemapping"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/spanattributemappingtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/gorilla/mux"
)

type handler struct {
	module           spanattributemapping.Module
	providerSettings factory.ProviderSettings
}

func NewHandler(module spanattributemapping.Module, providerSettings factory.ProviderSettings) spanattributemapping.Handler {
	return &handler{module: module, providerSettings: providerSettings}
}

// ListGroups handles GET /api/v1/ai-o11y/mapping/groups.
func (h *handler) ListGroups(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(rw, err)
		return
	}

	var q spanattributemappingtypes.ListGroupsQuery
	if err := binding.Query.BindQuery(r.URL.Query(), &q); err != nil {
		render.Error(rw, err)
		return
	}

	groups, err := h.module.ListGroups(ctx, orgID, &q)
	if err != nil {
		render.Error(rw, err)
		return
	}

	items := make([]*spanattributemappingtypes.GettableGroup, len(groups))
	for i, g := range groups {
		items[i] = spanattributemappingtypes.NewGettableGroup(g)
	}

	render.Success(rw, http.StatusOK, &spanattributemappingtypes.ListGroupsResponse{Items: items})
}

// CreateGroup handles POST /api/v1/ai-o11y/mapping/groups.
func (h *handler) CreateGroup(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(rw, err)
		return
	}

	req := new(spanattributemappingtypes.PostableGroup)
	if err := binding.JSON.BindBody(r.Body, req); err != nil {
		render.Error(rw, err)
		return
	}

	group, err := h.module.CreateGroup(ctx, orgID, claims.Email, req)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusCreated, spanattributemappingtypes.NewGettableGroup(group))
}

// UpdateGroup handles PUT /api/v1/ai-o11y/mapping/groups/{id}.
func (h *handler) UpdateGroup(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(rw, err)
		return
	}

	id, err := groupIDFromPath(r)
	if err != nil {
		render.Error(rw, err)
		return
	}

	req := new(spanattributemappingtypes.UpdatableGroup)
	if err := binding.JSON.BindBody(r.Body, req); err != nil {
		render.Error(rw, err)
		return
	}

	group, err := h.module.UpdateGroup(ctx, orgID, id, claims.Email, req)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, spanattributemappingtypes.NewGettableGroup(group))
}

// DeleteGroup handles DELETE /api/v1/ai-o11y/mapping/groups/{id}.
func (h *handler) DeleteGroup(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(rw, err)
		return
	}

	id, err := groupIDFromPath(r)
	if err != nil {
		render.Error(rw, err)
		return
	}

	if err := h.module.DeleteGroup(ctx, orgID, id); err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusNoContent, nil)
}

// ListMappers handles GET /api/v1/ai-o11y/mapping/groups/{id}/mappers.
func (h *handler) ListMappers(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(rw, err)
		return
	}

	groupID, err := groupIDFromPath(r)
	if err != nil {
		render.Error(rw, err)
		return
	}

	mappers, err := h.module.ListMappers(ctx, orgID, groupID)
	if err != nil {
		render.Error(rw, err)
		return
	}

	items := make([]*spanattributemappingtypes.GettableMapper, len(mappers))
	for i, m := range mappers {
		items[i] = spanattributemappingtypes.NewGettableMapper(m)
	}

	render.Success(rw, http.StatusOK, &spanattributemappingtypes.ListMappersResponse{Items: items})
}

// CreateMapper handles POST /api/v1/ai-o11y/mapping/groups/{id}/mappers.
func (h *handler) CreateMapper(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(rw, err)
		return
	}

	groupID, err := groupIDFromPath(r)
	if err != nil {
		render.Error(rw, err)
		return
	}

	req := new(spanattributemappingtypes.PostableMapper)
	if err := binding.JSON.BindBody(r.Body, req); err != nil {
		render.Error(rw, err)
		return
	}

	mapper, err := h.module.CreateMapper(ctx, orgID, groupID, claims.Email, req)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusCreated, spanattributemappingtypes.NewGettableMapper(mapper))
}

// UpdateMapper handles PUT /api/v1/ai-o11y/mapping/groups/{groupId}/mappers/{mapperId}.
func (h *handler) UpdateMapper(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(rw, err)
		return
	}

	groupID, err := groupIDFromPath(r)
	if err != nil {
		render.Error(rw, err)
		return
	}

	mapperID, err := mapperIDFromPath(r)
	if err != nil {
		render.Error(rw, err)
		return
	}

	req := new(spanattributemappingtypes.UpdatableMapper)
	if err := binding.JSON.BindBody(r.Body, req); err != nil {
		render.Error(rw, err)
		return
	}

	mapper, err := h.module.UpdateMapper(ctx, orgID, groupID, mapperID, claims.Email, req)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, spanattributemappingtypes.NewGettableMapper(mapper))
}

// DeleteMapper handles DELETE /api/v1/ai-o11y/mapping/groups/{groupId}/mappers/{mapperId}.
func (h *handler) DeleteMapper(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(rw, err)
		return
	}

	groupID, err := groupIDFromPath(r)
	if err != nil {
		render.Error(rw, err)
		return
	}

	mapperID, err := mapperIDFromPath(r)
	if err != nil {
		render.Error(rw, err)
		return
	}

	if err := h.module.DeleteMapper(ctx, orgID, groupID, mapperID); err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusNoContent, nil)
}

// groupIDFromPath extracts and validates the {id} or {groupId} path variable.
func groupIDFromPath(r *http.Request) (valuer.UUID, error) {
	vars := mux.Vars(r)
	raw := vars["groupId"]
	if raw == "" {
		raw = vars["id"]
	}
	if raw == "" {
		return valuer.UUID{}, errors.Newf(errors.TypeInvalidInput, spanattributemappingtypes.ErrCodeSpanAttributeMappingInvalidInput, "group id is missing from the path")
	}
	id, err := valuer.NewUUID(raw)
	if err != nil {
		return valuer.UUID{}, errors.Wrapf(err, errors.TypeInvalidInput, spanattributemappingtypes.ErrCodeSpanAttributeMappingInvalidInput, "group id is not a valid uuid")
	}
	return id, nil
}

// mapperIDFromPath extracts and validates the {mapperId} path variable.
func mapperIDFromPath(r *http.Request) (valuer.UUID, error) {
	raw := mux.Vars(r)["mapperId"]
	if raw == "" {
		return valuer.UUID{}, errors.Newf(errors.TypeInvalidInput, spanattributemappingtypes.ErrCodeSpanAttributeMappingInvalidInput, "mapper id is missing from the path")
	}
	id, err := valuer.NewUUID(raw)
	if err != nil {
		return valuer.UUID{}, errors.Wrapf(err, errors.TypeInvalidInput, spanattributemappingtypes.ErrCodeSpanAttributeMappingInvalidInput, "mapper id is not a valid uuid")
	}
	return id, nil
}

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

// ListGroups handles GET /api/v1/span_attribute_mapping_groups.
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

	render.Success(rw, http.StatusOK, spanattributemappingtypes.NewGettableGroups(groups))
}

// CreateGroup handles POST /api/v1/span_attribute_mapping_groups.
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

	group := spanattributemappingtypes.NewGroupFromPostable(req)

	err = h.module.CreateGroup(ctx, orgID, claims.Email, group)
	if err != nil {
		render.Error(rw, err)
		return
	}
}

// UpdateGroup handles PUT /api/v1/span_attribute_mapping_groups/{id}.
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

	err = h.module.UpdateGroup(ctx, orgID, id, claims.Email, spanattributemappingtypes.NewGroupFromUpdatable(req))
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusNoContent, nil)
}

// DeleteGroup handles DELETE /api/v1/span_attribute_mapping_groups/{id}.
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

// ListMappers handles GET /api/v1/span_attribute_mapping_groups/{id}/mappers.
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

	render.Success(rw, http.StatusOK, spanattributemappingtypes.NewGettableMappers(mappers))
}

// CreateMapper handles POST /api/v1/span_attribute_mapping_groups/{id}/mappers.
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
	mapper := spanattributemappingtypes.NewMapperFromPostable(req)

	err = h.module.CreateMapper(ctx, orgID, groupID, claims.Email, mapper)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusCreated, mapper)
}

// UpdateMapper handles PUT /api/v1/span_attribute_mapping_groups/{groupId}/mappers/{mapperId}.
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

	err = h.module.UpdateMapper(ctx, orgID, groupID, mapperID, claims.Email, spanattributemappingtypes.NewMapperFromUpdatable(req))
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusNoContent, nil)
}

// DeleteMapper handles DELETE /api/v1/span_attribute_mapping_groups/{groupId}/mappers/{mapperId}.
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
	id, err := valuer.NewUUID(raw)
	if err != nil {
		return valuer.UUID{}, errors.Wrapf(err, errors.TypeInvalidInput, spanattributemappingtypes.ErrCodeMappingInvalidInput, "group id is not a valid uuid")
	}
	return id, nil
}

// mapperIDFromPath extracts and validates the {mapperId} path variable.
func mapperIDFromPath(r *http.Request) (valuer.UUID, error) {
	raw := mux.Vars(r)["mapperId"]
	id, err := valuer.NewUUID(raw)
	if err != nil {
		return valuer.UUID{}, errors.Wrapf(err, errors.TypeInvalidInput, spanattributemappingtypes.ErrCodeMappingInvalidInput, "mapper id is not a valid uuid")
	}
	return id, nil
}

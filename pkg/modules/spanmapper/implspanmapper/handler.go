package implspanmapper

import (
	"context"
	"net/http"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/binding"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/modules/spanmapper"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/spantypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/gorilla/mux"
)

type handler struct {
	module spanmapper.Module
}

func NewHandler(module spanmapper.Module) spanmapper.Handler {
	return &handler{module: module}
}

// ListGroups handles GET /api/v1/span_mapper_groups.
func (h *handler) ListGroups(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	orgID := valuer.MustNewUUID(claims.OrgID)

	var q spantypes.ListSpanMapperGroupsQuery
	if err := binding.Query.BindQuery(r.URL.Query(), &q); err != nil {
		render.Error(rw, err)
		return
	}

	groups, err := h.module.ListGroups(ctx, orgID, &q)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, spantypes.NewGettableSpanMapperGroups(groups))
}

// CreateGroup handles POST /api/v1/span_mapper_groups.
func (h *handler) CreateGroup(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	orgID := valuer.MustNewUUID(claims.OrgID)

	req := new(spantypes.PostableSpanMapperGroup)
	if err := binding.JSON.BindBody(r.Body, req); err != nil {
		render.Error(rw, err)
		return
	}

	group := spantypes.NewSpanMapperGroup(orgID, claims.Email, req)

	if err := h.module.CreateGroup(ctx, orgID, group); err != nil {
		render.Error(rw, err)
		return
	}
	render.Success(rw, http.StatusCreated, group)
}

// UpdateGroup handles PUT /api/v1/span_mapper_groups/{id}.
func (h *handler) UpdateGroup(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	orgID := valuer.MustNewUUID(claims.OrgID)

	id, err := groupIDFromPath(r)
	if err != nil {
		render.Error(rw, err)
		return
	}

	req := new(spantypes.UpdatableSpanMapperGroup)
	if err := binding.JSON.BindBody(r.Body, req); err != nil {
		render.Error(rw, err)
		return
	}

	if err := h.module.UpdateGroup(ctx, orgID, id, req.Name, req.Condition, req.Enabled, claims.Email); err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusNoContent, nil)
}

// DeleteGroup handles DELETE /api/v1/span_mapper_groups/{id}.
func (h *handler) DeleteGroup(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	orgID := valuer.MustNewUUID(claims.OrgID)

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

// ListMappers handles GET /api/v1/span_mapper_groups/{id}/span_mappers.
func (h *handler) ListMappers(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	orgID := valuer.MustNewUUID(claims.OrgID)

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

	render.Success(rw, http.StatusOK, spantypes.NewGettableSpanMappers(mappers))
}

// CreateMapper handles POST /api/v1/span_mapper_groups/{id}/span_mappers.
func (h *handler) CreateMapper(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	orgID := valuer.MustNewUUID(claims.OrgID)

	groupID, err := groupIDFromPath(r)
	if err != nil {
		render.Error(rw, err)
		return
	}

	req := new(spantypes.PostableSpanMapper)
	if err := binding.JSON.BindBody(r.Body, req); err != nil {
		render.Error(rw, err)
		return
	}
	mapper := spantypes.NewSpanMapper(groupID, claims.Email, req)

	if err := h.module.CreateMapper(ctx, orgID, groupID, mapper); err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusCreated, mapper)
}

// UpdateMapper handles PUT /api/v1/span_mapper_groups/{groupId}/span_mappers/{mapperId}.
func (h *handler) UpdateMapper(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	orgID := valuer.MustNewUUID(claims.OrgID)

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

	req := new(spantypes.UpdatableSpanMapper)
	if err := binding.JSON.BindBody(r.Body, req); err != nil {
		render.Error(rw, err)
		return
	}

	if err := h.module.UpdateMapper(ctx, orgID, groupID, mapperID, req.FieldContext, req.Config, req.Enabled, claims.Email); err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusNoContent, nil)
}

// DeleteMapper handles DELETE /api/v1/span_mapper_groups/{groupId}/span_mappers/{mapperId}.
func (h *handler) DeleteMapper(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	orgID := valuer.MustNewUUID(claims.OrgID)

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
		return valuer.UUID{}, errors.Wrapf(err, errors.TypeInvalidInput, spantypes.ErrCodeMappingInvalidInput, "group id is not a valid uuid")
	}
	return id, nil
}

// mapperIDFromPath extracts and validates the {mapperId} path variable.
func mapperIDFromPath(r *http.Request) (valuer.UUID, error) {
	raw := mux.Vars(r)["mapperId"]
	id, err := valuer.NewUUID(raw)
	if err != nil {
		return valuer.UUID{}, errors.Wrapf(err, errors.TypeInvalidInput, spantypes.ErrCodeMappingInvalidInput, "mapper id is not a valid uuid")
	}
	return id, nil
}

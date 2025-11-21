package implrole

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/binding"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/modules/role"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/roletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/gorilla/mux"
)

type handler struct {
	module role.Module
}

func NewHandler(module role.Module) role.Handler {
	return &handler{module: module}
}

func (handler *handler) Create(rw http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	req := new(roletypes.PostableRole)
	if err := binding.JSON.BindBody(r.Body, req); err != nil {
		render.Error(rw, err)
		return
	}

	err = handler.module.Create(ctx, roletypes.NewRole(req.Name, req.Description, roletypes.RoleTypeCustom.StringValue(), valuer.MustNewUUID(claims.OrgID)))
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusCreated, nil)
}

func (handler *handler) Get(rw http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	id, ok := mux.Vars(r)["id"]
	if !ok {
		render.Error(rw, errors.New(errors.TypeInvalidInput, roletypes.ErrCodeRoleInvalidInput, "id is missing from the request"))
		return
	}
	roleID, err := valuer.NewUUID(id)
	if err != nil {
		render.Error(rw, err)
		return
	}

	role, err := handler.module.Get(ctx, valuer.MustNewUUID(claims.OrgID), roleID)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, role)
}

func (handler *handler) GetObjects(rw http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	id, ok := mux.Vars(r)["id"]
	if !ok {
		render.Error(rw, errors.New(errors.TypeInvalidInput, roletypes.ErrCodeRoleInvalidInput, "id is missing from the request"))
		return
	}
	roleID, err := valuer.NewUUID(id)
	if err != nil {
		render.Error(rw, err)
		return
	}

	relationStr, ok := mux.Vars(r)["relation"]
	if !ok {
		render.Error(rw, errors.New(errors.TypeInvalidInput, roletypes.ErrCodeRoleInvalidInput, "relation is missing from the request"))
		return
	}
	relation, err := authtypes.NewRelation(relationStr)
	if err != nil {
		render.Error(rw, err)
		return
	}

	objects, err := handler.module.GetObjects(ctx, valuer.MustNewUUID(claims.OrgID), roleID, relation)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, objects)
}

func (handler *handler) GetResources(rw http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	resources := handler.module.GetResources(ctx)

	var resourceRelations = struct {
		Resources []*authtypes.Resource                   `json:"resources"`
		Relations map[authtypes.Type][]authtypes.Relation `json:"relations"`
	}{
		Resources: resources,
		Relations: authtypes.TypeableRelations,
	}
	render.Success(rw, http.StatusOK, resourceRelations)
}

func (handler *handler) List(rw http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	roles, err := handler.module.List(ctx, valuer.MustNewUUID(claims.OrgID))
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, roles)
}

func (handler *handler) Patch(rw http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	id, err := valuer.NewUUID(mux.Vars(r)["id"])
	if err != nil {
		render.Error(rw, err)
		return
	}

	req := new(roletypes.PatchableRole)
	if err := binding.JSON.BindBody(r.Body, req); err != nil {
		render.Error(rw, err)
		return
	}

	role, err := handler.module.Get(ctx, valuer.MustNewUUID(claims.OrgID), id)
	if err != nil {
		render.Error(rw, err)
		return
	}

	role.PatchMetadata(req.Name, req.Description)
	err = handler.module.Patch(ctx, valuer.MustNewUUID(claims.OrgID), role)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusAccepted, nil)
}

func (handler *handler) PatchObjects(rw http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	id, err := valuer.NewUUID(mux.Vars(r)["id"])
	if err != nil {
		render.Error(rw, err)
		return
	}

	relation, err := authtypes.NewRelation(mux.Vars(r)["relation"])
	if err != nil {
		render.Error(rw, err)
		return
	}

	req := new(roletypes.PatchableObjects)
	if err := binding.JSON.BindBody(r.Body, req); err != nil {
		render.Error(rw, err)
		return
	}

	patchableObjects, err := roletypes.NewPatchableObjects(req.Additions, req.Deletions, relation)
	if err != nil {
		render.Error(rw, err)
		return
	}

	err = handler.module.PatchObjects(ctx, valuer.MustNewUUID(claims.OrgID), id, relation, patchableObjects.Additions, patchableObjects.Deletions)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusAccepted, nil)
}

func (handler *handler) Delete(rw http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	id, err := valuer.NewUUID(mux.Vars(r)["id"])
	if err != nil {
		render.Error(rw, err)
		return
	}

	err = handler.module.Delete(ctx, valuer.MustNewUUID(claims.OrgID), id)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusNoContent, nil)
}

package signozauthzapi

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/authz"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/binding"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/roletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/gorilla/mux"
)

type handler struct {
	authz authz.AuthZ
}

func NewHandler(authz authz.AuthZ) authz.Handler {
	return &handler{authz: authz}
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

	role := roletypes.NewRole(req.Name, req.Description, roletypes.RoleTypeCustom, valuer.MustNewUUID(claims.OrgID))
	err = handler.authz.Create(ctx, valuer.MustNewUUID(claims.OrgID), role)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusCreated, types.Identifiable{ID: role.ID})
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

	role, err := handler.authz.Get(ctx, valuer.MustNewUUID(claims.OrgID), roleID)
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

	objects, err := handler.authz.GetObjects(ctx, valuer.MustNewUUID(claims.OrgID), roleID, relation)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, objects)
}

func (handler *handler) GetResources(rw http.ResponseWriter, r *http.Request) {
	resources := handler.authz.GetResources(r.Context())

	render.Success(rw, http.StatusOK, roletypes.NewGettableResources(resources))
}

func (handler *handler) List(rw http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	roles, err := handler.authz.List(ctx, valuer.MustNewUUID(claims.OrgID))
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

	role, err := handler.authz.Get(ctx, valuer.MustNewUUID(claims.OrgID), id)
	if err != nil {
		render.Error(rw, err)
		return
	}

	err = role.PatchMetadata(req.Description)
	if err != nil {
		render.Error(rw, err)
		return
	}

	err = handler.authz.Patch(ctx, valuer.MustNewUUID(claims.OrgID), role)
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

	role, err := handler.authz.Get(ctx, valuer.MustNewUUID(claims.OrgID), id)
	if err != nil {
		render.Error(rw, err)
		return
	}

	patchableObjects, err := role.NewPatchableObjects(req.Additions, req.Deletions, relation)
	if err != nil {
		render.Error(rw, err)
		return
	}

	err = handler.authz.PatchObjects(ctx, valuer.MustNewUUID(claims.OrgID), role.Name, relation, patchableObjects.Additions, patchableObjects.Deletions)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusNoContent, nil)
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

	err = handler.authz.Delete(ctx, valuer.MustNewUUID(claims.OrgID), id)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusNoContent, nil)
}

func (handler *handler) Check(rw http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	transactions := make([]*authtypes.Transaction, 0)
	if err := binding.JSON.BindBody(r.Body, &transactions); err != nil {
		render.Error(rw, err)
		return
	}

	orgID := valuer.MustNewUUID(claims.OrgID)
	subject, err := authtypes.NewSubject(authtypes.TypeableUser, claims.UserID, orgID, nil)
	if err != nil {
		render.Error(rw, err)
		return
	}

	tuples, err := authtypes.NewTuplesFromTransactions(transactions, subject, orgID)
	if err != nil {
		render.Error(rw, err)
		return
	}

	results, err := handler.authz.BatchCheck(ctx, tuples)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, authtypes.NewGettableTransaction(transactions, results))
}

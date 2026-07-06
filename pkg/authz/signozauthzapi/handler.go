package signozauthzapi

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/authz"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/binding"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
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

	req := new(authtypes.PostableRole)
	if err := binding.JSON.BindBody(r.Body, req); err != nil {
		render.Error(rw, err)
		return
	}

	roleWithTransactionGroups := authtypes.NewRoleWithTransactionGroups(req.Name, req.Description, authtypes.RoleTypeCustom, valuer.MustNewUUID(claims.OrgID), req.TransactionGroups)
	err = handler.authz.Create(ctx, valuer.MustNewUUID(claims.OrgID), roleWithTransactionGroups)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusCreated, types.Identifiable{ID: roleWithTransactionGroups.ID})
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
		render.Error(rw, errors.New(errors.TypeInvalidInput, authtypes.ErrCodeRoleInvalidInput, "id is missing from the request"))
		return
	}
	roleID, err := valuer.NewUUID(id)
	if err != nil {
		render.Error(rw, err)
		return
	}

	roleWithTransactionGroups, err := handler.authz.GetWithTransactionGroups(ctx, valuer.MustNewUUID(claims.OrgID), roleID)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, roleWithTransactionGroups)
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

func (handler *handler) Update(rw http.ResponseWriter, r *http.Request) {
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

	req := new(authtypes.UpdatableRole)
	if err := binding.JSON.BindBody(r.Body, req); err != nil {
		render.Error(rw, err)
		return
	}

	role, err := handler.authz.Get(ctx, valuer.MustNewUUID(claims.OrgID), id)
	if err != nil {
		render.Error(rw, err)
		return
	}

	roleWithTransactionGroups := authtypes.MakeRoleWithTransactionGroups(role, nil)
	err = roleWithTransactionGroups.Update(req.Description, req.TransactionGroups)
	if err != nil {
		render.Error(rw, err)
		return
	}

	err = handler.authz.Update(ctx, valuer.MustNewUUID(claims.OrgID), roleWithTransactionGroups)
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
	subject, err := authtypes.NewSubject(coretypes.NewResourceUser(), claims.UserID, orgID, nil)
	if err != nil {
		render.Error(rw, err)
		return
	}

	results, err := handler.authz.CheckTransactions(ctx, subject, orgID, transactions)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, authtypes.NewGettableTransaction(results))
}

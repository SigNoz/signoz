package implauthdomain

import (
	"context"
	"net/http"
	"time"

	"github.com/SigNoz/signoz/pkg/http/binding"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/modules/authdomain"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/gorilla/mux"
)

type handler struct {
	module authdomain.Module
}

func NewHandler(module authdomain.Module) authdomain.Handler {
	return &handler{module: module}
}

func (handler *handler) Create(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	body := new(authtypes.PostableAuthDomain)
	if err := binding.JSON.BindBody(req.Body, body); err != nil {
		render.Error(rw, err)
		return
	}

	authDomain, err := authtypes.NewAuthDomainFromConfig(body.Name, &body.Config, valuer.MustNewUUID(claims.OrgID))
	if err != nil {
		render.Error(rw, err)
		return
	}

	err = handler.module.Create(ctx, authDomain)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusCreated, types.Identifiable{ID: authDomain.StorableAuthDomain().ID})
}

func (handler *handler) Delete(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	domainId, err := valuer.NewUUID(mux.Vars(req)["id"])
	if err != nil {
		render.Error(rw, err)
		return
	}
	err = handler.module.Delete(ctx, valuer.MustNewUUID(claims.OrgID), domainId)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusNoContent, nil)
}

func (handler *handler) List(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	domains, err := handler.module.ListByOrgID(ctx, valuer.MustNewUUID(claims.OrgID))
	if err != nil {
		render.Error(rw, err)
		return
	}

	authDomains := make([]*authtypes.GettableAuthDomain, len(domains))
	for i, domain := range domains {
		authDomains[i] = authtypes.NewGettableAuthDomainFromAuthDomain(domain)
	}

	render.Success(rw, http.StatusOK, authDomains)
}

func (handler *handler) Update(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	domainID, err := valuer.NewUUID(mux.Vars(r)["id"])
	if err != nil {
		render.Error(rw, err)
		return
	}

	body := new(authtypes.UpdateableAuthDomain)
	if err := binding.JSON.BindBody(r.Body, body); err != nil {
		render.Error(rw, err)
		return
	}

	authDomain, err := handler.module.GetByOrgIDAndID(ctx, valuer.MustNewUUID(claims.OrgID), domainID)
	if err != nil {
		render.Error(rw, err)
		return
	}

	err = authDomain.Update(&body.Config)
	if err != nil {
		render.Error(rw, err)
		return
	}

	if err := handler.module.Update(ctx, authDomain); err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusNoContent, nil)
}

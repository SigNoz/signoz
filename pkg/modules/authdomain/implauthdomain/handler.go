package implauthdomain

import (
	"context"
	"net/http"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/binding"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/modules/authdomain"
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

	authDomain, err := authtypes.NewAuthDomainFromConfig(body.Name, body.AuthDomainConfig, valuer.MustNewUUID(claims.OrgID))
	if err != nil {
		render.Error(rw, err)
		return
	}

	err = handler.module.Create(ctx, authDomain)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusCreated, authDomain.StorableAuthDomain().ID)
}

func (handler *handler) Delete(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 10*time.Second)
	defer cancel()

	domainId, err := valuer.NewUUID(mux.Vars(req)["id"])
	if err != nil {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "invalid domain id"))
		return
	}

	err = handler.module.Delete(ctx, domainId)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusNoContent, nil)
}

func (h *handler) List(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "orgId is not a valid uuid"))
		return
	}

	domains, err := h.module.ListByOrgID(ctx, orgID)
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

func (h *handler) Update(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	domainID, err := valuer.NewUUID(mux.Vars(r)["id"])
	if err != nil {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "invalid domain id"))
		return
	}

	body := new(authtypes.PostableAuthDomain)
	if err := binding.JSON.BindBody(r.Body, body); err != nil {
		render.Error(rw, err)
		return
	}

	authDomain, err := h.module.Get(ctx, domainID)
	if err != nil {
		render.Error(rw, err)
		return
	}

	err = authDomain.Update(&body.AuthDomainConfig)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusNoContent, nil)
}

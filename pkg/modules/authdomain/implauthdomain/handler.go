package implauthdomain

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/google/uuid"
	"github.com/gorilla/mux"
)

func (h *handler) CreateDomain(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	req := types.GettableOrgDomain{}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		render.Error(rw, err)
		return
	}

	if err := req.ValidNew(); err != nil {
		render.Error(rw, err)
		return
	}

	err := h.module.CreateDomain(ctx, &req)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusAccepted, req)
}

func (h *handler) DeleteDomain(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	domainIdStr := mux.Vars(r)["id"]
	domainId, err := uuid.Parse(domainIdStr)
	if err != nil {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "invalid domain id"))
		return
	}

	err = h.module.DeleteDomain(ctx, domainId)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusNoContent, nil)
}

func (h *handler) ListDomains(rw http.ResponseWriter, r *http.Request) {
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

	domains, err := h.module.ListDomains(r.Context(), orgID)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, domains)
}

func (h *handler) UpdateDomain(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	domainIdStr := mux.Vars(r)["id"]
	domainId, err := uuid.Parse(domainIdStr)
	if err != nil {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "invalid domain id"))
		return
	}

	req := types.GettableOrgDomain{StorableOrgDomain: types.StorableOrgDomain{ID: domainId}}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		render.Error(rw, errors.Wrapf(err, errors.TypeInvalidInput, errors.CodeInvalidInput, "unable to unmarshal the payload"))
		return
	}

	req.ID = domainId
	if err := req.Valid(nil); err != nil {
		render.Error(rw, errors.Wrapf(err, errors.TypeInvalidInput, errors.CodeInvalidInput, "invalid request"))
	}

	err = h.module.UpdateDomain(ctx, &req)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusNoContent, nil)
}

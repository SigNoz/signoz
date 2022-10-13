package api

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"go.signoz.io/signoz/ee/query-service/model"
)

func (ah *APIHandler) listDomainsByOrg(w http.ResponseWriter, r *http.Request) {
	orgId := mux.Vars(r)["orgId"]
	domains, apierr := ah.AppDao().ListDomains(context.Background(), orgId)
	if apierr != nil {
		RespondError(w, apierr, domains)
		return
	}
	ah.Respond(w, domains)
}

func (ah *APIHandler) postDomain(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()

	req := model.OrgDomain{}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondError(w, model.BadRequest(err), nil)
		return
	}

	if err := req.ValidNew(); err != nil {
		RespondError(w, model.BadRequest(err), nil)
		return
	}

	if apierr := ah.AppDao().CreateDomain(ctx, &req); apierr != nil {
		RespondError(w, apierr, nil)
		return
	}

	ah.Respond(w, &req)
}

func (ah *APIHandler) putDomain(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()

	domainIdStr := mux.Vars(r)["id"]
	domainId, err := uuid.Parse(domainIdStr)
	if err != nil {
		RespondError(w, model.BadRequest(err), nil)
		return
	}

	req := model.OrgDomain{Id: domainId}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondError(w, model.BadRequest(err), nil)
		return
	}
	req.Id = domainId
	if err := req.Valid(nil); err != nil {
		RespondError(w, model.BadRequest(err), nil)
	}

	if apierr := ah.AppDao().UpdateDomain(ctx, &req); apierr != nil {
		RespondError(w, apierr, nil)
		return
	}

	ah.Respond(w, &req)
}

func (ah *APIHandler) deleteDomain(w http.ResponseWriter, r *http.Request) {
	domainIdStr := mux.Vars(r)["id"]

	domainId, err := uuid.Parse(domainIdStr)
	if err != nil {
		RespondError(w, model.BadRequest(fmt.Errorf("invalid domain id")), nil)
		return
	}

	apierr := ah.AppDao().DeleteDomain(context.Background(), domainId)
	if apierr != nil {
		RespondError(w, apierr, nil)
		return
	}
	ah.Respond(w, nil)
}

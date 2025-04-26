package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"slices"
	"time"

	"github.com/SigNoz/signoz/ee/query-service/model"
	eeTypes "github.com/SigNoz/signoz/ee/types"
	"github.com/SigNoz/signoz/pkg/errors"
	errorsV2 "github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/render"
	basemodel "github.com/SigNoz/signoz/pkg/query-service/model"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/gorilla/mux"
	"go.uber.org/zap"
)

func (ah *APIHandler) createPAT(w http.ResponseWriter, r *http.Request) {
	claims, err := authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		render.Error(w, err)
		return
	}

	req := model.CreatePATRequestBody{}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondError(w, model.BadRequest(err), nil)
		return
	}

	pat := eeTypes.NewGettablePAT(
		req.Name,
		req.Role,
		claims.UserID,
		req.ExpiresInDays,
	)
	err = validatePATRequest(pat)
	if err != nil {
		RespondError(w, model.BadRequest(err), nil)
		return
	}

	zap.L().Info("Got Create PAT request", zap.Any("pat", pat))
	var apierr basemodel.BaseApiError
	if pat, apierr = ah.AppDao().CreatePAT(r.Context(), claims.OrgID, pat); apierr != nil {
		RespondError(w, apierr, nil)
		return
	}

	ah.Respond(w, &pat)
}

func validatePATRequest(req eeTypes.GettablePAT) error {
	_, err := authtypes.NewRole(req.Role)
	if err != nil {
		return err
	}

	if req.ExpiresAt < 0 {
		return fmt.Errorf("valid expiresAt is required")
	}

	if req.Name == "" {
		return fmt.Errorf("valid name is required")
	}

	return nil
}

func (ah *APIHandler) updatePAT(w http.ResponseWriter, r *http.Request) {
	claims, err := authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		render.Error(w, err)
		return
	}

	req := eeTypes.GettablePAT{}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondError(w, model.BadRequest(err), nil)
		return
	}

	idStr := mux.Vars(r)["id"]
	id, err := valuer.NewUUID(idStr)
	if err != nil {
		render.Error(w, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "id is not a valid uuid-v7"))
		return
	}

	//get the pat
	existingPAT, paterr := ah.AppDao().GetPATByID(r.Context(), claims.OrgID, id)
	if paterr != nil {
		render.Error(w, errorsV2.Newf(errorsV2.TypeInvalidInput, errorsV2.CodeInvalidInput, paterr.Error()))
		return
	}

	// get the user
	createdByUser, usererr := ah.AppDao().GetUser(r.Context(), existingPAT.UserID)
	if usererr != nil {
		render.Error(w, errorsV2.Newf(errorsV2.TypeInvalidInput, errorsV2.CodeInvalidInput, usererr.Error()))
		return
	}

	if slices.Contains(types.AllIntegrationUserEmails, types.IntegrationUserEmail(createdByUser.Email)) {
		render.Error(w, errorsV2.Newf(errorsV2.TypeInvalidInput, errorsV2.CodeInvalidInput, "integration user pat cannot be updated"))
		return
	}

	err = validatePATRequest(req)
	if err != nil {
		RespondError(w, model.BadRequest(err), nil)
		return
	}

	req.UpdatedByUserID = claims.UserID
	req.UpdatedAt = time.Now()
	zap.L().Info("Got Update PAT request", zap.Any("pat", req))
	var apierr basemodel.BaseApiError
	if apierr = ah.AppDao().UpdatePAT(r.Context(), claims.OrgID, req, id); apierr != nil {
		RespondError(w, apierr, nil)
		return
	}

	ah.Respond(w, map[string]string{"data": "pat updated successfully"})
}

func (ah *APIHandler) getPATs(w http.ResponseWriter, r *http.Request) {
	claims, err := authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		render.Error(w, err)
		return
	}

	pats, apierr := ah.AppDao().ListPATs(r.Context(), claims.OrgID)
	if apierr != nil {
		RespondError(w, apierr, nil)
		return
	}

	ah.Respond(w, pats)
}

func (ah *APIHandler) revokePAT(w http.ResponseWriter, r *http.Request) {
	claims, err := authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		render.Error(w, err)
		return
	}

	idStr := mux.Vars(r)["id"]
	id, err := valuer.NewUUID(idStr)
	if err != nil {
		render.Error(w, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "id is not a valid uuid-v7"))
		return
	}

	//get the pat
	existingPAT, paterr := ah.AppDao().GetPATByID(r.Context(), claims.OrgID, id)
	if paterr != nil {
		render.Error(w, errorsV2.Newf(errorsV2.TypeInvalidInput, errorsV2.CodeInvalidInput, paterr.Error()))
		return
	}

	// get the user
	createdByUser, usererr := ah.AppDao().GetUser(r.Context(), existingPAT.UserID)
	if usererr != nil {
		render.Error(w, errorsV2.Newf(errorsV2.TypeInvalidInput, errorsV2.CodeInvalidInput, usererr.Error()))
		return
	}

	if slices.Contains(types.AllIntegrationUserEmails, types.IntegrationUserEmail(createdByUser.Email)) {
		render.Error(w, errorsV2.Newf(errorsV2.TypeInvalidInput, errorsV2.CodeInvalidInput, "integration user pat cannot be updated"))
		return
	}

	zap.L().Info("Revoke PAT with id", zap.String("id", id.StringValue()))
	if apierr := ah.AppDao().RevokePAT(r.Context(), claims.OrgID, id, claims.UserID); apierr != nil {
		RespondError(w, apierr, nil)
		return
	}
	ah.Respond(w, map[string]string{"data": "pat revoked successfully"})
}

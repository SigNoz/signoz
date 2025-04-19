package api

import (
	"context"
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
	"github.com/SigNoz/signoz/pkg/query-service/auth"
	baseconstants "github.com/SigNoz/signoz/pkg/query-service/constants"
	basemodel "github.com/SigNoz/signoz/pkg/query-service/model"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/gorilla/mux"
	"go.uber.org/zap"
)

func (ah *APIHandler) createPAT(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()

	req := model.CreatePATRequestBody{}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondError(w, model.BadRequest(err), nil)
		return
	}
	user, err := auth.GetUserFromReqContext(r.Context())
	if err != nil {
		RespondError(w, &model.ApiError{
			Typ: model.ErrorUnauthorized,
			Err: err,
		}, nil)
		return
	}
	pat := eeTypes.NewGettablePAT(
		req.Name,
		req.Role,
		user.ID,
		req.ExpiresInDays,
	)
	err = validatePATRequest(pat)
	if err != nil {
		RespondError(w, model.BadRequest(err), nil)
		return
	}

	zap.L().Info("Got Create PAT request", zap.Any("pat", pat))
	var apierr basemodel.BaseApiError
	if pat, apierr = ah.AppDao().CreatePAT(ctx, user.OrgID, pat); apierr != nil {
		RespondError(w, apierr, nil)
		return
	}

	ah.Respond(w, &pat)
}

func validatePATRequest(req eeTypes.GettablePAT) error {
	if req.Role == "" || (req.Role != baseconstants.ViewerGroup && req.Role != baseconstants.EditorGroup && req.Role != baseconstants.AdminGroup) {
		return fmt.Errorf("valid role is required")
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
	ctx := context.Background()

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

	user, err := auth.GetUserFromReqContext(r.Context())
	if err != nil {
		RespondError(w, &model.ApiError{
			Typ: model.ErrorUnauthorized,
			Err: err,
		}, nil)
		return
	}

	//get the pat
	existingPAT, paterr := ah.AppDao().GetPATByID(ctx, user.OrgID, id)
	if paterr != nil {
		render.Error(w, errorsV2.Newf(errorsV2.TypeInvalidInput, errorsV2.CodeInvalidInput, paterr.Error()))
		return
	}

	// get the user
	createdByUser, usererr := ah.AppDao().GetUser(ctx, existingPAT.UserID)
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

	req.UpdatedByUserID = user.ID
	req.UpdatedAt = time.Now()
	zap.L().Info("Got Update PAT request", zap.Any("pat", req))
	var apierr basemodel.BaseApiError
	if apierr = ah.AppDao().UpdatePAT(ctx, user.OrgID, req, id); apierr != nil {
		RespondError(w, apierr, nil)
		return
	}

	ah.Respond(w, map[string]string{"data": "pat updated successfully"})
}

func (ah *APIHandler) getPATs(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	user, err := auth.GetUserFromReqContext(r.Context())
	if err != nil {
		RespondError(w, &model.ApiError{
			Typ: model.ErrorUnauthorized,
			Err: err,
		}, nil)
		return
	}
	zap.L().Info("Get PATs for user", zap.String("user_id", user.ID))
	pats, apierr := ah.AppDao().ListPATs(ctx, user.OrgID)
	if apierr != nil {
		RespondError(w, apierr, nil)
		return
	}
	ah.Respond(w, pats)
}

func (ah *APIHandler) revokePAT(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	idStr := mux.Vars(r)["id"]
	id, err := valuer.NewUUID(idStr)
	if err != nil {
		render.Error(w, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "id is not a valid uuid-v7"))
		return
	}
	user, err := auth.GetUserFromReqContext(r.Context())
	if err != nil {
		RespondError(w, &model.ApiError{
			Typ: model.ErrorUnauthorized,
			Err: err,
		}, nil)
		return
	}

	//get the pat
	existingPAT, paterr := ah.AppDao().GetPATByID(ctx, user.OrgID, id)
	if paterr != nil {
		render.Error(w, errorsV2.Newf(errorsV2.TypeInvalidInput, errorsV2.CodeInvalidInput, paterr.Error()))
		return
	}

	// get the user
	createdByUser, usererr := ah.AppDao().GetUser(ctx, existingPAT.UserID)
	if usererr != nil {
		render.Error(w, errorsV2.Newf(errorsV2.TypeInvalidInput, errorsV2.CodeInvalidInput, usererr.Error()))
		return
	}

	if slices.Contains(types.AllIntegrationUserEmails, types.IntegrationUserEmail(createdByUser.Email)) {
		render.Error(w, errorsV2.Newf(errorsV2.TypeInvalidInput, errorsV2.CodeInvalidInput, "integration user pat cannot be updated"))
		return
	}

	zap.L().Info("Revoke PAT with id", zap.String("id", id.StringValue()))
	if apierr := ah.AppDao().RevokePAT(ctx, user.OrgID, id, user.ID); apierr != nil {
		RespondError(w, apierr, nil)
		return
	}
	ah.Respond(w, map[string]string{"data": "pat revoked successfully"})
}

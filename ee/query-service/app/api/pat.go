package api

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/gorilla/mux"
	"go.signoz.io/signoz/ee/query-service/model"
	"go.signoz.io/signoz/pkg/query-service/auth"
	baseconstants "go.signoz.io/signoz/pkg/query-service/constants"
	basemodel "go.signoz.io/signoz/pkg/query-service/model"
	"go.uber.org/zap"
)

func generatePATToken() string {
	// Generate a 32-byte random token.
	token := make([]byte, 32)
	rand.Read(token)
	// Encode the token in base64.
	encodedToken := base64.StdEncoding.EncodeToString(token)
	return encodedToken
}

func (ah *APIHandler) createPAT(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()

	req := model.PAT{}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondError(w, model.BadRequest(err), nil)
		return
	}
	user, err := auth.GetUserFromRequest(r)
	if err != nil {
		RespondError(w, &model.ApiError{
			Typ: model.ErrorUnauthorized,
			Err: err,
		}, nil)
		return
	}
	err = validatePATRequest(req)
	if err != nil {
		RespondError(w, model.BadRequest(err), nil)
		return
	}

	// All the PATs are associated with the user creating the PAT.
	req.UserID = user.Id
	req.CreatedAt = time.Now().Unix()
	req.UpdatedAt = time.Now().Unix()
	req.LastUsed = 0
	req.Token = generatePATToken()

	if req.ExpiresAt != 0 {
		// convert expiresAt to unix timestamp from days
		req.ExpiresAt = time.Now().Unix() + (req.ExpiresAt * 24 * 60 * 60)
	}

	zap.S().Debugf("Got Create PAT request: %+v", req)
	var apierr basemodel.BaseApiError
	if req, apierr = ah.AppDao().CreatePAT(ctx, req); apierr != nil {
		RespondError(w, apierr, nil)
		return
	}

	ah.Respond(w, &req)
}

func validatePATRequest(req model.PAT) error {
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

	req := model.PAT{}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondError(w, model.BadRequest(err), nil)
		return
	}

	user, err := auth.GetUserFromRequest(r)
	if err != nil {
		RespondError(w, &model.ApiError{
			Typ: model.ErrorUnauthorized,
			Err: err,
		}, nil)
		return
	}

	err = validatePATRequest(req)
	if err != nil {
		RespondError(w, model.BadRequest(err), nil)
		return
	}

	req.UpdatedByUserID = user.Id
	id := mux.Vars(r)["id"]
	req.UpdatedAt = time.Now().Unix()
	zap.S().Debugf("Got Update PAT request: %+v", req)
	var apierr basemodel.BaseApiError
	if apierr = ah.AppDao().UpdatePAT(ctx, req, id); apierr != nil {
		RespondError(w, apierr, nil)
		return
	}

	ah.Respond(w, map[string]string{"data": "pat updated successfully"})
}

func (ah *APIHandler) getPATs(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	user, err := auth.GetUserFromRequest(r)
	if err != nil {
		RespondError(w, &model.ApiError{
			Typ: model.ErrorUnauthorized,
			Err: err,
		}, nil)
		return
	}
	zap.S().Infof("Get PATs for user: %+v", user.Id)
	pats, apierr := ah.AppDao().ListPATs(ctx, user.Id)
	if apierr != nil {
		RespondError(w, apierr, nil)
		return
	}
	ah.Respond(w, pats)
}

func (ah *APIHandler) revokePAT(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	id := mux.Vars(r)["id"]
	user, err := auth.GetUserFromRequest(r)
	if err != nil {
		RespondError(w, &model.ApiError{
			Typ: model.ErrorUnauthorized,
			Err: err,
		}, nil)
		return
	}
	pat, apierr := ah.AppDao().GetPATByID(ctx, id)
	if apierr != nil {
		RespondError(w, apierr, nil)
		return
	}
	if pat.UserID != user.Id {
		RespondError(w, &model.ApiError{
			Typ: model.ErrorUnauthorized,
			Err: fmt.Errorf("unauthorized PAT revoke request"),
		}, nil)
		return
	}
	zap.S().Debugf("Revoke PAT with id: %+v", id)
	if apierr := ah.AppDao().RevokePAT(ctx, id, user.Id); apierr != nil {
		RespondError(w, apierr, nil)
		return
	}
	ah.Respond(w, map[string]string{"data": "pat revoked successfully"})
}

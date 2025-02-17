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
	pat := model.PAT{
		Name:      req.Name,
		Role:      req.Role,
		ExpiresAt: req.ExpiresInDays,
	}
	err = validatePATRequest(pat)
	if err != nil {
		RespondError(w, model.BadRequest(err), nil)
		return
	}

	// All the PATs are associated with the user creating the PAT.
	pat.UserID = user.Id
	pat.CreatedAt = time.Now().Unix()
	pat.UpdatedAt = time.Now().Unix()
	pat.LastUsed = 0
	pat.Token = generatePATToken()

	if pat.ExpiresAt != 0 {
		// convert expiresAt to unix timestamp from days
		pat.ExpiresAt = time.Now().Unix() + (pat.ExpiresAt * 24 * 60 * 60)
	}

	zap.L().Info("Got Create PAT request", zap.Any("pat", pat))
	var apierr basemodel.BaseApiError
	if pat, apierr = ah.AppDao().CreatePAT(ctx, pat); apierr != nil {
		RespondError(w, apierr, nil)
		return
	}

	ah.Respond(w, &pat)
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

	user, err := auth.GetUserFromReqContext(r.Context())
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
	zap.L().Info("Got Update PAT request", zap.Any("pat", req))
	var apierr basemodel.BaseApiError
	if apierr = ah.AppDao().UpdatePAT(ctx, req, id); apierr != nil {
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
	zap.L().Info("Get PATs for user", zap.String("user_id", user.Id))
	pats, apierr := ah.AppDao().ListPATs(ctx)
	if apierr != nil {
		RespondError(w, apierr, nil)
		return
	}
	ah.Respond(w, pats)
}

func (ah *APIHandler) revokePAT(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	id := mux.Vars(r)["id"]
	user, err := auth.GetUserFromReqContext(r.Context())
	if err != nil {
		RespondError(w, &model.ApiError{
			Typ: model.ErrorUnauthorized,
			Err: err,
		}, nil)
		return
	}

	zap.L().Info("Revoke PAT with id", zap.String("id", id))
	if apierr := ah.AppDao().RevokePAT(ctx, id, user.Id); apierr != nil {
		RespondError(w, apierr, nil)
		return
	}
	ah.Respond(w, map[string]string{"data": "pat revoked successfully"})
}

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

	if !ah.CheckFeature(model.Pat) {
		RespondError(w, model.BadRequestStr("feature unavailable, please upgrade to EE"), nil)
		return
	}

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

	// All the PATs are associated with the user creating the PAT. Hence, the permissions
	// associated with the PAT is also equivalent to that of the user.
	req.UserID = user.Id
	req.CreatedAt = time.Now().Unix()
	req.Token = generatePATToken()

	zap.S().Debugf("Got PAT request: %+v", req)
	if apierr := ah.AppDao().CreatePAT(ctx, &req); apierr != nil {
		RespondError(w, apierr, nil)
		return
	}

	ah.Respond(w, &req)
}

func (ah *APIHandler) getPATs(w http.ResponseWriter, r *http.Request) {
	if !ah.CheckFeature(model.Pat) {
		RespondError(w, model.BadRequestStr("feature unavailable, please upgrade to EE"), nil)
		return
	}

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

func (ah *APIHandler) deletePAT(w http.ResponseWriter, r *http.Request) {
	if !ah.CheckFeature(model.Pat) {
		RespondError(w, model.BadRequestStr("feature unavailable, please upgrade to EE"), nil)
		return
	}

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
			Err: fmt.Errorf("unauthorized PAT delete request"),
		}, nil)
		return
	}
	zap.S().Debugf("Delete PAT with id: %+v", id)
	if apierr := ah.AppDao().DeletePAT(ctx, id); apierr != nil {
		RespondError(w, apierr, nil)
		return
	}
	ah.Respond(w, map[string]string{"data": "pat deleted successfully"})
}

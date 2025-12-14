package impluser

import (
	"context"
	"encoding/json"
	"net/http"
	"slices"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/binding"
	"github.com/SigNoz/signoz/pkg/http/render"
	root "github.com/SigNoz/signoz/pkg/modules/user"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/gorilla/mux"
)

type handler struct {
	module root.Module
	getter root.Getter
}

func NewHandler(module root.Module, getter root.Getter) root.Handler {
	return &handler{module: module, getter: getter}
}

func (h *handler) AcceptInvite(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	req := new(types.PostableAcceptInvite)
	if err := binding.JSON.BindBody(r.Body, req); err != nil {
		render.Error(w, err)
		return
	}

	user, err := h.module.AcceptInvite(ctx, req.InviteToken, req.Password)
	if err != nil {
		render.Error(w, err)
		return
	}

	render.Success(w, http.StatusCreated, user)
}

func (h *handler) CreateInvite(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	var req types.PostableInvite
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		render.Error(rw, err)
		return
	}

	invites, err := h.module.CreateBulkInvite(ctx, valuer.MustNewUUID(claims.OrgID), valuer.MustNewUUID(claims.UserID), &types.PostableBulkInviteRequest{
		Invites: []types.PostableInvite{req},
	})
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusCreated, invites[0])
}

func (h *handler) CreateBulkInvite(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	var req types.PostableBulkInviteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		render.Error(rw, err)
		return
	}

	// Validate that the request contains users
	if len(req.Invites) == 0 {
		render.Error(rw, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "no invites provided for invitation"))
		return
	}

	_, err = h.module.CreateBulkInvite(ctx, valuer.MustNewUUID(claims.OrgID), valuer.MustNewUUID(claims.UserID), &req)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusCreated, nil)
}

func (h *handler) GetInvite(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	token := mux.Vars(r)["token"]
	invite, err := h.module.GetInviteByToken(ctx, token)
	if err != nil {
		render.Error(w, err)
		return
	}

	render.Success(w, http.StatusOK, invite)
}

func (h *handler) ListInvite(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(w, err)
		return
	}

	invites, err := h.module.ListInvite(ctx, claims.OrgID)
	if err != nil {
		render.Error(w, err)
		return
	}

	render.Success(w, http.StatusOK, invites)
}

func (h *handler) DeleteInvite(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	id := mux.Vars(r)["id"]

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(w, err)
		return
	}

	uuid, err := valuer.NewUUID(id)
	if err != nil {
		render.Error(w, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "orgId is invalid"))
		return
	}

	if err := h.module.DeleteInvite(ctx, claims.OrgID, uuid); err != nil {
		render.Error(w, err)
		return
	}
	render.Success(w, http.StatusNoContent, nil)
}

func (h *handler) GetUser(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	id := mux.Vars(r)["id"]

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(w, err)
		return
	}

	user, err := h.getter.GetByOrgIDAndID(ctx, valuer.MustNewUUID(claims.OrgID), valuer.MustNewUUID(id))
	if err != nil {
		render.Error(w, err)
		return
	}

	render.Success(w, http.StatusOK, user)
}

func (h *handler) GetMyUser(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(w, err)
		return
	}

	user, err := h.getter.GetByOrgIDAndID(ctx, valuer.MustNewUUID(claims.OrgID), valuer.MustNewUUID(claims.UserID))
	if err != nil {
		render.Error(w, err)
		return
	}

	render.Success(w, http.StatusOK, user)
}

func (h *handler) ListUsers(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(w, err)
		return
	}

	users, err := h.getter.ListByOrgID(ctx, valuer.MustNewUUID(claims.OrgID))
	if err != nil {
		render.Error(w, err)
		return
	}

	render.Success(w, http.StatusOK, users)
}

func (h *handler) UpdateUser(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	id := mux.Vars(r)["id"]

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(w, err)
		return
	}

	var user types.User
	if err := json.NewDecoder(r.Body).Decode(&user); err != nil {
		render.Error(w, err)
		return
	}

	updatedUser, err := h.module.UpdateUser(ctx, valuer.MustNewUUID(claims.OrgID), id, &user, claims.UserID)
	if err != nil {
		render.Error(w, err)
		return
	}

	render.Success(w, http.StatusOK, updatedUser)
}

func (h *handler) DeleteUser(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	id := mux.Vars(r)["id"]

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(w, err)
		return
	}

	if err := h.module.DeleteUser(ctx, valuer.MustNewUUID(claims.OrgID), id, claims.UserID); err != nil {
		render.Error(w, err)
		return
	}

	render.Success(w, http.StatusNoContent, nil)
}

func (handler *handler) GetResetPasswordToken(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	id := mux.Vars(r)["id"]

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(w, err)
		return
	}

	user, err := handler.getter.GetByOrgIDAndID(ctx, valuer.MustNewUUID(claims.OrgID), valuer.MustNewUUID(id))
	if err != nil {
		render.Error(w, err)
		return
	}

	token, err := handler.module.GetOrCreateResetPasswordToken(ctx, user.ID)
	if err != nil {
		render.Error(w, err)
		return
	}

	render.Success(w, http.StatusOK, token)
}

func (handler *handler) ResetPassword(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	req := new(types.PostableResetPassword)
	if err := json.NewDecoder(r.Body).Decode(req); err != nil {
		render.Error(w, err)
		return
	}

	err := handler.module.UpdatePasswordByResetPasswordToken(ctx, req.Token, req.Password)
	if err != nil {
		render.Error(w, err)
		return
	}

	render.Success(w, http.StatusNoContent, nil)
}

func (handler *handler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	var req types.ChangePasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		render.Error(w, err)
		return
	}

	err := handler.module.UpdatePassword(ctx, req.UserID, req.OldPassword, req.NewPassword)
	if err != nil {
		render.Error(w, err)
		return
	}

	render.Success(w, http.StatusNoContent, nil)
}

func (h *handler) CreateAPIKey(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(w, err)
		return
	}

	req := new(types.PostableAPIKey)
	if err := json.NewDecoder(r.Body).Decode(req); err != nil {
		render.Error(w, errors.Wrapf(err, errors.TypeInvalidInput, errors.CodeInvalidInput, "failed to decode api key"))
		return
	}

	apiKey, err := types.NewStorableAPIKey(
		req.Name,
		valuer.MustNewUUID(claims.UserID),
		req.Role,
		req.ExpiresInDays,
	)
	if err != nil {
		render.Error(w, err)
		return
	}

	err = h.module.CreateAPIKey(ctx, apiKey)
	if err != nil {
		render.Error(w, err)
		return
	}

	createdApiKey, err := h.module.GetAPIKey(ctx, valuer.MustNewUUID(claims.OrgID), apiKey.ID)
	if err != nil {
		render.Error(w, err)
		return
	}

	// just corrected the status code, response is same,
	render.Success(w, http.StatusCreated, createdApiKey)
}

func (h *handler) ListAPIKeys(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(w, err)
		return
	}

	apiKeys, err := h.module.ListAPIKeys(ctx, valuer.MustNewUUID(claims.OrgID))
	if err != nil {
		render.Error(w, err)
		return
	}

	// for backward compatibility
	if len(apiKeys) == 0 {
		render.Success(w, http.StatusOK, []types.GettableAPIKey{})
		return
	}

	result := make([]*types.GettableAPIKey, len(apiKeys))
	for i, apiKey := range apiKeys {
		result[i] = types.NewGettableAPIKeyFromStorableAPIKey(apiKey)
	}

	render.Success(w, http.StatusOK, result)

}

func (h *handler) UpdateAPIKey(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(w, err)
		return
	}

	req := types.StorableAPIKey{}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		render.Error(w, errors.Wrapf(err, errors.TypeInvalidInput, errors.CodeInvalidInput, "failed to decode api key"))
		return
	}

	idStr := mux.Vars(r)["id"]
	id, err := valuer.NewUUID(idStr)
	if err != nil {
		render.Error(w, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "id is not a valid uuid-v7"))
		return
	}

	//get the API Key
	existingAPIKey, err := h.module.GetAPIKey(ctx, valuer.MustNewUUID(claims.OrgID), id)
	if err != nil {
		render.Error(w, err)
		return
	}

	// get the user
	createdByUser, err := h.getter.Get(ctx, existingAPIKey.UserID)
	if err != nil {
		render.Error(w, err)
		return
	}

	if slices.Contains(types.AllIntegrationUserEmails, types.IntegrationUserEmail(createdByUser.Email.String())) {
		render.Error(w, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "API Keys for integration users cannot be revoked"))
		return
	}

	err = h.module.UpdateAPIKey(ctx, id, &req, valuer.MustNewUUID(claims.UserID))
	if err != nil {
		render.Error(w, err)
		return
	}

	render.Success(w, http.StatusNoContent, nil)
}

func (h *handler) RevokeAPIKey(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
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

	//get the API Key
	existingAPIKey, err := h.module.GetAPIKey(ctx, valuer.MustNewUUID(claims.OrgID), id)
	if err != nil {
		render.Error(w, err)
		return
	}

	// get the user
	createdByUser, err := h.getter.Get(ctx, existingAPIKey.UserID)
	if err != nil {
		render.Error(w, err)
		return
	}

	if slices.Contains(types.AllIntegrationUserEmails, types.IntegrationUserEmail(createdByUser.Email.String())) {
		render.Error(w, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "API Keys for integration users cannot be revoked"))
		return
	}

	if err := h.module.RevokeAPIKey(ctx, id, valuer.MustNewUUID(claims.UserID)); err != nil {
		render.Error(w, err)
		return
	}

	render.Success(w, http.StatusNoContent, nil)
}

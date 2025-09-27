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
}

func NewHandler(module root.Module) root.Handler {
	return &handler{module: module}
}

func (h *handler) AcceptInvite(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	req := new(types.PostableAcceptInvite)
	if err := binding.JSON.BindBody(r.Body, req); err != nil {
		render.Error(w, err)
		return
	}

	// get invite object
	invite, err := h.module.GetInviteByToken(ctx, req.InviteToken)
	if err != nil {
		render.Error(w, err)
		return
	}

	orgDomain, err := h.module.GetAuthDomainByEmail(ctx, invite.Email)
	if err != nil && !errors.Ast(err, errors.TypeNotFound) {
		render.Error(w, err)
		return
	}

	precheckResp := &types.GettableLoginPrecheck{
		SSO:    false,
		IsUser: false,
	}

	if invite.Name == "" && req.DisplayName != "" {
		invite.Name = req.DisplayName
	}

	user, err := types.NewUser(invite.Name, invite.Email, invite.Role, invite.OrgID)
	if err != nil {
		render.Error(w, err)
		return
	}

	if orgDomain != nil && orgDomain.SsoEnabled {
		// sso is enabled, create user and respond precheck data
		err = h.module.CreateUser(ctx, user)
		if err != nil {
			render.Error(w, err)
			return
		}

		// check if sso is enforced for the org
		precheckResp, err = h.module.LoginPrecheck(ctx, invite.OrgID, user.Email, req.SourceURL)
		if err != nil {
			render.Error(w, err)
			return
		}

	} else {
		password, err := types.NewFactorPassword(req.Password, user.ID.StringValue())
		if err != nil {
			render.Error(w, err)
			return
		}

		err = h.module.CreateUser(ctx, user, root.WithFactorPassword(password))
		if err != nil {
			render.Error(w, err)
			return
		}

		precheckResp.IsUser = true
	}

	// delete the invite
	if err := h.module.DeleteInvite(ctx, invite.OrgID, invite.ID); err != nil {
		render.Error(w, err)
		return
	}

	render.Success(w, http.StatusOK, precheckResp)
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

	invites, err := h.module.CreateBulkInvite(ctx, claims.OrgID, claims.UserID, &types.PostableBulkInviteRequest{
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

	_, err = h.module.CreateBulkInvite(ctx, claims.OrgID, claims.UserID, &req)
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

	user, err := h.module.GetUserByID(ctx, claims.OrgID, id)
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

	users, err := h.module.ListUsers(ctx, claims.OrgID)
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

	updatedUser, err := h.module.UpdateUser(ctx, claims.OrgID, id, &user, claims.UserID)
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

	if err := h.module.DeleteUser(ctx, claims.OrgID, id, claims.UserID); err != nil {
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

	// check if the id lies in the same org as the claims
	user, err := handler.module.GetUserByID(ctx, claims.OrgID, id)
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

	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(w, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "orgId is not a valid uuid-v7"))
		return
	}

	userID, err := valuer.NewUUID(claims.UserID)
	if err != nil {
		render.Error(w, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "userId is not a valid uuid-v7"))
		return
	}

	req := new(types.PostableAPIKey)
	if err := json.NewDecoder(r.Body).Decode(req); err != nil {
		render.Error(w, errors.Wrapf(err, errors.TypeInvalidInput, errors.CodeInvalidInput, "failed to decode api key"))
		return
	}

	apiKey, err := types.NewStorableAPIKey(
		req.Name,
		userID,
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

	createdApiKey, err := h.module.GetAPIKey(ctx, orgID, apiKey.ID)
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

	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(w, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "orgId is not a valid uuid-v7"))
		return
	}

	apiKeys, err := h.module.ListAPIKeys(ctx, orgID)
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

	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(w, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "orgId is not a valid uuid-v7"))
		return
	}

	userID, err := valuer.NewUUID(claims.UserID)
	if err != nil {
		render.Error(w, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "userId is not a valid uuid-v7"))
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
	existingAPIKey, err := h.module.GetAPIKey(ctx, orgID, id)
	if err != nil {
		render.Error(w, err)
		return
	}

	// get the user
	createdByUser, err := h.module.GetUserByID(ctx, orgID.String(), existingAPIKey.UserID.String())
	if err != nil {
		render.Error(w, err)
		return
	}

	if slices.Contains(types.AllIntegrationUserEmails, types.IntegrationUserEmail(createdByUser.Email)) {
		render.Error(w, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "API Keys for integration users cannot be revoked"))
		return
	}

	err = h.module.UpdateAPIKey(ctx, id, &req, userID)
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

	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(w, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "orgId is not a valid uuid-v7"))
		return
	}

	userID, err := valuer.NewUUID(claims.UserID)
	if err != nil {
		render.Error(w, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "userId is not a valid uuid-v7"))
		return
	}

	//get the API Key
	existingAPIKey, err := h.module.GetAPIKey(ctx, orgID, id)
	if err != nil {
		render.Error(w, err)
		return
	}

	// get the user
	createdByUser, err := h.module.GetUserByID(ctx, orgID.String(), existingAPIKey.UserID.String())
	if err != nil {
		render.Error(w, err)
		return
	}

	if slices.Contains(types.AllIntegrationUserEmails, types.IntegrationUserEmail(createdByUser.Email)) {
		render.Error(w, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "API Keys for integration users cannot be revoked"))
		return
	}

	if err := h.module.RevokeAPIKey(ctx, id, userID); err != nil {
		render.Error(w, err)
		return
	}

	render.Success(w, http.StatusNoContent, nil)
}

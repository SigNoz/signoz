package impluser

import (
	"context"
	"encoding/json"
	"net/http"
	"slices"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/modules/user"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/google/uuid"
	"github.com/gorilla/mux"
)

type handler struct {
	module user.Module
}

func NewHandler(module user.Module) user.Handler {
	return &handler{module: module}
}

func (h *handler) AcceptInvite(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	req := new(types.PostableAcceptInvite)
	if err := json.NewDecoder(r.Body).Decode(req); err != nil {
		render.Error(w, errors.Wrapf(err, errors.TypeInvalidInput, errors.CodeInvalidInput, "failed to decode user"))
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
		password, err := types.NewFactorPassword(req.Password)
		if err != nil {
			render.Error(w, err)
			return
		}

		_, err = h.module.CreateUserWithPassword(ctx, user, password)
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
	sourceUrl := r.URL.Query().Get("ref")
	invite, err := h.module.GetInviteByToken(ctx, token)
	if err != nil {
		render.Error(w, err)
		return
	}

	// precheck the user
	precheckResp, err := h.module.LoginPrecheck(ctx, invite.OrgID, invite.Email, sourceUrl)
	if err != nil {
		render.Error(w, err)
		return
	}

	gettableInvite := &types.GettableEEInvite{
		GettableInvite: *invite,
		PreCheck:       precheckResp,
	}

	render.Success(w, http.StatusOK, gettableInvite)
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

	existingUser, err := h.module.GetUserByID(ctx, claims.OrgID, id)
	if err != nil {
		render.Error(w, err)
		return
	}

	// only displayName, role can be updated
	if user.DisplayName == "" {
		user.DisplayName = existingUser.DisplayName
	}

	if user.Role == "" {
		user.Role = existingUser.Role
	}

	if user.Role != existingUser.Role && claims.Role != types.RoleAdmin {
		render.Error(w, errors.New(errors.TypeForbidden, errors.CodeForbidden, "only admins can change roles"))
		return
	}

	// Make sure that the request is not demoting the last admin user.
	// also an admin user can only change role of their own or other user
	if user.Role != existingUser.Role && existingUser.Role == types.RoleAdmin.String() {
		adminUsers, err := h.module.GetUsersByRoleInOrg(ctx, claims.OrgID, types.RoleAdmin)
		if err != nil {
			render.Error(w, err)
			return
		}

		if len(adminUsers) == 1 {
			render.Error(w, errors.New(errors.TypeForbidden, errors.CodeForbidden, "cannot demote the last admin"))
			return
		}
	}

	user.UpdatedAt = time.Now()

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

func (h *handler) LoginPrecheck(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	email := r.URL.Query().Get("email")
	sourceUrl := r.URL.Query().Get("ref")
	orgID := r.URL.Query().Get("orgID")

	resp, err := h.module.LoginPrecheck(ctx, orgID, email, sourceUrl)
	if err != nil {
		render.Error(w, err)
		return
	}

	render.Success(w, http.StatusOK, resp)
}

func (h *handler) GetResetPasswordToken(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	id := mux.Vars(r)["id"]

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(w, err)
		return
	}

	// check if the id lies in the same org as the claims
	_, err = h.module.GetUserByID(ctx, claims.OrgID, id)
	if err != nil {
		render.Error(w, err)
		return
	}

	token, err := h.module.CreateResetPasswordToken(ctx, id)
	if err != nil {
		render.Error(w, err)
		return
	}

	render.Success(w, http.StatusOK, token)
}

func (h *handler) ResetPassword(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	req := new(types.PostableResetPassword)
	if err := json.NewDecoder(r.Body).Decode(req); err != nil {
		render.Error(w, err)
		return
	}

	entry, err := h.module.GetResetPassword(ctx, req.Token)
	if err != nil {
		render.Error(w, err)
		return
	}

	err = h.module.UpdatePasswordAndDeleteResetPasswordEntry(ctx, entry.PasswordID, req.Password)
	if err != nil {
		render.Error(w, err)
		return
	}

	render.Success(w, http.StatusOK, nil)
}

func (h *handler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	var req types.ChangePasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		render.Error(w, err)
		return
	}

	// get the current password
	password, err := h.module.GetPasswordByUserID(ctx, req.UserId)
	if err != nil {
		render.Error(w, err)
		return
	}

	if !types.ComparePassword(password.Password, req.OldPassword) {
		render.Error(w, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "old password is incorrect"))
		return
	}

	err = h.module.UpdatePassword(ctx, req.UserId, req.NewPassword)
	if err != nil {
		render.Error(w, err)
		return
	}

	render.Success(w, http.StatusOK, nil)
}

func (h *handler) Login(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	var req types.PostableLoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		render.Error(w, err)
		return
	}

	if req.RefreshToken == "" {
		_, err := h.module.CanUsePassword(ctx, req.Email)
		if err != nil {
			render.Error(w, err)
			return
		}
	}

	user, err := h.module.GetAuthenticatedUser(ctx, req.OrgID, req.Email, req.Password, req.RefreshToken)
	if err != nil {
		render.Error(w, err)
		return
	}

	jwt, err := h.module.GetJWTForUser(ctx, user)
	if err != nil {
		render.Error(w, err)
		return
	}

	gettableLoginResponse := &types.GettableLoginResponse{
		GettableUserJwt: jwt,
		UserID:          user.ID.String(),
	}

	render.Success(w, http.StatusOK, gettableLoginResponse)
}

func (h *handler) GetCurrentUserFromJWT(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(w, err)
		return
	}

	user, err := h.module.GetUserByID(ctx, claims.OrgID, claims.UserID)
	if err != nil {
		render.Error(w, err)
		return
	}

	render.Success(w, http.StatusOK, user)

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

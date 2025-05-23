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
	"github.com/SigNoz/signoz/pkg/modules/user/impluser"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/gorilla/mux"
)

// EnterpriseHandler embeds the base handler implementation
type Handler struct {
	user.Handler // Embed the base handler interface
	module       user.Module
}

func NewHandler(module user.Module) user.Handler {
	baseHandler := impluser.NewHandler(module)
	return &Handler{
		Handler: baseHandler,
		module:  module,
	}
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	var req types.PostableLoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		render.Error(w, err)
		return
	}

	if req.RefreshToken == "" {
		// the EE handler wrapper passes the feature flag value in context
		ssoAvailable, ok := ctx.Value(types.SSOAvailable).(bool)
		if !ok {
			render.Error(w, errors.New(errors.TypeInternal, errors.CodeInternal, "failed to retrieve SSO availability"))
			return
		}

		if ssoAvailable {
			_, err := h.module.CanUsePassword(ctx, req.Email)
			if err != nil {
				render.Error(w, err)
				return
			}
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

// Override only the methods you need with enterprise-specific implementations
func (h *Handler) LoginPrecheck(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	// assume user is valid unless proven otherwise and assign default values for rest of the fields

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

func (h *Handler) AcceptInvite(w http.ResponseWriter, r *http.Request) {
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

		user, err = h.module.CreateUserWithPassword(ctx, user, password)
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

func (h *Handler) GetInvite(w http.ResponseWriter, r *http.Request) {
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
	return
}

func (h *Handler) CreateAPIKey(w http.ResponseWriter, r *http.Request) {
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

func (h *Handler) ListAPIKeys(w http.ResponseWriter, r *http.Request) {
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

func (h *Handler) UpdateAPIKey(w http.ResponseWriter, r *http.Request) {
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

func (h *Handler) RevokeAPIKey(w http.ResponseWriter, r *http.Request) {
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

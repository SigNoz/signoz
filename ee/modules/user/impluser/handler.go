package impluser

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/modules/user"
	"github.com/SigNoz/signoz/pkg/modules/user/impluser"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/gorilla/mux"
	"go.uber.org/zap"
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

	// the EE handler wrapper passes the feature flag value in context
	ssoAvailable, ok := ctx.Value("ssoAvailable").(bool)
	if !ok {
		zap.L().Error("failed to retrieve ssoAvailable from context")
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

	user, err := h.module.GetAuthenticatedUser(ctx, req.OrgID, req.Email, req.Password, req.RefreshToken)
	if err != nil {
		render.Error(w, err)
		return
	}
	if user == nil {
		render.Error(w, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "invalid email or password"))
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
	if invite == nil {
		render.Error(w, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "invite not found"))
		return
	}

	orgDomain, err := h.module.GetAuthDomainByEmail(ctx, invite.Email)
	if err != nil {
		render.Error(w, err)
		return
	}

	precheckResp := &types.GettableLoginPrecheck{
		SSO:    false,
		IsUser: false,
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
		precheckResp, err = h.module.LoginPrecheck(ctx, invite.OrgID, user.Email, "")
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
	invite, err := h.module.GetInviteByToken(ctx, token)
	if err != nil {
		render.Error(w, err)
		return
	}

	if invite == nil {
		render.Error(w, errors.New(errors.TypeNotFound, errors.CodeNotFound, "user is not invited"))
		return
	}

	// precheck the user
	precheckResp, err := h.module.LoginPrecheck(ctx, invite.OrgID, invite.Email, "")
	if err != nil {
		render.Error(w, err)
		return
	}

	gettableInvite := &types.GettableEEInvite{
		Invite:   *invite,
		PreCheck: precheckResp,
	}

	render.Success(w, http.StatusOK, gettableInvite)
	return
}

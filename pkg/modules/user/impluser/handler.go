package impluser

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"text/template"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/modules/user"
	"github.com/SigNoz/signoz/pkg/query-service/constants"
	"github.com/SigNoz/signoz/pkg/query-service/telemetry"
	smtpservice "github.com/SigNoz/signoz/pkg/query-service/utils/smtpService"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/gorilla/mux"
	"go.uber.org/zap"
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

	// SSO users might not have a password
	if err := req.Validate(); err != nil {
		render.Error(w, err)
		return
	}

	invite, err := h.module.GetInviteByToken(ctx, req.InviteToken)
	if err != nil {
		render.Error(w, err)
		return
	}

	user, err := types.NewUser(invite.Name, invite.Email, invite.Role, invite.OrgID)
	if err != nil {
		render.Error(w, err)
		return
	}

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

	// send telemetry
	h.module.SendUserTelemetry(user, false)

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

	invites, err := h.inviteUsers(ctx, claims, &types.PostableBulkInviteRequest{
		Invites: []types.PostableInvite{req},
	})
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, invites[0])
	return
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

	invites, err := h.inviteUsers(ctx, claims, &req)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, invites)
	return
}

// Helper function to handle individual invites
func (h *handler) inviteUsers(ctx context.Context, claims authtypes.Claims, bulkInvites *types.PostableBulkInviteRequest) ([]*types.Invite, error) {

	invites := make([]*types.Invite, len(bulkInvites.Invites))

	for _, invite := range bulkInvites.Invites {
		// check if user exists
		if user, err := h.module.GetUserByEmailInOrg(ctx, claims.OrgID, invite.Email); err != nil {
			return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to check already existing user")
		} else if user != nil {
			return nil, errors.New(errors.TypeAlreadyExists, errors.CodeAlreadyExists, "User already exists with the same email")
		}

		// Check if an invite already exists
		if invite, err := h.module.GetInviteByEmailInOrg(ctx, claims.OrgID, invite.Email); err != nil {
			return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to check existing invite")
		} else if invite != nil {
			return nil, errors.New(errors.TypeAlreadyExists, errors.CodeAlreadyExists, "An invite already exists for this email")
		}

		role, err := types.NewRole(invite.Role.String())
		if err != nil {
			return nil, err
		}

		newInvite, err := types.NewInvite(claims.OrgID, role.String(), invite.Name, invite.Email)
		if err != nil {
			return nil, err
		}
		newInvite.InviteLink = fmt.Sprintf("%s/signup?token=%s", invite.FrontendBaseUrl, newInvite.Token)
		invites = append(invites, newInvite)
	}

	err := h.module.CreateBulkInvite(ctx, invites)
	if err != nil {
		return nil, err
	}

	// send telemetry event
	for i := 0; i < len(invites); i++ {
		telemetry.GetInstance().SendEvent(telemetry.TELEMETRY_EVENT_USER_INVITATION_SENT, map[string]interface{}{
			"invited user email": invites[i].Email,
		}, claims.Email, true, false)

		// send email if SMTP is enabled
		if os.Getenv("SMTP_ENABLED") == "true" && bulkInvites.Invites[i].FrontendBaseUrl != "" {
			h.inviteEmail(&bulkInvites.Invites[i], claims.Email, claims.Name, invites[i].Token)
		}
	}

	return invites, nil
}

func (h *handler) inviteEmail(req *types.PostableInvite, creatorEmail, creatorName, token string) {
	smtp := smtpservice.GetInstance()
	data := types.InviteEmailData{
		CustomerName: req.Name,
		InviterName:  creatorName,
		InviterEmail: creatorEmail,
		Link:         fmt.Sprintf("%s/signup?token=%s", req.FrontendBaseUrl, token),
	}

	tmpl, err := template.ParseFiles(constants.InviteEmailTemplate)
	if err != nil {
		zap.L().Error("failed to send email", zap.Error(err))
		return
	}

	var body bytes.Buffer
	if err := tmpl.Execute(&body, data); err != nil {
		zap.L().Error("failed to send email", zap.Error(err))
		return
	}

	err = smtp.SendEmail(
		req.Email,
		creatorName+" has invited you to their team in SigNoz",
		body.String(),
	)
	if err != nil {
		zap.L().Error("failed to send email", zap.Error(err))
		return
	}
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

	if invite == nil {
		render.Error(w, errors.New(errors.TypeNotFound, errors.CodeNotFound, "user is not invited"))
		return
	}

	render.Success(w, http.StatusOK, invite)
	return
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

func (h *handler) RegisterOrgAndAdmin(w http.ResponseWriter, r *http.Request) {
	// req := new(types.PostableRegisterOrgAndAdmin)
	// if err := json.NewDecoder(r.Body).Decode(req); err != nil {
	// 	render.Error(w, errors.Wrapf(err, errors.TypeInvalidInput, errors.CodeInvalidInput, "failed to decode user"))
	// 	return
	// }

	// get the count of users from db
	// users := []*types.User{}

	// users, err := dao.DB().GetUsers(ctx)
	// if err != nil {
	// 	return nil, model.InternalError(fmt.Errorf("failed to get user count"))
	// }

	// switch len(users) {
	// case 0:
	// 	user, err := h.CreateFirstUser(ctx, req, organizationModule)
	// 	if err != nil {
	// 		return nil, err
	// 	}

	// 	if err := alertmanager.SetDefaultConfig(ctx, user.OrgID); err != nil {
	// 		return nil, model.InternalError(err)
	// 	}

	// 	return user, nil
	// default:
	// 	return RegisterInvitedUser(ctx, req, false)
	// }

	// if !aH.SetupCompleted {
	// 	// since the first user is now created, we can disable self-registration as
	// 	// from here onwards, we expect admin (owner) to invite other users.
	// 	aH.SetupCompleted = true
	// }

	render.Success(w, http.StatusOK, nil)
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

	// only HName and ProfilePictureURL can be updated
	if user.HName == "" {
		user.HName = existingUser.HName
	}

	if user.ProfilePictureURL == "" {
		user.ProfilePictureURL = existingUser.ProfilePictureURL
	}
	user.UpdatedAt = time.Now()

	updatedUser, err := h.module.UpdateUser(ctx, claims.OrgID, id, &user)
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

	if err := h.module.DeleteUser(ctx, claims.OrgID, id); err != nil {
		render.Error(w, err)
		return
	}

	render.Success(w, http.StatusNoContent, nil)
}

type PrecheckResponse struct {
	SSO             bool     `json:"sso"`
	SsoUrl          string   `json:"ssoUrl"`
	CanSelfRegister bool     `json:"canSelfRegister"`
	IsUser          bool     `json:"isUser"`
	SsoError        string   `json:"ssoError"`
	SelectOrg       bool     `json:"selectOrg"`
	Orgs            []string `json:"orgs"`
}

func (h *handler) LoginPrecheck(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	email := r.URL.Query().Get("email")
	_ = r.URL.Query().Get("ref")

	// assume user is valid unless proven otherwise and assign default values for rest of the fields
	resp := &PrecheckResponse{IsUser: true, CanSelfRegister: false, SSO: false, SsoUrl: "", SsoError: ""}

	// check if email is a valid user
	userPayload, baseApiErr := h.module.GetUsersByEmail(ctx, email)
	if baseApiErr != nil {
		render.Error(w, baseApiErr)
		return
	}

	if userPayload == nil {
		resp.IsUser = false
	}

	if len(userPayload) > 1 {
		resp.SelectOrg = true
		resp.Orgs = make([]string, len(userPayload))
		for i, user := range userPayload {
			resp.Orgs[i] = user.OrgID
		}
	}

	render.Success(w, http.StatusOK, resp)
}

func (h *handler) GetResetPasswordToken(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	id := r.URL.Query().Get("id")

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

	entry, err := h.module.GetFactorResetPassword(ctx, req.Token)
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

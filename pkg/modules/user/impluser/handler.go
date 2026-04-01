package impluser

import (
	"context"
	"encoding/json"
	"net/http"
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
	setter root.Setter
	getter root.Getter
}

func NewHandler(setter root.Setter, getter root.Getter) root.Handler {
	return &handler{setter: setter, getter: getter}
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

	invites, err := h.setter.CreateBulkInvite(ctx, valuer.MustNewUUID(claims.OrgID), valuer.MustNewUUID(claims.IdentityID()), valuer.MustNewEmail(claims.Email), &types.PostableBulkInviteRequest{
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

	_, err = h.setter.CreateBulkInvite(ctx, valuer.MustNewUUID(claims.OrgID), valuer.MustNewUUID(claims.IdentityID()), valuer.MustNewEmail(claims.Email), &req)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusCreated, nil)
}

func (h *handler) GetUserDeprecated(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	id := mux.Vars(r)["id"]

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(w, err)
		return
	}

	user, err := h.getter.GetDeprecatedUserByOrgIDAndID(ctx, valuer.MustNewUUID(claims.OrgID), valuer.MustNewUUID(id))
	if err != nil {
		render.Error(w, err)
		return
	}

	render.Success(w, http.StatusOK, user)
}

func (h *handler) GetUser(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	userID := mux.Vars(r)["id"]

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(w, err)
		return
	}

	user, err := h.getter.GetUserByOrgIDAndID(ctx, valuer.MustNewUUID(claims.OrgID), valuer.MustNewUUID(userID))
	if err != nil {
		render.Error(w, err)
		return
	}

	userRoles, err := h.getter.GetRolesByUserID(ctx, user.ID)
	if err != nil {
		render.Error(w, err)
		return
	}

	userWithRoles := &authtypes.UserWithRoles{
		User:      user,
		UserRoles: userRoles,
	}

	render.Success(w, http.StatusOK, userWithRoles)
}

func (h *handler) GetMyUserDeprecated(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(w, err)
		return
	}

	user, err := h.getter.GetDeprecatedUserByOrgIDAndID(ctx, valuer.MustNewUUID(claims.OrgID), valuer.MustNewUUID(claims.UserID))
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

	user, err := h.getter.GetUserByOrgIDAndID(ctx, valuer.MustNewUUID(claims.OrgID), valuer.MustNewUUID(claims.UserID))
	if err != nil {
		render.Error(w, err)
		return
	}

	userRoles, err := h.getter.GetRolesByUserID(ctx, user.ID)
	if err != nil {
		render.Error(w, err)
		return
	}

	userWithRoles := &authtypes.UserWithRoles{
		User:      user,
		UserRoles: userRoles,
	}

	render.Success(w, http.StatusOK, userWithRoles)
}

func (h *handler) UpdateMyUser(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(w, err)
		return
	}

	updatableUser := new(types.UpdatableUser)
	if err := json.NewDecoder(r.Body).Decode(&updatableUser); err != nil {
		render.Error(w, err)
		return
	}

	_, err = h.setter.UpdateUser(ctx, valuer.MustNewUUID(claims.OrgID), valuer.MustNewUUID(claims.UserID), updatableUser)
	if err != nil {
		render.Error(w, err)
		return
	}

	render.Success(w, http.StatusNoContent, nil)
}

func (h *handler) ListUsersDeprecated(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(w, err)
		return
	}

	users, err := h.getter.ListDeprecatedUsersByOrgID(ctx, valuer.MustNewUUID(claims.OrgID))
	if err != nil {
		render.Error(w, err)
		return
	}

	render.Success(w, http.StatusOK, users)
}

func (h *handler) ListUsers(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(w, err)
		return
	}

	users, err := h.getter.ListUsersByOrgID(ctx, valuer.MustNewUUID(claims.OrgID))
	if err != nil {
		render.Error(w, err)
		return
	}

	render.Success(w, http.StatusOK, users)
}

func (h *handler) UpdateUserDeprecated(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	id := mux.Vars(r)["id"]

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(w, err)
		return
	}

	user := types.DeprecatedUser{User: &types.User{}}
	if err := json.NewDecoder(r.Body).Decode(&user); err != nil {
		render.Error(w, err)
		return
	}

	updatedUser, err := h.setter.UpdateUserDeprecated(ctx, valuer.MustNewUUID(claims.OrgID), id, &user)
	if err != nil {
		render.Error(w, err)
		return
	}

	render.Success(w, http.StatusOK, updatedUser)
}

func (h *handler) UpdateUser(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	userID := mux.Vars(r)["id"]

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(w, err)
		return
	}

	if userID == claims.UserID {
		render.Error(w, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "users cannot call this api on self"))
		return
	}

	updatableUser := new(types.UpdatableUser)
	if err := json.NewDecoder(r.Body).Decode(&updatableUser); err != nil {
		render.Error(w, err)
		return
	}

	_, err = h.setter.UpdateUser(ctx, valuer.MustNewUUID(claims.OrgID), valuer.MustNewUUID(userID), updatableUser)
	if err != nil {
		render.Error(w, err)
		return
	}

	render.Success(w, http.StatusNoContent, nil)
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

	if err := h.setter.DeleteUser(ctx, valuer.MustNewUUID(claims.OrgID), id, claims.IdentityID()); err != nil {
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

	user, err := handler.getter.GetDeprecatedUserByOrgIDAndID(ctx, valuer.MustNewUUID(claims.OrgID), valuer.MustNewUUID(id))
	if err != nil {
		render.Error(w, err)
		return
	}

	token, err := handler.setter.GetOrCreateResetPasswordToken(ctx, user.ID)
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

	err := handler.setter.UpdatePasswordByResetPasswordToken(ctx, req.Token, req.Password)
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

	err := handler.setter.UpdatePassword(ctx, req.UserID, req.OldPassword, req.NewPassword)
	if err != nil {
		render.Error(w, err)
		return
	}

	render.Success(w, http.StatusNoContent, nil)
}

func (h *handler) ForgotPassword(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	req := new(types.PostableForgotPassword)
	if err := binding.JSON.BindBody(r.Body, req); err != nil {
		render.Error(w, err)
		return
	}

	err := h.setter.ForgotPassword(ctx, req.OrgID, req.Email, req.FrontendBaseURL)
	if err != nil {
		render.Error(w, err)
		return
	}

	render.Success(w, http.StatusNoContent, nil)
}

func (h *handler) GetRolesByUserID(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	userID := mux.Vars(r)["id"]

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(w, err)
		return
	}

	user, err := h.getter.GetUserByOrgIDAndID(ctx, valuer.MustNewUUID(claims.OrgID), valuer.MustNewUUID(userID))
	if err != nil {
		render.Error(w, err)
		return
	}

	userRoles, err := h.getter.GetRolesByUserID(ctx, user.ID)
	if err != nil {
		render.Error(w, err)
		return
	}

	roles := make([]*authtypes.Role, len(userRoles))
	for idx, userRole := range userRoles {
		roles[idx] = authtypes.NewRoleFromStorableRole(userRole.Role)
	}

	render.Success(w, http.StatusOK, roles)
}

func (h *handler) SetRoleByUserID(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	userID := mux.Vars(r)["id"]

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(w, err)
		return
	}

	if userID == claims.UserID {
		render.Error(w, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "users cannot call this api on self"))
		return
	}

	postableRole := new(types.PostableRole)
	if err := json.NewDecoder(r.Body).Decode(postableRole); err != nil {
		render.Error(w, err)
		return
	}

	if postableRole.Name == "" {
		render.Error(w, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "role name is required"))
		return
	}

	if err := h.setter.AddUserRole(ctx, valuer.MustNewUUID(claims.OrgID), valuer.MustNewUUID(userID), postableRole.Name); err != nil {
		render.Error(w, err)
		return
	}

	render.Success(w, http.StatusOK, nil)
}

func (h *handler) RemoveUserRoleByRoleID(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	userID := mux.Vars(r)["id"]
	roleID := mux.Vars(r)["roleId"]

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(w, err)
		return
	}

	if userID == claims.UserID {
		render.Error(w, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "users cannot call this api on self"))
		return
	}

	if err := h.setter.RemoveUserRole(ctx, valuer.MustNewUUID(claims.OrgID), valuer.MustNewUUID(userID), valuer.MustNewUUID(roleID)); err != nil {
		render.Error(w, err)
		return
	}

	render.Success(w, http.StatusNoContent, nil)
}

func (h *handler) GetUsersByRoleID(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	roleID := mux.Vars(r)["id"]

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(w, err)
		return
	}

	users, err := h.getter.GetUsersByOrgIDAndRoleID(ctx, valuer.MustNewUUID(claims.OrgID), valuer.MustNewUUID(roleID))
	if err != nil {
		render.Error(w, err)
		return
	}

	render.Success(w, http.StatusOK, users)
}

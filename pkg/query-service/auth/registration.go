package auth

import (
	"context"
	"time"

	"github.com/pkg/errors"
	"go.signoz.io/query-service/constants"
	"go.signoz.io/query-service/dao"
	"go.signoz.io/query-service/model"
	"go.uber.org/zap"
)

const (
	opaqueTokenSize = 16
)

// The root user should be able to invite people to create account on SigNoz cluster.
func Invite(ctx context.Context, req *model.InviteRequest) (*model.InviteResponse, error) {
	token, err := randomHex(opaqueTokenSize)
	if err != nil {
		return nil, errors.Wrap(err, "failed to generate invite token")
	}

	user, apiErr := dao.DB().GetUserByEmail(ctx, req.Email)
	if apiErr != nil {
		return nil, errors.Wrap(apiErr.Err, "Failed to check already existing user")
	}

	if user != nil {
		return nil, errors.New("User already exists with the same email")
	}

	if err := validateInviteRequest(req); err != nil {
		return nil, errors.Wrap(err, "invalid invite request")
	}

	inv := &model.Invitation{
		Name:      req.Name,
		Email:     req.Email,
		Token:     token,
		CreatedAt: time.Now().Unix(),
		Role:      req.Role,
	}

	zap.S().Debugf("Creating invite: %+v\n", inv)

	if err := dao.DB().CreateInviteEntry(ctx, inv); err != nil {
		return nil, errors.Wrap(err.Err, "failed to write to DB")
	}

	return &model.InviteResponse{Email: inv.Email, InviteToken: inv.Token}, nil
}

func RevokeInvite(ctx context.Context, email string) error {
	if !isValidEmail(email) {
		return ErrorInvalidInviteToken
	}

	if err := dao.DB().DeleteInvitation(ctx, email); err != nil {
		return errors.Wrap(err.Err, "failed to write to DB")
	}
	return nil
}

func GetInvite(ctx context.Context, token string) (*model.Invitation, error) {

	inv, apiErr := dao.DB().GetInviteFromToken(ctx, token)
	if apiErr != nil {
		return nil, errors.Wrap(apiErr.Err, "failed to query the DB")
	}
	return inv, nil
}

func validateInvite(ctx context.Context, req *RegisterRequest) (*model.Invitation, error) {
	invitation, err := dao.DB().GetInviteFromEmail(ctx, req.Email)
	if err != nil {
		return nil, errors.Wrap(err.Err, "Failed to read from DB")
	}

	if invitation == nil || invitation.Token != req.InviteToken {
		return nil, ErrorInvalidInviteToken
	}

	return invitation, nil
}

func CreateResetPasswordToken(ctx context.Context, userId string) (*model.ResetPasswordEntry, error) {
	token, err := randomHex(opaqueTokenSize)
	if err != nil {
		return nil, errors.Wrap(err, "failed to generate reset password token")
	}

	req := &model.ResetPasswordEntry{
		UserId: userId,
		Token:  token,
	}
	if apiErr := dao.DB().CreateResetPasswordEntry(ctx, req); err != nil {
		return nil, errors.Wrap(apiErr.Err, "failed to write to DB")
	}
	return req, nil
}

func ResetPassword(ctx context.Context, req *model.ResetPasswordRequest) error {
	entry, apiErr := dao.DB().GetResetPasswordEntry(ctx, req.Token)
	if apiErr != nil {
		return errors.Wrap(apiErr.Err, "failed to query the DB")
	}

	if entry == nil {
		return errors.New("Invalid reset password request")
	}

	hash, err := passwordHash(req.Password)
	if err != nil {
		return errors.Wrap(err, "Failed to generate password hash")
	}

	if apiErr := dao.DB().UpdateUserPassword(ctx, hash, entry.UserId); apiErr != nil {
		return apiErr.Err
	}

	if apiErr := dao.DB().DeleteResetPasswordEntry(ctx, req.Token); apiErr != nil {
		return errors.Wrap(apiErr.Err, "failed to delete reset token from DB")
	}

	return nil
}

func ChangePassword(ctx context.Context, req *model.ChangePasswordRequest) error {

	user, apiErr := dao.DB().GetUser(ctx, req.UserId)
	if apiErr != nil {
		return errors.Wrap(apiErr.Err, "failed to query user from the DB")
	}

	if user == nil || !passwordMatch(user.Password, req.OldPassword) {
		return ErrorInvalidCreds
	}

	hash, err := passwordHash(req.NewPassword)
	if err != nil {
		return errors.Wrap(err, "Failed to generate password hash")
	}

	if apiErr := dao.DB().UpdateUserPassword(ctx, hash, user.Id); apiErr != nil {
		return apiErr.Err
	}

	return nil
}

type RegisterRequest struct {
	Name        string `json:"name"`
	OrgName     string `json:"orgName"`
	Email       string `json:"email"`
	Password    string `json:"password"`
	InviteToken string `json:"token"`
}

// Register registers a new user. For the first register request, it doesn't need an invite token
// and also the first registration is an enforced ADMIN registration. Every subsequent request will
// need an invite token to go through.
func Register(ctx context.Context, req *RegisterRequest) *model.ApiError {

	// TODO(Ahsan): We should optimize it, shouldn't make an extra DB call everytime to know if
	// this is the first register request.
	users, apiErr := dao.DB().GetUsers(ctx)
	if apiErr != nil {
		return apiErr
	}

	var group, orgId string

	// If there are no user, then this first user is granted Admin role. Also, an org is created
	// based on the request. Any other user can't use any other org name, if they do then
	// registration will fail because of foreign key violation while create user.
	// TODO(Ahsan): We need to re-work this logic for the case of multi-tenant system.
	if len(users) == 0 {
		org, apiErr := dao.DB().CreateOrg(ctx, &model.Organization{Name: req.OrgName})
		if apiErr != nil {
			return apiErr
		}
		group = constants.AdminGroup
		orgId = org.Id
	}

	if len(users) > 0 {
		inv, err := validateInvite(ctx, req)
		if err != nil {
			return &model.ApiError{Err: err, Typ: model.ErrorUnauthorized}
		}
		org, apiErr := dao.DB().GetOrgByName(ctx, req.OrgName)
		if apiErr != nil {
			return apiErr
		}

		group = inv.Role
		if org != nil {
			orgId = org.Id
		}
	}

	user := &model.User{
		Name:      req.Name,
		OrgId:     orgId,
		Email:     req.Email,
		CreatedAt: time.Now().Unix(),
	}

	hash, err := passwordHash(req.Password)
	if err != nil {
		return &model.ApiError{Err: err, Typ: model.ErrorUnauthorized}
	}
	user.Password = hash
	userCreated, apiErr := dao.DB().CreateUserWithRole(ctx, user, group)
	if apiErr != nil {
		return apiErr
	}

	userGroup, apiErr := dao.DB().GetGroupByName(ctx, group)
	if apiErr != nil {
		return apiErr
	}

	AuthCacheObj.AddGroupUser(&model.GroupUser{UserId: userCreated.Id, GroupId: userGroup.Id})
	return dao.DB().DeleteInvitation(ctx, user.Email)
}

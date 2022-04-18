package auth

import (
	"context"
	"time"

	"github.com/pkg/errors"
	"go.signoz.io/query-service/constants"
	"go.signoz.io/query-service/dao"
	"go.signoz.io/query-service/model"
)

const (
	inviteTokenSize = 16
)

// The root user should be able to invite people to create account on SigNoz cluster.
func Invite(ctx context.Context, req *model.InviteRequest) (*model.InviteResponse, error) {
	token, err := randomHex(inviteTokenSize)
	if err != nil {
		return nil, errors.Wrap(err, "failed to generate invite token")
	}

	if err := validateInviteRequest(req); err != nil {
		return nil, errors.Wrap(err, "invalid invite request")
	}

	inv := &model.Invitation{
		Email:     req.Email,
		Token:     token,
		CreatedAt: time.Now().Unix(),
		Role:      req.Role,
	}

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

type RegisterRequest struct {
	Name             string `json:"name"`
	OrganizationName string `json:"orgName"`
	Email            string `json:"email"`
	Password         string `json:"password"`
	InviteToken      string `json:"token"`
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

	user := &model.User{
		Name:             req.Name,
		OrganizationName: req.OrganizationName,
		Email:            req.Email,
		CreatedAt:        time.Now().Unix(),
	}

	var group string
	if len(users) == 0 {
		group = constants.AdminGroup
	}

	if len(users) > 0 {
		inv, err := validateInvite(ctx, req)
		if err != nil {
			return &model.ApiError{
				Err: err,
				Typ: model.ErrorUnauthorized,
			}
		}
		switch inv.Role {
		case constants.ROLE_ADMIN:
			group = constants.AdminGroup
		case constants.ROLE_EDITOR:
			group = constants.EditorGroup
		case constants.ROLE_VIEWER:
			group = constants.ViewerGroup
		default:
			return &model.ApiError{Typ: model.ErrorInternal, Err: errors.New("Unknown role")}
		}
	}

	hash, err := passwordHash(req.Password)
	if err != nil {
		return &model.ApiError{
			Err: err,
			Typ: model.ErrorUnauthorized,
		}
	}
	user.Password = hash
	_, apiErr = dao.DB().CreateUserWithRole(ctx, user, group)

	return apiErr
}

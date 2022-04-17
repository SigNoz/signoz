package auth

import (
	"context"
	"time"

	"github.com/pkg/errors"
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
		CreatedAt: int(time.Now().Unix()),
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

func validateInvite(ctx context.Context, req *RegisterRequest) error {
	invitation, err := dao.DB().GetInviteFromEmail(ctx, req.Email)
	if err != nil {
		return errors.Wrap(err.Err, "Failed to read from DB")
	}

	if invitation == nil || invitation.Token != req.InviteToken {
		return ErrorInvalidInviteToken
	}

	return nil
}

type RegisterRequest struct {
	Name             string `json:"name"`
	OrganizationName string `json:"orgName"`
	Email            string `json:"email"`
	Password         string `json:"password"`
	InviteToken      string `json:"token"`
}

func Register(ctx context.Context, req *RegisterRequest) *model.ApiError {
	if err := validateInvite(ctx, req); err != nil {
		return &model.ApiError{
			Err: err,
			Typ: model.ErrorUnauthorized,
		}
	}

	hash, err := passwordHash(req.Password)
	if err != nil {
		return &model.ApiError{
			Err: err,
			Typ: model.ErrorUnauthorized,
		}
	}
	_, apiErr := dao.DB().CreateUser(ctx, &model.User{
		Name:             req.Name,
		OrganizationName: req.OrganizationName,
		Email:            req.Email,
		Password:         hash,
	})

	return apiErr
}

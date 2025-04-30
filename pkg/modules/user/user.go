package user

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Module interface {
	// invite
	CreateBulkInvite(ctx context.Context, invites []*types.Invite) error
	ListInvite(ctx context.Context, orgID string) ([]*types.Invite, error)
	DeleteInvite(ctx context.Context, orgID string, id valuer.UUID) error
	GetInviteByToken(ctx context.Context, token string) (*types.Invite, error)
	GetInviteByEmailInOrg(ctx context.Context, orgID string, email string) (*types.Invite, error)

	// user
	CreateUserWithPassword(ctx context.Context, user *types.User, password *types.FactorPassword) (*types.User, error)
	GetUserByID(ctx context.Context, orgID string, id string) (*types.User, error)
	ListUsers(ctx context.Context, orgID string) ([]*types.User, error)
	UpdateUser(ctx context.Context, orgID string, id string, user *types.User) (*types.User, error)
	DeleteUser(ctx context.Context, orgID string, id string) error

	GetUsersByEmail(ctx context.Context, email string) ([]*types.User, error) // public function

	CreateResetPasswordToken(ctx context.Context, userID string) (*types.FactorResetPasswordRequest, error)
	GetPasswordByUserID(ctx context.Context, id string) (*types.FactorPassword, error)
}

type Handler interface {
	// invite
	CreateInvite(http.ResponseWriter, *http.Request)
	AcceptInvite(http.ResponseWriter, *http.Request)
	GetInvite(http.ResponseWriter, *http.Request) // public function
	ListInvite(http.ResponseWriter, *http.Request)
	DeleteInvite(http.ResponseWriter, *http.Request)
	CreateBulkInvite(http.ResponseWriter, *http.Request)

	// this is for the first user registration with org
	RegisterOrgAndAdmin(http.ResponseWriter, *http.Request)
	GetUser(http.ResponseWriter, *http.Request)
	ListUsers(http.ResponseWriter, *http.Request)
	UpdateUser(http.ResponseWriter, *http.Request)
	DeleteUser(http.ResponseWriter, *http.Request)

	// Login
	LoginPrecheck(http.ResponseWriter, *http.Request)
	GetResetPasswordToken(http.ResponseWriter, *http.Request)
	ResetPassword(http.ResponseWriter, *http.Request)
}

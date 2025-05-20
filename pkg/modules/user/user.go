package user

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Module interface {
	// invite
	CreateBulkInvite(ctx context.Context, orgID, userID string, bulkInvites *types.PostableBulkInviteRequest) ([]*types.Invite, error)
	ListInvite(ctx context.Context, orgID string) ([]*types.Invite, error)
	DeleteInvite(ctx context.Context, orgID string, id valuer.UUID) error
	GetInviteByToken(ctx context.Context, token string) (*types.GettableInvite, error)
	GetInviteByEmailInOrg(ctx context.Context, orgID string, email string) (*types.Invite, error)

	// user
	CreateUserWithPassword(ctx context.Context, user *types.User, password *types.FactorPassword) (*types.User, error)
	CreateUser(ctx context.Context, user *types.User) error
	GetUserByID(ctx context.Context, orgID string, id string) (*types.GettableUser, error)
	GetUsersByEmail(ctx context.Context, email string) ([]*types.GettableUser, error) // public function
	GetUserByEmailInOrg(ctx context.Context, orgID string, email string) (*types.GettableUser, error)
	GetUsersByRoleInOrg(ctx context.Context, orgID string, role types.Role) ([]*types.GettableUser, error)
	ListUsers(ctx context.Context, orgID string) ([]*types.GettableUser, error)
	UpdateUser(ctx context.Context, orgID string, id string, user *types.User) (*types.User, error)
	DeleteUser(ctx context.Context, orgID string, id string) error

	// login
	GetAuthenticatedUser(ctx context.Context, orgID, email, password, refreshToken string) (*types.User, error)
	GetJWTForUser(ctx context.Context, user *types.User) (types.GettableUserJwt, error)
	CreateUserForSAMLRequest(ctx context.Context, email string) (*types.User, error)
	LoginPrecheck(ctx context.Context, orgID, email, sourceUrl string) (*types.GettableLoginPrecheck, error)

	// sso
	PrepareSsoRedirect(ctx context.Context, redirectUri, email string, jwt *authtypes.JWT) (string, error)
	CanUsePassword(ctx context.Context, email string) (bool, error)

	// password
	CreateResetPasswordToken(ctx context.Context, userID string) (*types.ResetPasswordRequest, error)
	GetPasswordByUserID(ctx context.Context, id string) (*types.FactorPassword, error)
	GetResetPassword(ctx context.Context, token string) (*types.ResetPasswordRequest, error)
	UpdatePassword(ctx context.Context, userID string, password string) error
	UpdatePasswordAndDeleteResetPasswordEntry(ctx context.Context, passwordID string, password string) error

	// Auth Domain
	GetAuthDomainByEmail(ctx context.Context, email string) (*types.GettableOrgDomain, error)

	// API KEY
	CreateAPIKey(ctx context.Context, apiKey *types.StorableAPIKey) error
	UpdateAPIKey(ctx context.Context, id valuer.UUID, apiKey *types.StorableAPIKey, updaterID valuer.UUID) error
	ListAPIKeys(ctx context.Context, orgID valuer.UUID) ([]*types.StorableAPIKeyUser, error)
	RevokeAPIKey(ctx context.Context, id, removedByUserID valuer.UUID) error
	GetAPIKey(ctx context.Context, orgID valuer.UUID, id valuer.UUID) (*types.StorableAPIKeyUser, error)
}

type Handler interface {
	// invite
	CreateInvite(http.ResponseWriter, *http.Request)
	AcceptInvite(http.ResponseWriter, *http.Request)
	GetInvite(http.ResponseWriter, *http.Request) // public function
	ListInvite(http.ResponseWriter, *http.Request)
	DeleteInvite(http.ResponseWriter, *http.Request)
	CreateBulkInvite(http.ResponseWriter, *http.Request)

	GetUser(http.ResponseWriter, *http.Request)
	GetCurrentUserFromJWT(http.ResponseWriter, *http.Request)
	ListUsers(http.ResponseWriter, *http.Request)
	UpdateUser(http.ResponseWriter, *http.Request)
	DeleteUser(http.ResponseWriter, *http.Request)

	// Login
	LoginPrecheck(http.ResponseWriter, *http.Request)
	Login(http.ResponseWriter, *http.Request)

	// Reset Password
	GetResetPasswordToken(http.ResponseWriter, *http.Request)
	ResetPassword(http.ResponseWriter, *http.Request)
	ChangePassword(http.ResponseWriter, *http.Request)

	// API KEY
	CreateAPIKey(http.ResponseWriter, *http.Request)
	ListAPIKeys(http.ResponseWriter, *http.Request)
	UpdateAPIKey(http.ResponseWriter, *http.Request)
	RevokeAPIKey(http.ResponseWriter, *http.Request)
}

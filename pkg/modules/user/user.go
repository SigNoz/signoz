package user

import (
	"context"
	"net/http"
	"net/url"

	"github.com/SigNoz/signoz/pkg/statsreporter"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/google/uuid"
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
	UpdateUser(ctx context.Context, orgID string, id string, user *types.User, updatedBy string) (*types.User, error)
	DeleteUser(ctx context.Context, orgID string, id string, deletedBy string) error

	// login
	GetAuthenticatedUser(ctx context.Context, orgID, email, password, refreshToken string) (*types.User, error)
	GetJWTForUser(ctx context.Context, user *types.User) (types.GettableUserJwt, error)
	CreateUserForSAMLRequest(ctx context.Context, email string) (*types.User, error)
	LoginPrecheck(ctx context.Context, orgID, email, sourceUrl string) (*types.GettableLoginPrecheck, error)

	// sso
	PrepareSsoRedirect(ctx context.Context, redirectUri, email string) (string, error)
	CanUsePassword(ctx context.Context, email string) (bool, error)

	// password
	CreateResetPasswordToken(ctx context.Context, userID string) (*types.ResetPasswordRequest, error)
	GetPasswordByUserID(ctx context.Context, id string) (*types.FactorPassword, error)
	GetResetPassword(ctx context.Context, token string) (*types.ResetPasswordRequest, error)
	UpdatePassword(ctx context.Context, userID string, password string) error
	UpdatePasswordAndDeleteResetPasswordEntry(ctx context.Context, passwordID string, password string) error

	// Auth Domain
	GetAuthDomainByEmail(ctx context.Context, email string) (*types.GettableOrgDomain, error)
	GetDomainFromSsoResponse(ctx context.Context, url *url.URL) (*types.GettableOrgDomain, error)

	ListDomains(ctx context.Context, orgID valuer.UUID) ([]*types.GettableOrgDomain, error)
	CreateDomain(ctx context.Context, domain *types.GettableOrgDomain) error
	UpdateDomain(ctx context.Context, domain *types.GettableOrgDomain) error
	DeleteDomain(ctx context.Context, id uuid.UUID) error

	// API KEY
	CreateAPIKey(ctx context.Context, apiKey *types.StorableAPIKey) error
	UpdateAPIKey(ctx context.Context, id valuer.UUID, apiKey *types.StorableAPIKey, updaterID valuer.UUID) error
	ListAPIKeys(ctx context.Context, orgID valuer.UUID) ([]*types.StorableAPIKeyUser, error)
	RevokeAPIKey(ctx context.Context, id, removedByUserID valuer.UUID) error
	GetAPIKey(ctx context.Context, orgID valuer.UUID, id valuer.UUID) (*types.StorableAPIKeyUser, error)

	// Register
	Register(ctx context.Context, req *types.PostableRegisterOrgAndAdmin) (*types.User, error)

	statsreporter.StatsCollector
}

type Getter interface {
	// Get gets the users based on the given id
	ListByOrgID(context.Context, valuer.UUID) ([]*types.User, error)
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

	ListDomains(http.ResponseWriter, *http.Request)
	CreateDomain(http.ResponseWriter, *http.Request)
	UpdateDomain(http.ResponseWriter, *http.Request)
	DeleteDomain(http.ResponseWriter, *http.Request)
}

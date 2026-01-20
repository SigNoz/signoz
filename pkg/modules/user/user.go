package user

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/statsreporter"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Module interface {
	// Creates the organization and the first user of that organization.
	CreateFirstUser(ctx context.Context, organization *types.Organization, name string, email valuer.Email, password string) (*types.User, error)

	// Creates a user and sends an analytics event.
	CreateUser(ctx context.Context, user *types.User, opts ...CreateUserOption) error

	// Get or create a user. If a user with the same email and orgID already exists, it returns the existing user.
	GetOrCreateUser(ctx context.Context, user *types.User, opts ...CreateUserOption) (*types.User, error)

	// Get or Create a reset password token for a user. If the password does not exist, a new one is randomly generated and inserted. The function
	// is idempotent and can be called multiple times.
	GetOrCreateResetPasswordToken(ctx context.Context, userID valuer.UUID) (*types.ResetPasswordToken, error)

	// Updates password of a user using a reset password token. It also deletes all reset password tokens for the user.
	// This is used to reset the password of a user when they forget their password.
	UpdatePasswordByResetPasswordToken(ctx context.Context, token string, password string) error

	// Updates password of user to the new password. It also deletes all reset password tokens for the user.
	UpdatePassword(ctx context.Context, userID valuer.UUID, oldPassword string, password string) error

	UpdateUser(ctx context.Context, orgID valuer.UUID, id string, user *types.User, updatedBy string) (*types.User, error)
	DeleteUser(ctx context.Context, orgID valuer.UUID, id string, deletedBy string) error

	// invite
	CreateBulkInvite(ctx context.Context, orgID valuer.UUID, userID valuer.UUID, bulkInvites *types.PostableBulkInviteRequest) ([]*types.Invite, error)
	ListInvite(ctx context.Context, orgID string) ([]*types.Invite, error)
	DeleteInvite(ctx context.Context, orgID string, id valuer.UUID) error
	AcceptInvite(ctx context.Context, token string, password string) (*types.User, error)
	GetInviteByToken(ctx context.Context, token string) (*types.Invite, error)

	// API KEY
	CreateAPIKey(ctx context.Context, apiKey *types.StorableAPIKey) error
	UpdateAPIKey(ctx context.Context, id valuer.UUID, apiKey *types.StorableAPIKey, updaterID valuer.UUID) error
	ListAPIKeys(ctx context.Context, orgID valuer.UUID) ([]*types.StorableAPIKeyUser, error)
	RevokeAPIKey(ctx context.Context, id, removedByUserID valuer.UUID) error
	GetAPIKey(ctx context.Context, orgID valuer.UUID, id valuer.UUID) (*types.StorableAPIKeyUser, error)

	statsreporter.StatsCollector
}

type Getter interface {
	// Get gets the users based on the given id
	ListByOrgID(context.Context, valuer.UUID) ([]*types.User, error)

	// Get users by email.
	GetUsersByEmail(context.Context, valuer.Email) ([]*types.User, error)

	// Get user by orgID and id.
	GetByOrgIDAndID(context.Context, valuer.UUID, valuer.UUID) (*types.User, error)

	// Get user by id.
	Get(context.Context, valuer.UUID) (*types.User, error)

	// List users by email and org ids.
	ListUsersByEmailAndOrgIDs(context.Context, valuer.Email, []valuer.UUID) ([]*types.User, error)

	// Count users by org id.
	CountByOrgID(context.Context, valuer.UUID) (int64, error)

	// Get factor password by user id.
	GetFactorPasswordByUserID(context.Context, valuer.UUID) (*types.FactorPassword, error)
}

type Handler interface {
	// invite
	CreateInvite(http.ResponseWriter, *http.Request)
	AcceptInvite(http.ResponseWriter, *http.Request)
	GetInvite(http.ResponseWriter, *http.Request) // public function
	ListInvite(http.ResponseWriter, *http.Request)
	DeleteInvite(http.ResponseWriter, *http.Request)
	CreateBulkInvite(http.ResponseWriter, *http.Request)

	ListUsers(http.ResponseWriter, *http.Request)
	UpdateUser(http.ResponseWriter, *http.Request)
	DeleteUser(http.ResponseWriter, *http.Request)
	GetUser(http.ResponseWriter, *http.Request)
	GetMyUser(http.ResponseWriter, *http.Request)

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

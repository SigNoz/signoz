package user

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/statsreporter"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Setter interface {
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

	// Initiate forgot password flow for a user
	ForgotPassword(ctx context.Context, orgID valuer.UUID, email valuer.Email, frontendBaseURL string) error

	UpdateUserDeprecated(ctx context.Context, orgID valuer.UUID, id string, user *types.DeprecatedUser, updatedBy string) (*types.DeprecatedUser, error)
	UpdateMyUser(ctx context.Context, orgID valuer.UUID, userID valuer.UUID, updatable *types.UpdatableSelfUser) (*types.User, error)
	UpdateUser(ctx context.Context, orgID valuer.UUID, userID valuer.UUID, updatable *types.UpdatableUser, updatedBy valuer.UUID) (*types.User, error)

	// UpdateAnyUser updates a user and persists the changes to the database along with the analytics and identity deletion.
	UpdateAnyUserDeprecated(ctx context.Context, orgID valuer.UUID, deprecateUser *types.DeprecatedUser) error
	UpdateAnyUser(ctx context.Context, orgID valuer.UUID, user *types.User) error
	DeleteUser(ctx context.Context, orgID valuer.UUID, id string, deletedBy string) error

	// invite
	CreateBulkInvite(ctx context.Context, orgID valuer.UUID, userID valuer.UUID, bulkInvites *types.PostableBulkInviteRequest) ([]*types.Invite, error)

	// API KEY
	CreateAPIKey(ctx context.Context, apiKey *types.StorableAPIKey) error
	UpdateAPIKey(ctx context.Context, id valuer.UUID, apiKey *types.StorableAPIKey, updaterID valuer.UUID) error
	ListAPIKeys(ctx context.Context, orgID valuer.UUID) ([]*types.StorableAPIKeyUser, error)
	RevokeAPIKey(ctx context.Context, id, removedByUserID valuer.UUID) error
	GetAPIKey(ctx context.Context, orgID valuer.UUID, id valuer.UUID) (*types.StorableAPIKeyUser, error)

	// Roles
	UpdateUserRoles(ctx context.Context, orgID, userID valuer.UUID, finalRoleNames []string) error

	statsreporter.StatsCollector
}

type Getter interface {
	// Get root user by org id.
	GetRootUserByOrgID(context.Context, valuer.UUID) (*types.User, []*authtypes.UserRole, error)

	// Get gets the users based on the given org id
	ListByOrgIDDeprecated(context.Context, valuer.UUID) ([]*types.DeprecatedUser, error)
	ListByOrgID(ctx context.Context, orgID valuer.UUID) ([]*types.User, error)

	// Get deprecated user object by orgID and id.
	GetDeprecatedUserByOrgIDAndID(context.Context, valuer.UUID, valuer.UUID) (*types.DeprecatedUser, error)
	GetUserByOrgIDAndID(ctx context.Context, orgID valuer.UUID, userID valuer.UUID) (*types.User, error)

	// Get user by id.
	Get(context.Context, valuer.UUID) (*types.DeprecatedUser, error)

	// List users by email and org ids.
	ListUsersByEmailAndOrgIDs(context.Context, valuer.Email, []valuer.UUID) ([]*types.User, error)

	// Count users by org id.
	CountByOrgID(context.Context, valuer.UUID) (int64, error)

	// Count of users by org id and grouped by status.
	CountByOrgIDAndStatuses(context.Context, valuer.UUID, []string) (map[valuer.String]int64, error)

	// Get factor password by user id.
	GetFactorPasswordByUserID(context.Context, valuer.UUID) (*types.FactorPassword, error)

	// Gets single Non-Deleted user by email and org id
	GetNonDeletedUserByEmailAndOrgID(ctx context.Context, email valuer.Email, orgID valuer.UUID) (*types.User, error)

	// Gets user_role with roles entries from db
	GetUserRoles(ctx context.Context, userID valuer.UUID) ([]*authtypes.UserRole, error)

	// Gets all the user with role using role id in an org id
	GetUsersByOrgIDAndRoleID(ctx context.Context, orgID valuer.UUID, roleID valuer.UUID) ([]*types.User, error)
}

type Handler interface {
	// invite
	CreateInvite(http.ResponseWriter, *http.Request)
	CreateBulkInvite(http.ResponseWriter, *http.Request)

	// users
	ListUsersDeprecated(http.ResponseWriter, *http.Request)
	ListUsers(http.ResponseWriter, *http.Request)
	UpdateUserDeprecated(http.ResponseWriter, *http.Request)
	UpdateUser(http.ResponseWriter, *http.Request)
	DeleteUser(http.ResponseWriter, *http.Request)
	GetUserDeprecated(http.ResponseWriter, *http.Request)
	GetUser(http.ResponseWriter, *http.Request)
	GetMyUserDeprecated(http.ResponseWriter, *http.Request)
	GetMyUser(http.ResponseWriter, *http.Request)
	UpdateMyUser(http.ResponseWriter, *http.Request)
	GetUserRoles(http.ResponseWriter, *http.Request)
	GetUsersByRoleID(http.ResponseWriter, *http.Request)

	// Reset Password
	GetResetPasswordToken(http.ResponseWriter, *http.Request)
	ResetPassword(http.ResponseWriter, *http.Request)
	ChangePassword(http.ResponseWriter, *http.Request)
	ForgotPassword(http.ResponseWriter, *http.Request)

	// API KEY
	CreateAPIKey(http.ResponseWriter, *http.Request)
	ListAPIKeys(http.ResponseWriter, *http.Request)
	UpdateAPIKey(http.ResponseWriter, *http.Request)
	RevokeAPIKey(http.ResponseWriter, *http.Request)
}

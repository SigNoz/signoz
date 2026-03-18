package types

import (
	"context"
	"encoding/json"
	"slices"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

var (
	ErrCodeUserNotFound                 = errors.MustNewCode("user_not_found")
	ErrCodeAmbiguousUser                = errors.MustNewCode("ambiguous_user")
	ErrUserAlreadyExists                = errors.MustNewCode("user_already_exists")
	ErrPasswordAlreadyExists            = errors.MustNewCode("password_already_exists")
	ErrResetPasswordTokenAlreadyExists  = errors.MustNewCode("reset_password_token_already_exists")
	ErrPasswordNotFound                 = errors.MustNewCode("password_not_found")
	ErrResetPasswordTokenNotFound       = errors.MustNewCode("reset_password_token_not_found")
	ErrAPIKeyAlreadyExists              = errors.MustNewCode("api_key_already_exists")
	ErrAPIKeyNotFound                   = errors.MustNewCode("api_key_not_found")
	ErrCodeRootUserOperationUnsupported = errors.MustNewCode("root_user_operation_unsupported")
	ErrCodeUserStatusDeleted            = errors.MustNewCode("user_status_deleted")
	ErrCodeUserStatusPendingInvite      = errors.MustNewCode("user_status_pending_invite")
)

var (
	UserStatusPendingInvite = valuer.NewString("pending_invite")
	UserStatusActive        = valuer.NewString("active")
	UserStatusDeleted       = valuer.NewString("deleted")
	ValidUserStatus         = []valuer.String{UserStatusPendingInvite, UserStatusActive, UserStatusDeleted}
)

type User struct {
	Identifiable
	DisplayName string        `json:"displayName"`
	Email       valuer.Email  `json:"email"`
	Roles       []string      `json:"roles"`
	OrgID       valuer.UUID   `json:"orgId"`
	IsRoot      bool          `json:"isRoot"`
	Status      valuer.String `json:"status"`
	DeletedAt   time.Time     `json:"-"`
	TimeAuditable
}

type StorableUser struct {
	bun.BaseModel `bun:"table:users"`

	Identifiable
	DisplayName string        `bun:"display_name" json:"displayName"`
	Email       valuer.Email  `bun:"email" json:"email"`
	OrgID       valuer.UUID   `bun:"org_id" json:"orgId"`
	IsRoot      bool          `bun:"is_root" json:"isRoot"`
	Status      valuer.String `bun:"status" json:"status"`
	DeletedAt   time.Time     `bun:"deleted_at" json:"-"`
	TimeAuditable
}

type PostableRegisterOrgAndAdmin struct {
	Name           string       `json:"name"`
	Email          valuer.Email `json:"email"`
	Password       string       `json:"password"`
	OrgDisplayName string       `json:"orgDisplayName"`
	OrgName        string       `json:"orgName"`
}

func NewStorableUser(user *User) *StorableUser {
	if user == nil {
		return nil
	}

	return &StorableUser{
		Identifiable:  user.Identifiable,
		DisplayName:   user.DisplayName,
		Email:         user.Email,
		OrgID:         user.OrgID,
		IsRoot:        user.IsRoot,
		Status:        user.Status,
		DeletedAt:     user.DeletedAt,
		TimeAuditable: user.TimeAuditable,
	}
}

func NewUserFromStorable(storableUser *StorableUser, roleNames []string) *User {
	if storableUser == nil {
		return nil
	}
	return &User{
		Identifiable:  storableUser.Identifiable,
		DisplayName:   storableUser.DisplayName,
		Email:         storableUser.Email,
		Roles:         roleNames,
		OrgID:         storableUser.OrgID,
		IsRoot:        storableUser.IsRoot,
		Status:        storableUser.Status,
		DeletedAt:     storableUser.DeletedAt,
		TimeAuditable: storableUser.TimeAuditable,
	}
}

// func NewUsersFromStorables(storableUsers []*StorableUser) []*User {
// 	users := make([]*User, len(storableUsers))
// 	for i, s := range storableUsers {
// 		users[i] = NewUserFromStorable(s)
// 	}
// 	return users
// }

func NewStorableUsers(users []*User) []*StorableUser {
	storableUsers := make([]*StorableUser, len(users))
	for i, u := range users {
		storableUsers[i] = NewStorableUser(u)
	}
	return storableUsers
}

func NewUser(displayName string, email valuer.Email, roles []string, orgID valuer.UUID, status valuer.String) (*User, error) {
	if email.IsZero() {
		return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "email is required")
	}

	if len(roles) == 0 {
		return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "roles are required")
	}

	if orgID.IsZero() {
		return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "orgID is required")
	}

	if !slices.Contains(ValidUserStatus, status) {
		return nil, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "invalid status: %s, allowed status are: %v", status, ValidUserStatus)
	}

	return &User{
		Identifiable: Identifiable{
			ID: valuer.GenerateUUID(),
		},
		DisplayName: displayName,
		Email:       email,
		Roles:       roles,
		OrgID:       orgID,
		IsRoot:      false,
		Status:      status,
		TimeAuditable: TimeAuditable{
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
	}, nil
}

func NewRootUser(displayName string, email valuer.Email, orgID valuer.UUID, roleNames []string) (*User, error) {
	if email.IsZero() {
		return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "email is required")
	}

	if orgID.IsZero() {
		return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "orgID is required")
	}

	return &User{
		Identifiable: Identifiable{
			ID: valuer.GenerateUUID(),
		},
		DisplayName: displayName,
		Email:       email,
		Roles:       make([]string, 0),
		OrgID:       orgID,
		IsRoot:      true,
		Status:      UserStatusActive,
		TimeAuditable: TimeAuditable{
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
	}, nil
}

// Update applies mutable fields from the input to the user. Immutable fields
// (email, is_root, org_id, id) are preserved. Only non-zero input fields are applied.
func (u *User) Update(displayName string, roles []string) {
	u.DisplayName = displayName
	u.Roles = roles
	u.UpdatedAt = time.Now()
}

func (u *User) UpdateStatus(status valuer.String) error {
	// no updates allowed if user is in delete state
	if err := u.ErrIfDeleted(); err != nil {
		return errors.WithAdditionalf(err, "cannot update status of a deleted user")
	}

	// not udpates allowed from active to pending state
	if status == UserStatusPendingInvite && u.Status == UserStatusActive {
		return errors.New(errors.TypeUnsupported, errors.CodeUnsupported, "cannot move user to pending state from active state")
	}

	u.Status = status
	u.UpdatedAt = time.Now()

	return nil
}

// PromoteToRoot promotes the user to a root user with admin role.
func (u *User) PromoteToRoot() {
	u.IsRoot = true
	u.UpdatedAt = time.Now()
}

// UpdateEmail updates the email of the user.
func (u *User) UpdateEmail(email valuer.Email) {
	u.Email = email
	u.UpdatedAt = time.Now()
}

// ErrIfRoot returns an error if the user is a root user. The caller should
// enrich the error with the specific operation using errors.WithAdditionalf.
func (u *User) ErrIfRoot() error {
	if u.IsRoot {
		return errors.New(errors.TypeUnsupported, ErrCodeRootUserOperationUnsupported, "this operation is not supported for the root user")
	}
	return nil
}

// ErrIfRoot returns an error if the user is a root user. The caller should
// enrich the error with the specific operation using errors.WithAdditionalf.
func (u *StorableUser) ErrIfRoot() error {
	if u.IsRoot {
		return errors.New(errors.TypeUnsupported, ErrCodeRootUserOperationUnsupported, "this operation is not supported for the root user")
	}
	return nil
}

// ErrIfDeleted returns an error if the user is in deleted state.
// This error can be enriched with specific operation by the called using errors.WithAdditionalf
func (u *User) ErrIfDeleted() error {
	if u.Status == UserStatusDeleted {
		return errors.New(errors.TypeUnsupported, ErrCodeUserStatusDeleted, "unsupported operation for deleted user")
	}
	return nil
}

// ErrIfDeleted returns an error if the user is in deleted state.
// This error can be enriched with specific operation by the called using errors.WithAdditionalf
func (u *StorableUser) ErrIfDeleted() error {
	if u.Status == UserStatusDeleted {
		return errors.New(errors.TypeUnsupported, ErrCodeUserStatusDeleted, "unsupported operation for deleted user")
	}
	return nil
}

// ErrIfPending returns an error if the user is in pending invite state.
// This error can be enriched with specific operation by the called using errors.WithAdditionalf
func (u *User) ErrIfPending() error {
	if u.Status == UserStatusPendingInvite {
		return errors.New(errors.TypeUnsupported, ErrCodeUserStatusPendingInvite, "unsupported operation for pending user")
	}
	return nil
}

func (u *User) PatchRoles(targetRoles []string) ([]string, []string) {
	currentRolesSet := make(map[string]struct{}, len(u.Roles))
	inputRolesSet := make(map[string]struct{}, len(targetRoles))

	for _, role := range u.Roles {
		currentRolesSet[role] = struct{}{}
	}
	for _, role := range targetRoles {
		inputRolesSet[role] = struct{}{}
	}

	// additions: roles present in input but not in current
	additions := []string{}
	for _, role := range targetRoles {
		if _, exists := currentRolesSet[role]; !exists {
			additions = append(additions, role)
		}
	}

	// deletions: roles present in current but not in input
	deletions := []string{}
	for _, role := range u.Roles {
		if _, exists := inputRolesSet[role]; !exists {
			deletions = append(deletions, role)
		}
	}

	return additions, deletions
}

func NewTraitsFromUser(user *User) map[string]any {
	return map[string]any{
		"name":         user.DisplayName,
		"roles":        user.Roles,
		"email":        user.Email.String(),
		"display_name": user.DisplayName,
		"status":       user.Status,
		"created_at":   user.CreatedAt,
	}
}

func (request *PostableRegisterOrgAndAdmin) UnmarshalJSON(data []byte) error {
	type Alias PostableRegisterOrgAndAdmin

	var temp Alias
	if err := json.Unmarshal(data, &temp); err != nil {
		return err
	}

	if !IsPasswordValid(temp.Password) {
		return ErrInvalidPassword
	}

	*request = PostableRegisterOrgAndAdmin(temp)
	return nil
}

type UserStore interface {
	// Creates a user.
	CreateUser(ctx context.Context, user *StorableUser) error

	// Get user by id.
	GetUser(context.Context, valuer.UUID) (*StorableUser, error)

	// Get user by orgID and id.
	GetByOrgIDAndID(ctx context.Context, orgID valuer.UUID, id valuer.UUID) (*StorableUser, error)

	// Get user by email and orgID.
	GetUsersByEmailAndOrgID(ctx context.Context, email valuer.Email, orgID valuer.UUID) ([]*StorableUser, error)

	// Get users by email.
	GetUsersByEmail(ctx context.Context, email valuer.Email) ([]*StorableUser, error)

	// Get active users by role name and org. join to user_role table.
	GetActiveUsersByRoleNameAndOrgID(ctx context.Context, roleName string, orgID valuer.UUID) ([]*StorableUser, error)

	// List users by org.
	ListUsersByOrgID(ctx context.Context, orgID valuer.UUID) ([]*StorableUser, error)

	// List users by email and org ids.
	ListUsersByEmailAndOrgIDs(ctx context.Context, email valuer.Email, orgIDs []valuer.UUID) ([]*StorableUser, error)

	// Get users for an org id using emails and statuses
	GetUsersByEmailsOrgIDAndStatuses(context.Context, valuer.UUID, []string, []string) ([]*StorableUser, error)

	UpdateUser(ctx context.Context, orgID valuer.UUID, user *StorableUser) error
	DeleteUser(ctx context.Context, orgID string, id string) error
	SoftDeleteUser(ctx context.Context, orgID string, id string) error

	// Creates a password.
	CreatePassword(ctx context.Context, password *FactorPassword) error
	CreateResetPasswordToken(ctx context.Context, resetPasswordRequest *ResetPasswordToken) error
	GetPassword(ctx context.Context, id valuer.UUID) (*FactorPassword, error)
	GetPasswordByUserID(ctx context.Context, userID valuer.UUID) (*FactorPassword, error)
	GetResetPasswordToken(ctx context.Context, token string) (*ResetPasswordToken, error)
	GetResetPasswordTokenByPasswordID(ctx context.Context, passwordID valuer.UUID) (*ResetPasswordToken, error)
	DeleteResetPasswordTokenByPasswordID(ctx context.Context, passwordID valuer.UUID) error
	UpdatePassword(ctx context.Context, password *FactorPassword) error

	// API KEY
	CreateAPIKey(ctx context.Context, apiKey *StorableAPIKey) error
	UpdateAPIKey(ctx context.Context, id valuer.UUID, apiKey *StorableAPIKey, updaterID valuer.UUID) error
	ListAPIKeys(ctx context.Context, orgID valuer.UUID) ([]*StorableAPIKeyUser, error)
	RevokeAPIKey(ctx context.Context, id valuer.UUID, revokedByUserID valuer.UUID) error
	GetAPIKey(ctx context.Context, orgID, id valuer.UUID) (*StorableAPIKeyUser, error)
	CountAPIKeyByOrgID(ctx context.Context, orgID valuer.UUID) (int64, error)

	CountByOrgID(ctx context.Context, orgID valuer.UUID) (int64, error)
	CountByOrgIDAndStatuses(ctx context.Context, orgID valuer.UUID, statuses []string) (map[valuer.String]int64, error)

	// Get root user by org.
	GetRootUserByOrgID(ctx context.Context, orgID valuer.UUID) (*StorableUser, error)

	// Get user by reset password token
	GetUserByResetPasswordToken(ctx context.Context, token string) (*StorableUser, error)

	// Transaction
	RunInTx(ctx context.Context, cb func(ctx context.Context) error) error
}

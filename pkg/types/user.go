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
	bun.BaseModel `bun:"table:users,alias:users"`

	Identifiable
	DisplayName string        `bun:"display_name" json:"displayName"`
	Email       valuer.Email  `bun:"email" json:"email"`
	OrgID       valuer.UUID   `bun:"org_id" json:"orgId"`
	IsRoot      bool          `bun:"is_root" json:"isRoot"`
	Status      valuer.String `bun:"status" json:"status"`
	TimeAuditable
}

type DeprecatedUser struct {
	*User
	Role Role `json:"role"`
}

type UpdatableUser struct {
	DisplayName string `json:"displayName" required:"true"`
}

type PostableRole struct {
	Name string `json:"name" required:"true"`
}

type PostableRegisterOrgAndAdmin struct {
	Name           string       `json:"name"`
	Email          valuer.Email `json:"email"`
	Password       string       `json:"password"`
	OrgDisplayName string       `json:"orgDisplayName"`
	OrgName        string       `json:"orgName"`
}

func NewUser(displayName string, email valuer.Email, orgID valuer.UUID, status valuer.String) (*User, error) {
	if email.IsZero() {
		return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "email is required")
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
		OrgID:       orgID,
		IsRoot:      false,
		Status:      status,
		TimeAuditable: TimeAuditable{
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
	}, nil
}

func NewRootUser(displayName string, email valuer.Email, orgID valuer.UUID) (*User, error) {
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
		OrgID:       orgID,
		IsRoot:      true,
		Status:      UserStatusActive,
		TimeAuditable: TimeAuditable{
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
	}, nil
}

func NewDeprecatedUserFromUserAndRole(user *User, role Role) *DeprecatedUser {
	return &DeprecatedUser{
		user,
		role,
	}
}

func NewUserFromDeprecatedUser(deprecatedUser *DeprecatedUser) *User {
	return &User{
		Identifiable:  deprecatedUser.Identifiable,
		DisplayName:   deprecatedUser.DisplayName,
		Email:         deprecatedUser.Email,
		OrgID:         deprecatedUser.OrgID,
		IsRoot:        deprecatedUser.IsRoot,
		Status:        deprecatedUser.Status,
		TimeAuditable: deprecatedUser.TimeAuditable,
	}
}

// Update applies mutable fields from the input to the user. Immutable fields
// (email, is_root, org_id, id) are preserved. Only non-zero input fields are applied.
func (u *User) Update(displayName string) {
	if displayName != "" {
		u.DisplayName = displayName
	}
	u.UpdatedAt = time.Now()
}

func (u *DeprecatedUser) Update(displayName string, role Role) {
	if displayName != "" {
		u.DisplayName = displayName
	}
	if role != "" {
		u.Role = role
	}
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

// ErrIfDeleted returns an error if the user is in deleted state.
// This error can be enriched with specific operation by the called using errors.WithAdditionalf.
func (u *User) ErrIfDeleted() error {
	if u.Status == UserStatusDeleted {
		return errors.New(errors.TypeUnsupported, ErrCodeUserStatusDeleted, "unsupported operation for deleted user")
	}
	return nil
}

// ErrIfPending returns an error if the user is in pending invite state.
// This error can be enriched with specific operation by the called using errors.WithAdditionalf.
func (u *User) ErrIfPending() error {
	if u.Status == UserStatusPendingInvite {
		return errors.New(errors.TypeUnsupported, ErrCodeUserStatusPendingInvite, "unsupported operation for pending user")
	}
	return nil
}

func NewTraitsFromUser(user *User) map[string]any {
	return map[string]any{
		"name":         user.DisplayName,
		"email":        user.Email.String(),
		"display_name": user.DisplayName,
		"status":       user.Status,
		"created_at":   user.CreatedAt,
	}
}

func NewTraitsFromDeprecatedUser(user *DeprecatedUser) map[string]any {
	return map[string]any{
		"name":         user.DisplayName,
		"role":         user.Role,
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
	CreateUser(ctx context.Context, user *User) error

	// Get user by id.
	GetUser(context.Context, valuer.UUID) (*User, error)

	// Get user by orgID and id.
	GetByOrgIDAndID(ctx context.Context, orgID valuer.UUID, id valuer.UUID) (*User, error)

	// Get user by email and orgID.
	GetNonDeletedUsersByEmailAndOrgID(ctx context.Context, email valuer.Email, orgID valuer.UUID) ([]*User, error)

	// List users by org.
	ListUsersByOrgID(ctx context.Context, orgID valuer.UUID) ([]*User, error)

	// List users by email and org ids.
	ListUsersByEmailAndOrgIDs(ctx context.Context, email valuer.Email, orgIDs []valuer.UUID) ([]*User, error)

	// Get users for an org id using emails and statuses
	GetUsersByEmailsOrgIDAndStatuses(context.Context, valuer.UUID, []string, []string) ([]*User, error)

	UpdateUser(ctx context.Context, orgID valuer.UUID, user *User) error
	DeleteUser(ctx context.Context, orgID string, id string) error
	SoftDeleteUser(ctx context.Context, orgID string, id string) error

	// Creates a password.
	CreatePassword(ctx context.Context, password *FactorPassword) error
	CreateResetPasswordToken(ctx context.Context, resetPasswordRequest *ResetPasswordToken) error
	GetPassword(ctx context.Context, id valuer.UUID) (*FactorPassword, error)
	GetPasswordByUserID(ctx context.Context, userID valuer.UUID) (*FactorPassword, error)
	GetResetPasswordToken(ctx context.Context, token string) (*ResetPasswordToken, error)
	GetResetPasswordTokenByPasswordID(ctx context.Context, passwordID valuer.UUID) (*ResetPasswordToken, error)
	GetResetPasswordTokenByOrgIDAndUserID(ctx context.Context, orgID valuer.UUID, userID valuer.UUID) (*ResetPasswordToken, error)
	DeleteResetPasswordTokenByPasswordID(ctx context.Context, passwordID valuer.UUID) error
	UpdatePassword(ctx context.Context, password *FactorPassword) error

	CountByOrgID(ctx context.Context, orgID valuer.UUID) (int64, error)
	CountByOrgIDAndStatuses(ctx context.Context, orgID valuer.UUID, statuses []string) (map[valuer.String]int64, error)

	// Get root user by org.
	GetRootUserByOrgID(ctx context.Context, orgID valuer.UUID) (*User, error)

	// Get user by reset password token
	GetUserByResetPasswordToken(ctx context.Context, token string) (*User, error)

	// Get users having role by org id and role id
	GetUsersByOrgIDAndRoleID(ctx context.Context, orgID valuer.UUID, roleID valuer.UUID) ([]*User, error)

	// Transaction
	RunInTx(ctx context.Context, cb func(ctx context.Context) error) error
}

package types

import (
	"context"
	"encoding/json"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

var (
	ErrCodeUserNotFound                = errors.MustNewCode("user_not_found")
	ErrCodeAmbiguousUser               = errors.MustNewCode("ambiguous_user")
	ErrUserAlreadyExists               = errors.MustNewCode("user_already_exists")
	ErrPasswordAlreadyExists           = errors.MustNewCode("password_already_exists")
	ErrResetPasswordTokenAlreadyExists = errors.MustNewCode("reset_password_token_already_exists")
	ErrPasswordNotFound                = errors.MustNewCode("password_not_found")
	ErrResetPasswordTokenNotFound      = errors.MustNewCode("reset_password_token_not_found")
	ErrAPIKeyAlreadyExists             = errors.MustNewCode("api_key_already_exists")
	ErrAPIKeyNotFound                  = errors.MustNewCode("api_key_not_found")
)

type GettableUser = User

type User struct {
	bun.BaseModel `bun:"table:users"`

	Identifiable
	DisplayName string       `bun:"display_name" json:"displayName"`
	Email       valuer.Email `bun:"email,type:text" json:"email"`
	Role        Role         `bun:"role,type:text" json:"role"`
	OrgID       valuer.UUID  `bun:"org_id,type:text" json:"orgId"`
	TimeAuditable
}

type PostableRegisterOrgAndAdmin struct {
	Name           string       `json:"name"`
	Email          valuer.Email `json:"email"`
	Password       string       `json:"password"`
	OrgDisplayName string       `json:"orgDisplayName"`
	OrgName        string       `json:"orgName"`
}

func NewUser(displayName string, email valuer.Email, role Role, orgID valuer.UUID) (*User, error) {
	if email.IsZero() {
		return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "email is required")
	}

	if role == "" {
		return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "role is required")
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
		Role:        role,
		OrgID:       orgID,
		TimeAuditable: TimeAuditable{
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
	}, nil
}

func NewTraitsFromUser(user *User) map[string]any {
	return map[string]any{
		"name":         user.DisplayName,
		"role":         user.Role,
		"email":        user.Email.String(),
		"display_name": user.DisplayName,
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
	// invite
	CreateBulkInvite(ctx context.Context, invites []*Invite) error
	ListInvite(ctx context.Context, orgID string) ([]*Invite, error)
	DeleteInvite(ctx context.Context, orgID string, id valuer.UUID) error

	// Get invite by token.
	GetInviteByToken(ctx context.Context, token string) (*Invite, error)

	// Get invite by email and org.
	GetInviteByEmailAndOrgID(ctx context.Context, email valuer.Email, orgID valuer.UUID) (*Invite, error)

	// Creates a user.
	CreateUser(ctx context.Context, user *User) error

	// Get user by id.
	GetUser(context.Context, valuer.UUID) (*User, error)

	// Get user by orgID and id.
	GetByOrgIDAndID(ctx context.Context, orgID valuer.UUID, id valuer.UUID) (*User, error)

	// Get user by email and orgID.
	GetUserByEmailAndOrgID(ctx context.Context, email valuer.Email, orgID valuer.UUID) (*User, error)

	// Get users by email.
	GetUsersByEmail(ctx context.Context, email valuer.Email) ([]*User, error)

	// Get users by role and org.
	GetUsersByRoleAndOrgID(ctx context.Context, role Role, orgID valuer.UUID) ([]*User, error)

	// List users by org.
	ListUsersByOrgID(ctx context.Context, orgID valuer.UUID) ([]*User, error)

	// List users by email and org ids.
	ListUsersByEmailAndOrgIDs(ctx context.Context, email valuer.Email, orgIDs []valuer.UUID) ([]*User, error)

	UpdateUser(ctx context.Context, orgID valuer.UUID, id string, user *User) (*User, error)
	DeleteUser(ctx context.Context, orgID string, id string) error

	// Creates a password.
	CreatePassword(ctx context.Context, password *FactorPassword) error
	CreateResetPasswordToken(ctx context.Context, resetPasswordRequest *ResetPasswordToken) error
	GetPassword(ctx context.Context, id valuer.UUID) (*FactorPassword, error)
	GetPasswordByUserID(ctx context.Context, userID valuer.UUID) (*FactorPassword, error)
	GetResetPasswordToken(ctx context.Context, token string) (*ResetPasswordToken, error)
	GetResetPasswordTokenByPasswordID(ctx context.Context, passwordID valuer.UUID) (*ResetPasswordToken, error)
	UpdatePassword(ctx context.Context, password *FactorPassword) error

	// API KEY
	CreateAPIKey(ctx context.Context, apiKey *StorableAPIKey) error
	UpdateAPIKey(ctx context.Context, id valuer.UUID, apiKey *StorableAPIKey, updaterID valuer.UUID) error
	ListAPIKeys(ctx context.Context, orgID valuer.UUID) ([]*StorableAPIKeyUser, error)
	RevokeAPIKey(ctx context.Context, id valuer.UUID, revokedByUserID valuer.UUID) error
	GetAPIKey(ctx context.Context, orgID, id valuer.UUID) (*StorableAPIKeyUser, error)
	CountAPIKeyByOrgID(ctx context.Context, orgID valuer.UUID) (int64, error)

	CountByOrgID(ctx context.Context, orgID valuer.UUID) (int64, error)

	// Transaction
	RunInTx(ctx context.Context, cb func(ctx context.Context) error) error
}

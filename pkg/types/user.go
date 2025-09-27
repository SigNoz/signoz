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

type GettableUser struct {
	User
	Organization string `json:"organization"`
}

type User struct {
	bun.BaseModel `bun:"table:users"`

	Identifiable
	TimeAuditable
	DisplayName string `bun:"display_name,type:text,notnull" json:"displayName"`
	Email       string `bun:"email,type:text,notnull,unique:org_email" json:"email"`
	Role        Role   `bun:"role,type:text,notnull" json:"role"`
	OrgID       string `bun:"org_id,type:text,notnull,unique:org_email" json:"orgId"`
}

func NewUser(displayName string, email string, role Role, orgID string) (*User, error) {
	if email == "" {
		return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "email is required")
	}

	if role == "" {
		return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "role is required")
	}

	if orgID == "" {
		return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "orgID is required")
	}

	return &User{
		Identifiable: Identifiable{
			ID: valuer.GenerateUUID(),
		},
		TimeAuditable: TimeAuditable{
			CreatedAt: time.Now(),
		},
		DisplayName: displayName,
		Email:       email,
		Role:        role,
		OrgID:       orgID,
	}, nil
}

type PostableRegisterOrgAndAdmin struct {
	Name           string `json:"name"`
	OrgID          string `json:"orgId"`
	OrgDisplayName string `json:"orgDisplayName"`
	OrgName        string `json:"orgName"`
	Email          string `json:"email"`
	Password       string `json:"password"`
}

type PostableAcceptInvite struct {
	DisplayName string `json:"displayName"`
	InviteToken string `json:"token"`
	Password    string `json:"password"`

	// reference URL to track where the register request is coming from
	SourceURL string `json:"sourceUrl"`
}

type PostableLoginRequest struct {
	OrgID        string `json:"orgId"`
	Email        string `json:"email"`
	Password     string `json:"password"`
	RefreshToken string `json:"refreshToken"`
}

func NewTraitsFromUser(user *User) map[string]any {
	return map[string]any{
		"name":         user.DisplayName,
		"role":         user.Role,
		"email":        user.Email,
		"display_name": user.DisplayName,
		"created_at":   user.CreatedAt,
	}
}

func (request *PostableAcceptInvite) UnmarshalJSON(data []byte) error {
	type Alias PostableAcceptInvite

	var temp Alias
	if err := json.Unmarshal(data, &temp); err != nil {
		return err
	}

	if temp.InviteToken == "" {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "invite token is required")
	}

	if !IsPasswordValid(temp.Password) {
		return ErrInvalidPassword
	}

	*request = PostableAcceptInvite(temp)
	return nil
}

func (request *PostableRegisterOrgAndAdmin) UnmarshalJSON(data []byte) error {
	type Alias PostableRegisterOrgAndAdmin

	var temp Alias
	if err := json.Unmarshal(data, &temp); err != nil {
		return err
	}

	if temp.Email == "" {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "email is required")
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
	GetInviteByToken(ctx context.Context, token string) (*GettableInvite, error)
	GetInviteByEmailInOrg(ctx context.Context, orgID string, email string) (*Invite, error)

	// Creates a user.
	CreateUser(ctx context.Context, user *User) error
	GetUserByID(ctx context.Context, orgID string, id string) (*GettableUser, error)
	GetUserByEmailAndOrgID(ctx context.Context, email string, orgID valuer.UUID) (*User, error)
	GetUsersByEmail(ctx context.Context, email string) ([]*User, error)
	GetUsersByRoleInOrg(ctx context.Context, orgID string, role Role) ([]*GettableUser, error)
	ListUsers(ctx context.Context, orgID string) ([]*GettableUser, error)
	UpdateUser(ctx context.Context, orgID string, id string, user *User) (*User, error)
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

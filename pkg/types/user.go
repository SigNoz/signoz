package types

import (
	"context"
	"net/url"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/google/uuid"
	"github.com/uptrace/bun"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrUserAlreadyExists               = errors.MustNewCode("user_already_exists")
	ErrPasswordAlreadyExists           = errors.MustNewCode("password_already_exists")
	ErrUserNotFound                    = errors.MustNewCode("user_not_found")
	ErrResetPasswordTokenAlreadyExists = errors.MustNewCode("reset_password_token_already_exists")
	ErrPasswordNotFound                = errors.MustNewCode("password_not_found")
	ErrResetPasswordTokenNotFound      = errors.MustNewCode("reset_password_token_not_found")
	ErrAPIKeyAlreadyExists             = errors.MustNewCode("api_key_already_exists")
	ErrAPIKeyNotFound                  = errors.MustNewCode("api_key_not_found")
)

type UserStore interface {
	// invite
	CreateBulkInvite(ctx context.Context, invites []*Invite) error
	ListInvite(ctx context.Context, orgID string) ([]*Invite, error)
	DeleteInvite(ctx context.Context, orgID string, id valuer.UUID) error
	GetInviteByToken(ctx context.Context, token string) (*GettableInvite, error)
	GetInviteByEmailInOrg(ctx context.Context, orgID string, email string) (*Invite, error)

	// user
	CreateUserWithPassword(ctx context.Context, user *User, password *FactorPassword) (*User, error)
	CreateUser(ctx context.Context, user *User) error
	GetUserByID(ctx context.Context, orgID string, id string) (*GettableUser, error)
	GetUserByEmailInOrg(ctx context.Context, orgID string, email string) (*GettableUser, error)
	GetUsersByEmail(ctx context.Context, email string) ([]*GettableUser, error)
	GetUsersByRoleInOrg(ctx context.Context, orgID string, role Role) ([]*GettableUser, error)
	ListUsers(ctx context.Context, orgID string) ([]*GettableUser, error)
	UpdateUser(ctx context.Context, orgID string, id string, user *User) (*User, error)
	DeleteUser(ctx context.Context, orgID string, id string) error

	// password
	CreatePassword(ctx context.Context, password *FactorPassword) (*FactorPassword, error)
	CreateResetPasswordToken(ctx context.Context, resetPasswordRequest *ResetPasswordRequest) error
	GetPasswordByID(ctx context.Context, id string) (*FactorPassword, error)
	GetPasswordByUserID(ctx context.Context, id string) (*FactorPassword, error)
	GetResetPassword(ctx context.Context, token string) (*ResetPasswordRequest, error)
	GetResetPasswordByPasswordID(ctx context.Context, passwordID string) (*ResetPasswordRequest, error)
	UpdatePassword(ctx context.Context, userID string, password string) error
	UpdatePasswordAndDeleteResetPasswordEntry(ctx context.Context, userID string, password string) error

	// Auth Domain
	GetDomainByName(ctx context.Context, name string) (*StorableOrgDomain, error)
	// org domain (auth domains) CRUD ops
	GetDomainFromSsoResponse(ctx context.Context, relayState *url.URL) (*GettableOrgDomain, error)
	ListDomains(ctx context.Context, orgId valuer.UUID) ([]*GettableOrgDomain, error)
	GetDomain(ctx context.Context, id uuid.UUID) (*GettableOrgDomain, error)
	CreateDomain(ctx context.Context, d *GettableOrgDomain) error
	UpdateDomain(ctx context.Context, domain *GettableOrgDomain) error
	DeleteDomain(ctx context.Context, id uuid.UUID) error

	// Temporary func for SSO
	GetDefaultOrgID(ctx context.Context) (string, error)

	// API KEY
	CreateAPIKey(ctx context.Context, apiKey *StorableAPIKey) error
	UpdateAPIKey(ctx context.Context, id valuer.UUID, apiKey *StorableAPIKey, updaterID valuer.UUID) error
	ListAPIKeys(ctx context.Context, orgID valuer.UUID) ([]*StorableAPIKeyUser, error)
	RevokeAPIKey(ctx context.Context, id valuer.UUID, revokedByUserID valuer.UUID) error
	GetAPIKey(ctx context.Context, orgID, id valuer.UUID) (*StorableAPIKeyUser, error)
	CountAPIKeyByOrgID(ctx context.Context, orgID valuer.UUID) (int64, error)

	CountByOrgID(ctx context.Context, orgID valuer.UUID) (int64, error)
}

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
	Role        string `bun:"role,type:text,notnull" json:"role"`
	OrgID       string `bun:"org_id,type:text,notnull,unique:org_email" json:"orgId"`
}

func NewUser(displayName string, email string, role string, orgID string) (*User, error) {
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
	PostableAcceptInvite
	Name           string `json:"name"`
	OrgID          string `json:"orgId"`
	OrgDisplayName string `json:"orgDisplayName"`
	OrgName        string `json:"orgName"`
	Email          string `json:"email"`
}

type PostableAcceptInvite struct {
	DisplayName string `json:"displayName"`
	InviteToken string `json:"token"`
	Password    string `json:"password"`

	// reference URL to track where the register request is coming from
	SourceURL string `json:"sourceUrl"`
}

func (p *PostableAcceptInvite) Validate() error {
	if p.InviteToken == "" {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "invite token is required")
	}

	if p.Password == "" || len(p.Password) < 8 {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "password must be at least 8 characters long")
	}

	return nil
}

type FactorPassword struct {
	bun.BaseModel `bun:"table:factor_password"`

	Identifiable
	TimeAuditable
	Password  string `bun:"password,type:text,notnull" json:"password"`
	Temporary bool   `bun:"temporary,type:boolean,notnull" json:"temporary"`
	UserID    string `bun:"user_id,type:text,notnull,unique,references:user(id)" json:"userId"`
}

func NewFactorPassword(password string) (*FactorPassword, error) {

	if password == "" && len(password) < 8 {
		return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "password must be at least 8 characters long")
	}

	password = strings.TrimSpace(password)

	hashedPassword, err := HashPassword(password)
	if err != nil {
		return nil, err
	}

	return &FactorPassword{
		Identifiable: Identifiable{
			ID: valuer.GenerateUUID(),
		},
		TimeAuditable: TimeAuditable{
			CreatedAt: time.Now(),
		},
		Password:  hashedPassword,
		Temporary: false,
	}, nil
}

func HashPassword(password string) (string, error) {
	// bcrypt automatically handles salting and uses a secure work factor
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(hashedPassword), nil
}

func ComparePassword(hashedPassword, password string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(password)) == nil
}

type ResetPasswordRequest struct {
	bun.BaseModel `bun:"table:reset_password_token"`

	Identifiable
	Token      string `bun:"token,type:text,notnull" json:"token"`
	PasswordID string `bun:"password_id,type:text,notnull,unique" json:"passwordId"`
}

func NewResetPasswordRequest(passwordID string) (*ResetPasswordRequest, error) {
	return &ResetPasswordRequest{
		Identifiable: Identifiable{
			ID: valuer.GenerateUUID(),
		},
		Token:      valuer.GenerateUUID().String(),
		PasswordID: passwordID,
	}, nil
}

type PostableResetPassword struct {
	Password string `json:"password"`
	Token    string `json:"token"`
}

type ChangePasswordRequest struct {
	UserId      string `json:"userId"`
	OldPassword string `json:"oldPassword"`
	NewPassword string `json:"newPassword"`
}

type PostableLoginRequest struct {
	OrgID        string `json:"orgId"`
	Email        string `json:"email"`
	Password     string `json:"password"`
	RefreshToken string `json:"refreshToken"`
}

type GettableUserJwt struct {
	AccessJwt        string `json:"accessJwt"`
	AccessJwtExpiry  int64  `json:"accessJwtExpiry"`
	RefreshJwt       string `json:"refreshJwt"`
	RefreshJwtExpiry int64  `json:"refreshJwtExpiry"`
}

type GettableLoginResponse struct {
	GettableUserJwt
	UserID string `json:"userId"`
}

type GettableLoginPrecheck struct {
	SSO             bool     `json:"sso"`
	SSOUrl          string   `json:"ssoUrl"`
	CanSelfRegister bool     `json:"canSelfRegister"`
	IsUser          bool     `json:"isUser"`
	SSOError        string   `json:"ssoError"`
	SelectOrg       bool     `json:"selectOrg"`
	Orgs            []string `json:"orgs"`
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

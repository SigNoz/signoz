package types

import (
	"context"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrCodeRootUserAlreadyExists = errors.MustNewCode("root_user_already_exists")
	ErrCodeRootUserNotFound      = errors.MustNewCode("root_user_not_found")
)

type RootUser struct {
	bun.BaseModel `bun:"table:root_users"`

	Identifiable               // gives ID field
	Email         valuer.Email `bun:"email,type:text" json:"email"`
	PasswordHash  string       `bun:"password_hash,type:text" json:"-"`
	OrgID         valuer.UUID  `bun:"org_id,type:text" json:"orgId"`
	TimeAuditable              // gives CreatedAt and UpdatedAt fields
}

func NewRootUser(email valuer.Email, password string, orgID valuer.UUID) (*RootUser, error) {
	passwordHash, err := NewHashedPassword(password)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to generate password hash")
	}

	return &RootUser{
		Identifiable: Identifiable{
			ID: valuer.GenerateUUID(),
		},
		Email:        email,
		PasswordHash: string(passwordHash),
		OrgID:        orgID,
		TimeAuditable: TimeAuditable{
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
	}, nil
}

func (r *RootUser) VerifyPassword(password string) bool {
	return bcrypt.CompareHashAndPassword([]byte(r.PasswordHash), []byte(password)) == nil
}

type RootUserStore interface {
	// Creates a new root user. Returns ErrCodeRootUserAlreadyExists if a root user already exists for the organization.
	Create(ctx context.Context, rootUser *RootUser) error

	// Gets the root user by organization ID. Returns ErrCodeRootUserNotFound if a root user does not exist for the organization.
	GetByOrgID(ctx context.Context, orgID valuer.UUID) (*RootUser, error)

	// Gets a root user by email and organization ID. Returns ErrCodeRootUserNotFound if a root user does not exist for the organization.
	GetByEmailAndOrgID(ctx context.Context, orgID valuer.UUID, email valuer.Email) (*RootUser, error)

	// Gets a root user by organization ID and ID. Returns ErrCodeRootUserNotFound if a root user does not exist for the organization.
	GetByOrgIDAndID(ctx context.Context, orgID valuer.UUID, id valuer.UUID) (*RootUser, error)

	// Gets all root users by email and organization IDs. Returns ErrCodeRootUserNotFound if a root user does not exist for the organization.
	GetByEmailAndOrgIDs(ctx context.Context, orgIDs []valuer.UUID, email valuer.Email) ([]*RootUser, error)

	// Updates the password of a root user. Returns ErrCodeRootUserNotFound if a root user does not exist.
	Update(ctx context.Context, orgID valuer.UUID, id valuer.UUID, rootUser *RootUser) error

	// Checks if a root user exists for an organization. Returns true if a root user exists for the organization, false otherwise.
	ExistsByOrgID(ctx context.Context, orgID valuer.UUID) (bool, error)
}

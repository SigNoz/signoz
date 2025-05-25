package types

import (
	"fmt"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

var (
	ErrInviteAlreadyExists = errors.MustNewCode("invite_already_exists")
	ErrInviteNotFound      = errors.MustNewCode("invite_not_found")
)

type GettableEEInvite struct {
	GettableInvite
	PreCheck *GettableLoginPrecheck `bun:"-" json:"precheck"`
}

type GettableInvite struct {
	Invite
	Organization string `bun:"organization,type:text,notnull" json:"organization"`
}

type Invite struct {
	bun.BaseModel `bun:"table:user_invite"`

	Identifiable
	TimeAuditable
	OrgID string `bun:"org_id,type:text,notnull" json:"orgID"`
	Name  string `bun:"name,type:text,notnull" json:"name"`
	Email string `bun:"email,type:text,notnull,unique" json:"email"`
	Token string `bun:"token,type:text,notnull" json:"token"`
	Role  string `bun:"role,type:text,notnull" json:"role"`

	InviteLink string `bun:"-" json:"inviteLink"`
}

func NewInvite(orgID, role, name, email string) (*Invite, error) {
	if email == "" {
		return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "email is required")
	}
	_, err := NewRole(role)
	if err != nil {
		return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, fmt.Sprintf("invalid role for user: %s", email))
	}

	email = strings.TrimSpace(email)

	invite := &Invite{
		Identifiable: Identifiable{
			ID: valuer.GenerateUUID(),
		},
		TimeAuditable: TimeAuditable{
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		Name:  name,
		Email: email,
		Token: valuer.GenerateUUID().String(),
		Role:  role,
		OrgID: orgID,
	}

	return invite, nil
}

type InviteEmailData struct {
	CustomerName string
	InviterName  string
	InviterEmail string
	Link         string
}

type PostableInvite struct {
	Name            string `json:"name"`
	Email           string `json:"email"`
	Role            Role   `json:"role"`
	FrontendBaseUrl string `json:"frontendBaseUrl"`
}

type PostableBulkInviteRequest struct {
	Invites []PostableInvite `json:"invites"`
}

type GettableCreateInviteResponse struct {
	InviteToken string `json:"token"`
}

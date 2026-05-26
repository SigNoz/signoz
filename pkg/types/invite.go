package types

import (
	"encoding/json"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

var (
	ErrInviteAlreadyExists = errors.MustNewCode("invite_already_exists")
	ErrInviteNotFound      = errors.MustNewCode("invite_not_found")
)

type GettableInvite = Invite

type Invite struct {
	bun.BaseModel `bun:"table:user_invite"`

	Identifiable
	TimeAuditable
	Name  string       `bun:"name,type:text" json:"name"`
	Email valuer.Email `bun:"email,type:text" json:"email"`
	Token string       `bun:"token,type:text" json:"token"`
	Role  Role         `bun:"role,type:text" json:"role"`
	OrgID valuer.UUID  `bun:"org_id,type:text" json:"orgId"`

	InviteLink string `bun:"-" json:"inviteLink"`
}

type PostableInvite struct {
	Name            string       `json:"name"`
	Email           valuer.Email `json:"email"`
	Role            Role         `json:"role"`
	FrontendBaseUrl string       `json:"frontendBaseUrl"`
}

type PostableBulkInviteRequest struct {
	Invites []PostableInvite `json:"invites" required:"true" nullable:"false"`
}

func (request *PostableBulkInviteRequest) UnmarshalJSON(data []byte) error {
	type Alias PostableBulkInviteRequest

	var temp Alias
	if err := json.Unmarshal(data, &temp); err != nil {
		return err
	}

	// check for duplicate emails in the same request
	seen := make(map[string]struct{}, len(temp.Invites))
	for _, invite := range temp.Invites {
		email := invite.Email.StringValue()
		if _, exists := seen[email]; exists {
			return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "Duplicate email in request: %s", email)
		}
		seen[email] = struct{}{}
	}

	*request = PostableBulkInviteRequest(temp)
	return nil
}

func NewInvite(name string, role Role, orgID valuer.UUID, email valuer.Email) (*Invite, error) {
	invite := &Invite{
		Identifiable: Identifiable{
			ID: valuer.GenerateUUID(),
		},
		Name:  name,
		Email: email,
		Token: valuer.GenerateUUID().String(),
		Role:  role,
		OrgID: orgID,
		TimeAuditable: TimeAuditable{
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
	}

	return invite, nil
}

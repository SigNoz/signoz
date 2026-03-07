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

type InviteEmailData struct {
	CustomerName string
	InviterName  string
	InviterEmail string
	Link         string
}

type PostableAcceptInvite struct {
	DisplayName string `json:"displayName"`
	InviteToken string `json:"token"`
	Password    string `json:"password"`

	// reference URL to track where the register request is coming from
	SourceURL string `json:"sourceUrl"`
}

type PostableInvite struct {
	Name            string       `json:"name"`
	Email           valuer.Email `json:"email"`
	Role            Role         `json:"role"`
	FrontendBaseUrl string       `json:"frontendBaseUrl"`
}

type PostableBulkInviteRequest struct {
	Invites []PostableInvite `json:"invites"`
}

type GettableCreateInviteResponse struct {
	InviteToken string `json:"token"`
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

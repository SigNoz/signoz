package types

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

var (
	ErrInviteAlreadyExists = errors.MustNewCode("invite_already_exists")
	ErrInviteNotFound      = errors.MustNewCode("invite_not_found")
)

type Invite struct {
	bun.BaseModel `bun:"table:user_invite"`

	Identifiable
	TimeAuditable
	OrgID string `bun:"org_id,type:text,notnull" json:"orgId"`
	Name  string `bun:"name,type:text,notnull" json:"name"`
	Email string `bun:"email,type:text,notnull,unique" json:"email"`
	Token string `bun:"token,type:text,notnull" json:"token"`
	Role  string `bun:"role,type:text,notnull" json:"role"`

	InviteLink string `bun:"-" json:"inviteLink"`
}

func NewInvite(orgID, role, name, email string) (*Invite, error) {
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
	Role            string `json:"role"`
	FrontendBaseUrl string `json:"frontendBaseUrl"`
}

func (p *PostableInvite) Validate() error {
	if p.Email == "" {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "email is required")
	}
	if p.FrontendBaseUrl == "" {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "frontendBaseUrl is required for each user")
	}

	_, err := authtypes.NewRole(p.Role)
	if err != nil {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, fmt.Sprintf("invalid role for user: %s", p.Email))
	}

	return nil
}

func NewPostableInvite(r *http.Request) (*PostableInvite, error) {
	var req PostableInvite
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		return nil, err
	}
	req.Email = strings.TrimSpace(req.Email)
	return &req, nil
}

type PostableBulkInviteRequest struct {
	Invites []PostableInvite `json:"invites"`
}

func NewPostableBulkInviteRequest(r *http.Request) (*PostableBulkInviteRequest, error) {
	var req PostableBulkInviteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		return nil, err
	}

	// Validate that the request contains users
	if len(req.Invites) == 0 {
		return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "no invites provided for invitation")
	}

	// Trim spaces and validate each user
	for i := range req.Invites {
		req.Invites[i].Email = strings.TrimSpace(req.Invites[i].Email)
		if err := req.Invites[i].Validate(); err != nil {
			return nil, err
		}
	}
	return &req, nil
}

package types

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
)

var (
	ErrInviteAlreadyExists = errors.MustNewCode("invite_already_exists")
	ErrInviteNotFound      = errors.MustNewCode("invite_not_found")
)

type PostableInvite struct {
	Name            string       `json:"name"`
	Email           valuer.Email `json:"email"`
	Role            Role         `json:"role"`
	FrontendBaseUrl string       `json:"frontendBaseUrl"`
}

type PostableBulkInviteRequest struct {
	Invites []PostableInvite `json:"invites"`
}

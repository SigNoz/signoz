package model

import (
	basemodel "github.com/SigNoz/signoz/pkg/query-service/model"
)

// GettableInvitation overrides base object and adds precheck into
// response
type GettableInvitation struct {
	*basemodel.InvitationResponseObject
	Precheck *basemodel.PrecheckResponse `json:"precheck"`
}

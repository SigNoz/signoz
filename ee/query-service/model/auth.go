package model

import (
	basemodel "go.signoz.io/signoz/pkg/query-service/model"
)

// PrecheckResponse contains login precheck response
type PrecheckResponse struct {
	SSO             bool   `json:"sso"`
	SsoUrl          string `json:"ssoUrl"`
	CanSelfRegister bool   `json:"canSelfRegister"`
	IsUser          bool   `json:"isUser"`
	SsoError        string `json:"ssoError"`
}

// GettableInvitation overrides base object and adds precheck into
// response
type GettableInvitation struct {
	*basemodel.InvitationResponseObject
	Precheck *PrecheckResponse `json:"precheck"`
}

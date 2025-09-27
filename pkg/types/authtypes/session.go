package authtypes

import "github.com/SigNoz/signoz/pkg/valuer"

type SessionContext struct {
	SSO             bool        `json:"sso"`
	SSOUrl          string      `json:"ssoUrl"`
	CanSelfRegister bool        `json:"canSelfRegister"`
	IsUser          bool        `json:"isUser"`
	SelectOrg       bool        `json:"selectOrg"`
	OrgID           valuer.UUID `json:"orgId"`
}

func NewSessionContext() *SessionContext {
	return &SessionContext{SSO: false, SSOUrl: "", CanSelfRegister: false, IsUser: true, SelectOrg: false, OrgID: valuer.UUID{}}
}

package authtypes

type SessionContext struct {
	SSO             bool   `json:"sso"`
	SSOUrl          string `json:"ssoUrl"`
	CanSelfRegister bool   `json:"canSelfRegister"`
	IsUser          bool   `json:"isUser"`
	SelectOrg       bool   `json:"selectOrg"`
}

func NewSessionContext() *SessionContext {
	return &SessionContext{SSO: false, SSOUrl: "", CanSelfRegister: false, IsUser: true, SelectOrg: false}
}

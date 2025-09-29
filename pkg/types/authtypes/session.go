package authtypes

import "github.com/SigNoz/signoz/pkg/valuer"

type SessionContext struct {
	Exists        bool                 `json:"exists"`
	Organizations []*OrgSessionContext `json:"orgs"`
}

type OrgSessionContext struct {
	ID            valuer.UUID             `json:"id"`
	Name          string                  `json:"name"`
	AuthNSupports map[string]AuthNSupport `json:"authNSupports"`
}

type AuthNSupport struct {
	Callback map[AuthNProvider]CallbackAuthNSupport `json:"callback,omitempty"`
	Password map[AuthNProvider]PasswordAuthNSupport `json:"password,omitempty"`
}

type CallbackAuthNSupport struct {
	Provider AuthNProvider `json:"provider"`
	URL      string        `json:"url"`
}

type PasswordAuthNSupport struct {
	Provider AuthNProvider `json:"provider"`
}

func NewSessionContext() *SessionContext {
	return &SessionContext{Exists: false, Organizations: []*OrgSessionContext{}}
}

func NewOrgSessionContext(orgID valuer.UUID, name string) *OrgSessionContext {
	return &OrgSessionContext{ID: orgID, Name: name, AuthNSupports: map[string]AuthNSupport{
		"password": {Password: map[AuthNProvider]PasswordAuthNSupport{}},
		"callback": {Callback: map[AuthNProvider]CallbackAuthNSupport{}},
	}}
}

func (s *SessionContext) AddOrgContext(orgContext *OrgSessionContext) *SessionContext {
	s.Organizations = append(s.Organizations, orgContext)
	return s
}

func (s *OrgSessionContext) AddPasswordAuthNSupport(provider AuthNProvider) *OrgSessionContext {
	s.AuthNSupports["password"].Password[provider] = PasswordAuthNSupport{Provider: provider}
	return s
}

func (s *OrgSessionContext) AddCallbackAuthNSupport(provider AuthNProvider, url string) *OrgSessionContext {
	s.AuthNSupports["callback"].Callback[provider] = CallbackAuthNSupport{Provider: provider, URL: url}
	return s
}

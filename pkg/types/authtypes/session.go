package authtypes

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type DeprecatedPostableLogin struct {
	Email    valuer.Email `json:"email"`
	Password string       `json:"password"`
}

type DeprecatedGettableLogin struct {
	AccessJWT string `json:"accessJwt"`
	UserID    string `json:"userId"`
}

type SessionContext struct {
	Exists bool                 `json:"exists"`
	Orgs   []*OrgSessionContext `json:"orgs"`
}

type OrgSessionContext struct {
	ID           valuer.UUID  `json:"id"`
	Name         string       `json:"name"`
	AuthNSupport AuthNSupport `json:"authNSupport"`
	Warning      *errors.JSON `json:"warning,omitempty"`
}

type AuthNSupport struct {
	Callback []CallbackAuthNSupport `json:"callback"`
	Password []PasswordAuthNSupport `json:"password"`
}

type CallbackAuthNSupport struct {
	Provider AuthNProvider `json:"provider"`
	URL      string        `json:"url"`
}

type PasswordAuthNSupport struct {
	Provider AuthNProvider `json:"provider"`
}

func NewSessionContext() *SessionContext {
	return &SessionContext{Exists: false, Orgs: []*OrgSessionContext{}}
}

func NewOrgSessionContext(orgID valuer.UUID, name string) *OrgSessionContext {
	return &OrgSessionContext{
		ID:   orgID,
		Name: name,
		AuthNSupport: AuthNSupport{
			Password: []PasswordAuthNSupport{},
			Callback: []CallbackAuthNSupport{},
		},
		Warning: nil,
	}
}

func (s *SessionContext) AddOrgContext(orgContext *OrgSessionContext) *SessionContext {
	s.Orgs = append(s.Orgs, orgContext)
	return s
}

func (s *OrgSessionContext) AddPasswordAuthNSupport(provider AuthNProvider) *OrgSessionContext {
	s.AuthNSupport.Password = append(s.AuthNSupport.Password, PasswordAuthNSupport{Provider: provider})
	return s
}

func (s *OrgSessionContext) AddCallbackAuthNSupport(provider AuthNProvider, url string) *OrgSessionContext {
	s.AuthNSupport.Callback = append(s.AuthNSupport.Callback, CallbackAuthNSupport{Provider: provider, URL: url})
	return s
}

func (s *OrgSessionContext) AddWarning(warning error) *OrgSessionContext {
	s.Warning = errors.AsJSON(warning)
	return s
}

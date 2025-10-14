package authtypes

import (
	"context"
	"encoding/json"
	"regexp"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

const (
	authDomainNameRegexString string = `^([a-zA-Z0-9]{1}[a-zA-Z0-9-]{0,62}){1}(\.[a-zA-Z0-9]{1}[a-zA-Z0-9-]{0,62})*?$`
)

var (
	authDomainNameRegex = regexp.MustCompile(authDomainNameRegexString)
)

var (
	ErrCodeAuthDomainInvalidConfig = errors.MustNewCode("auth_domain_invalid_config")
	ErrCodeAuthDomainInvalidName   = errors.MustNewCode("auth_domain_invalid_name")
	ErrCodeAuthDomainMismatch      = errors.MustNewCode("auth_domain_mismatch")
	ErrCodeAuthDomainNotFound      = errors.MustNewCode("auth_domain_not_found")
	ErrCodeAuthDomainAlreadyExists = errors.MustNewCode("auth_domain_already_exists")
)

type GettableAuthDomain struct {
	*StorableAuthDomain
	*AuthDomainConfig
}

type PostableAuthDomain struct {
	Config AuthDomainConfig `json:"config"`
	Name   string           `json:"name"`
}

type UpdateableAuthDomain struct {
	Config AuthDomainConfig `json:"config"`
}

type StorableAuthDomain struct {
	bun.BaseModel `bun:"table:org_domains"`

	types.Identifiable
	Name  string      `bun:"name" json:"name"`
	Data  string      `bun:"data" json:"-"`
	OrgID valuer.UUID `bun:"org_id" json:"orgId"`
	types.TimeAuditable
}

type AuthDomainConfig struct {
	SSOEnabled    bool          `json:"ssoEnabled"`
	AuthNProvider AuthNProvider `json:"ssoType"`
	SAML          *SamlConfig   `json:"samlConfig"`
	Google        *GoogleConfig `json:"googleAuthConfig"`
	OIDC          *OIDCConfig   `json:"oidcConfig"`
}

type AuthDomain struct {
	storableAuthDomain *StorableAuthDomain
	authDomainConfig   *AuthDomainConfig
}

func NewAuthDomainFromConfig(name string, config *AuthDomainConfig, orgID valuer.UUID) (*AuthDomain, error) {
	data, err := json.Marshal(config)
	if err != nil {
		return nil, err
	}

	return NewAuthDomain(name, string(data), orgID)
}

func NewAuthDomain(name string, data string, orgID valuer.UUID) (*AuthDomain, error) {
	storableAuthDomain := &StorableAuthDomain{
		Identifiable: types.Identifiable{
			ID: valuer.GenerateUUID(),
		},
		Name:  name,
		Data:  data,
		OrgID: orgID,
		TimeAuditable: types.TimeAuditable{
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
	}

	return NewAuthDomainFromStorableAuthDomain(storableAuthDomain)
}

func NewAuthDomainFromStorableAuthDomain(storableAuthDomain *StorableAuthDomain) (*AuthDomain, error) {
	authDomainConfig := new(AuthDomainConfig)
	if err := json.Unmarshal([]byte(storableAuthDomain.Data), authDomainConfig); err != nil {
		return nil, err
	}

	return &AuthDomain{
		storableAuthDomain: storableAuthDomain,
		authDomainConfig:   authDomainConfig,
	}, nil
}

func NewGettableAuthDomainFromAuthDomain(authDomain *AuthDomain) *GettableAuthDomain {
	return &GettableAuthDomain{
		StorableAuthDomain: authDomain.StorableAuthDomain(),
		AuthDomainConfig:   authDomain.AuthDomainConfig(),
	}
}

func (typ *AuthDomain) StorableAuthDomain() *StorableAuthDomain {
	return typ.storableAuthDomain
}

func (typ *AuthDomain) AuthDomainConfig() *AuthDomainConfig {
	return typ.authDomainConfig
}

func (typ *AuthDomain) Update(config *AuthDomainConfig) error {
	data, err := json.Marshal(config)
	if err != nil {
		return err
	}

	typ.authDomainConfig = config
	typ.storableAuthDomain.Data = string(data)
	typ.storableAuthDomain.UpdatedAt = time.Now()
	return nil
}

func (typ *PostableAuthDomain) UnmarshalJSON(data []byte) error {
	type Alias PostableAuthDomain

	var temp Alias
	if err := json.Unmarshal(data, &temp); err != nil {
		return err
	}

	if !authDomainNameRegex.MatchString(temp.Name) {
		return errors.Newf(errors.TypeInvalidInput, ErrCodeAuthDomainInvalidName, "invalid domain name %s", temp.Name)
	}

	*typ = PostableAuthDomain(temp)
	return nil
}

func (typ *AuthDomainConfig) UnmarshalJSON(data []byte) error {
	type Alias AuthDomainConfig

	var temp Alias
	if err := json.Unmarshal(data, &temp); err != nil {
		return err
	}

	switch temp.AuthNProvider {
	case AuthNProviderGoogleAuth:
		if temp.Google == nil {
			return errors.Newf(errors.TypeInvalidInput, ErrCodeAuthDomainInvalidConfig, "google auth config is required")
		}

	case AuthNProviderSAML:
		if temp.SAML == nil {
			return errors.Newf(errors.TypeInvalidInput, ErrCodeAuthDomainInvalidConfig, "saml config is required")
		}

	case AuthNProviderOIDC:
		if temp.OIDC == nil {
			return errors.Newf(errors.TypeInvalidInput, ErrCodeAuthDomainInvalidConfig, "oidc config is required")
		}

	default:
		return errors.Newf(errors.TypeInvalidInput, ErrCodeAuthDomainInvalidConfig, "invalid authn provider %q", temp.AuthNProvider.StringValue())
	}

	*typ = AuthDomainConfig(temp)
	return nil

}

type AuthDomainStore interface {
	// Get by id.
	Get(context.Context, valuer.UUID) (*AuthDomain, error)

	// Get by orgID and id.
	GetByOrgIDAndID(context.Context, valuer.UUID, valuer.UUID) (*AuthDomain, error)

	// Get by name.
	GetByName(context.Context, string) (*AuthDomain, error)

	// Get by name and orgID.
	GetByNameAndOrgID(context.Context, string, valuer.UUID) (*AuthDomain, error)

	// List org domains by orgID.
	ListByOrgID(context.Context, valuer.UUID) ([]*AuthDomain, error)

	// Create auth domain.
	Create(context.Context, *AuthDomain) error

	// Update by orgID and id.
	Update(context.Context, *AuthDomain) error

	// Delete by orgID and id.
	Delete(context.Context, valuer.UUID, valuer.UUID) error
}

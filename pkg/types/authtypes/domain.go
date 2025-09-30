package authtypes

import (
	"context"
	"encoding/json"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

var (
	ErrCodeAuthDomainInvalidConfig = errors.MustNewCode("auth_domain_invalid_config")
	ErrCodeAuthDomainMismatch      = errors.MustNewCode("auth_domain_mismatch")
	ErrCodeAuthDomainNotFound      = errors.MustNewCode("auth_domain_not_found")
	ErrCodeAuthDomainAlreadyExists = errors.MustNewCode("auth_domain_already_exists")
)

type GettableAuthDomain struct {
	*StorableAuthDomain
	*AuthDomainConfig
}

type PostableAuthDomain struct {
	AuthDomainConfig
	Name string `json:"name"`
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

func NewAuthDomainFromConfig(name string, config AuthDomainConfig, orgID valuer.UUID) (*AuthDomain, error) {
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

type AuthDomainStore interface {
	// Get org domain by id.
	Get(ctx context.Context, id valuer.UUID) (*AuthDomain, error)

	// Get by name.
	GetByName(ctx context.Context, name string) (*AuthDomain, error)

	// Get by name and orgID.
	GetByNameAndOrgID(ctx context.Context, name string, orgID valuer.UUID) (*AuthDomain, error)

	// List org domains by orgID.
	ListByOrgID(ctx context.Context, orgId valuer.UUID) ([]*AuthDomain, error)

	// Create auth domain.
	Create(ctx context.Context, domain *AuthDomain) error

	// Update by id.
	Update(ctx context.Context, domain *AuthDomain) error

	// Delete by id.
	Delete(ctx context.Context, id valuer.UUID) error
}

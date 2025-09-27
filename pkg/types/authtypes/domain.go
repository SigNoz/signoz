package authtypes

import (
	"context"
	"encoding/json"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/ssotypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/gofrs/uuid"
	"github.com/uptrace/bun"
)

var (
	ErrCodeOrgDomainInvalidConfig = errors.MustNewCode("org_domain_invalid_config")
	ErrCodeOrgDomainMismatch      = errors.MustNewCode("org_domain_mismatch")
	ErrCodeOrgDomainNotFound      = errors.MustNewCode("org_domain_not_found")
)

type StorableOrgDomain struct {
	bun.BaseModel `bun:"table:org_domains"`

	types.Identifiable
	Name  string      `bun:"name"`
	Data  string      `bun:"data"`
	OrgID valuer.UUID `bun:"org_id"`
	types.TimeAuditable
}

type OrgDomainConfig struct {
	SSOEnabled    bool                        `json:"ssoEnabled"`
	AuthNProvider AuthNProvider               `json:"ssoType"`
	SAML          *ssotypes.SamlConfig        `json:"samlConfig"`
	Google        *ssotypes.GoogleOAuthConfig `json:"googleAuthConfig"`
}

type OrgDomain struct {
	storableOrgDomain *StorableOrgDomain
	orgDomainConfig   *OrgDomainConfig
}

func NewOrgDomain(name string, data string, orgID valuer.UUID) (*OrgDomain, error) {
	storableOrgDomain := &StorableOrgDomain{
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

	return NewOrgDomainFromStorableOrgDomain(storableOrgDomain)
}

func NewOrgDomainFromStorableOrgDomain(storableOrgDomain *StorableOrgDomain) (*OrgDomain, error) {
	orgDomainConfig := new(OrgDomainConfig)
	if err := json.Unmarshal([]byte(storableOrgDomain.Data), orgDomainConfig); err != nil {
		return nil, err
	}

	return &OrgDomain{
		storableOrgDomain: storableOrgDomain,
		orgDomainConfig:   orgDomainConfig,
	}, nil
}

func (typ *OrgDomain) StorableOrgDomain() *StorableOrgDomain {
	return typ.storableOrgDomain
}

func (typ *OrgDomain) OrgDomainConfig() *OrgDomainConfig {
	return typ.orgDomainConfig
}

type OrgDomainStore interface {
	GetOrgDomainByNameAndOrgID(ctx context.Context, name string, orgID valuer.UUID) (*StorableOrgDomain, error)
	GetDomainByName(ctx context.Context, name string) (*StorableOrgDomain, error)
	ListDomains(ctx context.Context, orgId valuer.UUID) ([]*GettableOrgDomain, error)
	GetDomain(ctx context.Context, id uuid.UUID) (*GettableOrgDomain, error)
	CreateDomain(ctx context.Context, d *GettableOrgDomain) error
	UpdateDomain(ctx context.Context, domain *GettableOrgDomain) error
	DeleteDomain(ctx context.Context, id uuid.UUID) error
}

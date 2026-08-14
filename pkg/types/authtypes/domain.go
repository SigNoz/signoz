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
	StorableAuthDomain
	Enabled           bool               `json:"enabled"`
	Config            AuthDomainConfig   `json:"config"`
	RoleMapping       *RoleMapping       `json:"roleMapping"`
	AuthNProviderInfo *AuthNProviderInfo `json:"authNProviderInfo"`
}

type AuthNProviderInfo struct {
	RelayStatePath *string `json:"relayStatePath"`
}

type PostableAuthDomain struct {
	Name        string           `json:"name" required:"true"`
	Enabled     bool             `json:"enabled"`
	Config      AuthDomainConfig `json:"config" required:"true"`
	RoleMapping *RoleMapping     `json:"roleMapping"`
}

type UpdatableAuthDomain struct {
	Enabled     bool             `json:"enabled"`
	Config      AuthDomainConfig `json:"config" required:"true"`
	RoleMapping *RoleMapping     `json:"roleMapping"`
}

type StorableAuthDomain struct {
	bun.BaseModel `bun:"table:auth_domain"`

	types.Identifiable
	Name  string      `bun:"name" json:"name"`
	Data  string      `bun:"data" json:"-"`
	OrgID valuer.UUID `bun:"org_id" json:"orgId"`
	types.TimeAuditable
}

type AuthDomain struct {
	storableAuthDomain       *StorableAuthDomain
	storableAuthDomainConfig *StorableAuthDomainConfig
}

func NewAuthDomainFromPostableAuthDomain(postableAuthDomain *PostableAuthDomain, orgID valuer.UUID) (*AuthDomain, error) {
	storableAuthDomainConfig := &StorableAuthDomainConfig{
		Enabled:     postableAuthDomain.Enabled,
		Config:      postableAuthDomain.Config,
		RoleMapping: postableAuthDomain.RoleMapping,
	}

	data, err := json.Marshal(storableAuthDomainConfig)
	if err != nil {
		return nil, err
	}

	return &AuthDomain{
		storableAuthDomain: &StorableAuthDomain{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			Name:  postableAuthDomain.Name,
			Data:  string(data),
			OrgID: orgID,
			TimeAuditable: types.TimeAuditable{
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
			},
		},
		storableAuthDomainConfig: storableAuthDomainConfig,
	}, nil
}

func NewAuthDomainFromStorableAuthDomain(storableAuthDomain *StorableAuthDomain) (*AuthDomain, error) {
	storableAuthDomainConfig := new(StorableAuthDomainConfig)
	if err := json.Unmarshal([]byte(storableAuthDomain.Data), storableAuthDomainConfig); err != nil {
		return nil, err
	}

	return &AuthDomain{
		storableAuthDomain:       storableAuthDomain,
		storableAuthDomainConfig: storableAuthDomainConfig,
	}, nil
}

func NewGettableAuthDomainFromAuthDomain(authDomain *AuthDomain, authNProviderInfo *AuthNProviderInfo) *GettableAuthDomain {
	return &GettableAuthDomain{
		StorableAuthDomain: *authDomain.StorableAuthDomain(),
		Enabled:            authDomain.Enabled(),
		Config:             authDomain.Config(),
		RoleMapping:        authDomain.RoleMapping(),
		AuthNProviderInfo:  authNProviderInfo,
	}
}

func (typ *AuthDomain) StorableAuthDomain() *StorableAuthDomain {
	return typ.storableAuthDomain
}

func (typ *AuthDomain) Enabled() bool {
	return typ.storableAuthDomainConfig.Enabled
}

func (typ *AuthDomain) Kind() AuthNProvider {
	return typ.storableAuthDomainConfig.Config.Kind
}

func (typ *AuthDomain) Config() AuthDomainConfig {
	return typ.storableAuthDomainConfig.Config
}

func (typ *AuthDomain) RoleMapping() *RoleMapping {
	return typ.storableAuthDomainConfig.RoleMapping
}

func (typ *AuthDomain) Update(updatableAuthDomain *UpdatableAuthDomain) error {
	storableAuthDomainConfig := &StorableAuthDomainConfig{
		Enabled:     updatableAuthDomain.Enabled,
		Config:      updatableAuthDomain.Config,
		RoleMapping: updatableAuthDomain.RoleMapping,
	}

	data, err := json.Marshal(storableAuthDomainConfig)
	if err != nil {
		return err
	}

	typ.storableAuthDomainConfig = storableAuthDomainConfig
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

	// A present config always carries a kind (its UnmarshalJSON rejects
	// anything else), so a zero kind means the key was absent.
	if temp.Config.Kind.IsZero() {
		return errors.Newf(errors.TypeInvalidInput, ErrCodeAuthDomainInvalidConfig, "config is required")
	}

	*typ = PostableAuthDomain(temp)
	return nil
}

func (typ *UpdatableAuthDomain) UnmarshalJSON(data []byte) error {
	type Alias UpdatableAuthDomain

	var temp Alias
	if err := json.Unmarshal(data, &temp); err != nil {
		return err
	}

	// A present config always carries a kind (its UnmarshalJSON rejects
	// anything else), so a zero kind means the key was absent.
	if temp.Config.Kind.IsZero() {
		return errors.Newf(errors.TypeInvalidInput, ErrCodeAuthDomainInvalidConfig, "config is required")
	}

	*typ = UpdatableAuthDomain(temp)
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

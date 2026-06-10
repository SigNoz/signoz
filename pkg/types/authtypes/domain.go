package authtypes

import (
	"context"
	"encoding/json"
	"regexp"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/swaggest/jsonschema-go"
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
	AuthDomainConfig
	AuthNProviderInfo *AuthNProviderInfo `json:"authNProviderInfo"`
}

type AuthNProviderInfo struct {
	RelayStatePath *string `json:"relayStatePath"`
}

type PostableAuthDomain struct {
	Name string `json:"name"`
	AuthDomainConfig
}

type UpdatableAuthDomain struct {
	AuthDomainConfig
}

type StorableAuthDomain struct {
	bun.BaseModel `bun:"table:auth_domain"`

	types.Identifiable
	Name  string      `bun:"name" json:"name"`
	Data  string      `bun:"data" json:"-"`
	OrgID valuer.UUID `bun:"org_id" json:"orgId"`
	types.TimeAuditable
}

type AuthDomainConfig struct {
	SSOEnabled  bool                 `json:"ssoEnabled"`
	RoleMapping *RoleMapping         `json:"roleMapping,omitempty"`
	Provider    AuthProviderEnvelope `json:"provider"`
}

func (config AuthDomainConfig) Saml() *SAMLConfig {
	cfg, _ := config.Provider.Config.(*SAMLConfig)
	return cfg
}

func (config AuthDomainConfig) Google() *GoogleConfig {
	cfg, _ := config.Provider.Config.(*GoogleConfig)
	return cfg
}

func (config AuthDomainConfig) Oidc() *OIDCConfig {
	cfg, _ := config.Provider.Config.(*OIDCConfig)
	return cfg
}

type AuthProviderEnvelope struct {
	Type   AuthNProvider `json:"type" required:"true"`
	Config any           `json:"config" required:"true"` // this can be either of SamlConfig, OIDCConfig and GoogleConfig
}

// internal - drives the oneOf thing in open api spec.
type authProviderSAML struct {
	Type   AuthNProvider `json:"type" required:"true"`
	Config SAMLConfig    `json:"config" required:"true"`
}

type authProviderOIDC struct {
	Type   AuthNProvider `json:"type" required:"true"`
	Config OIDCConfig    `json:"config" required:"true"`
}

type authProviderGoogle struct {
	Type   AuthNProvider `json:"type" required:"true"`
	Config GoogleConfig  `json:"config" required:"true"`
}

var (
	_ jsonschema.OneOfExposer = AuthProviderEnvelope{}
	_ jsonschema.Preparer     = AuthProviderEnvelope{}
)

func (AuthProviderEnvelope) JSONSchemaOneOf() []any {
	return []any{
		authProviderSAML{},
		authProviderOIDC{},
		authProviderGoogle{},
	}
}

func (AuthProviderEnvelope) PrepareJSONSchema(schema *jsonschema.Schema) error {
	if schema.ExtraProperties == nil {
		schema.ExtraProperties = map[string]any{}
	}

	schema.ExtraProperties["x-signoz-discriminator"] = map[string]any{
		"propertyName": "type",
		"mapping": map[string]string{
			"saml":        "#/components/schemas/AuthtypesAuthProviderSAML",
			"oidc":        "#/components/schemas/AuthtypesAuthProviderOIDC",
			"google_auth": "#/components/schemas/AuthtypesAuthProviderGoogle",
		},
	}

	return nil
}

func (envelop *AuthProviderEnvelope) UnmarshalJSON(data []byte) error {
	var raw struct {
		Type   AuthNProvider   `json:"type"`
		Config json.RawMessage `json:"config"`
	}

	if err := json.Unmarshal(data, &raw); err != nil {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "failed to unmarshal auth provider: %v", err)
	}

	envelop.Type = raw.Type

	switch raw.Type {
	case AuthNProviderSAML:
		cfg := new(SAMLConfig)
		if err := json.Unmarshal(raw.Config, cfg); err != nil {
			return err
		}
		envelop.Config = cfg
	case AuthNProviderOIDC:
		cfg := new(OIDCConfig)
		if err := json.Unmarshal(raw.Config, cfg); err != nil {
			return err
		}
		envelop.Config = cfg
	case AuthNProviderGoogleAuth:
		cfg := new(GoogleConfig)
		if err := json.Unmarshal(raw.Config, cfg); err != nil {
			return err
		}
		envelop.Config = cfg
	default:
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "unknown auth provider type: %s", raw.Type.StringValue())
	}

	return nil
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

func NewGettableAuthDomainFromAuthDomain(authDomain *AuthDomain, authNProviderInfo *AuthNProviderInfo) *GettableAuthDomain {
	return &GettableAuthDomain{
		StorableAuthDomain: *authDomain.StorableAuthDomain(),
		AuthDomainConfig:   *authDomain.AuthDomainConfig(),
		AuthNProviderInfo:  authNProviderInfo,
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

	if temp.Provider.Config == nil {
		return errors.Newf(errors.TypeInvalidInput, ErrCodeAuthDomainInvalidConfig, "provider config is required")
	}

	*typ = PostableAuthDomain(temp)
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

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

type AuthDomainConfig struct {
	Kind AuthNProvider `json:"kind" required:"true"`
	Spec any           `json:"spec" required:"true"`
}

// authDomainConfigSAML is the OpenAPI schema for an AuthDomainConfig with kind=saml.
type authDomainConfigSAML struct {
	Kind AuthNProvider `json:"kind" description:"The kind of authn provider." required:"true"`
	Spec SamlConfig    `json:"spec" description:"The saml configuration." required:"true"`
}

// authDomainConfigGoogle is the OpenAPI schema for an AuthDomainConfig with kind=google.
type authDomainConfigGoogle struct {
	Kind AuthNProvider `json:"kind" description:"The kind of authn provider." required:"true"`
	Spec GoogleConfig  `json:"spec" description:"The google auth configuration." required:"true"`
}

// authDomainConfigOIDC is the OpenAPI schema for an AuthDomainConfig with kind=oidc.
type authDomainConfigOIDC struct {
	Kind AuthNProvider `json:"kind" description:"The kind of authn provider." required:"true"`
	Spec OIDCConfig    `json:"spec" description:"The oidc configuration." required:"true"`
}

var (
	_ jsonschema.OneOfExposer = AuthDomainConfig{}
	_ jsonschema.Preparer     = AuthDomainConfig{}
)

// JSONSchemaOneOf returns the oneOf variants for the AuthDomainConfig discriminated union.
// Each variant represents a different authn provider kind with its corresponding spec schema.
func (AuthDomainConfig) JSONSchemaOneOf() []any {
	return []any{
		authDomainConfigSAML{},
		authDomainConfigGoogle{},
		authDomainConfigOIDC{},
	}
}

// PrepareJSONSchema marks the schema with x-signoz-discriminator;
// signoz.attachDiscriminators promotes it to a real OpenAPI 3
// discriminator after reflection.
func (AuthDomainConfig) PrepareJSONSchema(schema *jsonschema.Schema) error {
	if schema.ExtraProperties == nil {
		schema.ExtraProperties = map[string]any{}
	}

	schema.ExtraProperties["x-signoz-discriminator"] = map[string]any{
		"propertyName": "kind",
		"mapping": map[string]string{
			AuthNProviderSAML.StringValue():   "#/components/schemas/AuthtypesAuthDomainConfigSAML",
			AuthNProviderGoogle.StringValue(): "#/components/schemas/AuthtypesAuthDomainConfigGoogle",
			AuthNProviderOIDC.StringValue():   "#/components/schemas/AuthtypesAuthDomainConfigOIDC",
		},
	}

	return nil
}

// StorableAuthDomainConfig is the JSON document persisted in StorableAuthDomain.Data.
// Its shape (and the shapes it nests) must stay backward compatible with existing rows.
type StorableAuthDomainConfig struct {
	SSOEnabled    bool                `json:"ssoEnabled"`
	AuthNProvider AuthNProvider       `json:"ssoType"`
	SAML          *StorableSamlConfig `json:"samlConfig"`
	Google        *GoogleConfig       `json:"googleAuthConfig"`
	OIDC          *OIDCConfig         `json:"oidcConfig"`
	RoleMapping   *RoleMapping        `json:"roleMapping"`
}

// storableAuthNProviderGoogle is the value persisted in ssoType for google domains,
// kept for compatibility with rows written before the provider was renamed.
var storableAuthNProviderGoogle = AuthNProvider{valuer.NewString("google_auth")}

type AuthDomain struct {
	storableAuthDomain       *StorableAuthDomain
	storableAuthDomainConfig *StorableAuthDomainConfig
}

func NewAuthDomainFromPostableAuthDomain(postableAuthDomain *PostableAuthDomain, orgID valuer.UUID) (*AuthDomain, error) {
	storableAuthDomainConfig, err := newStorableAuthDomainConfig(postableAuthDomain.Enabled, postableAuthDomain.Config, postableAuthDomain.RoleMapping)
	if err != nil {
		return nil, err
	}

	data, err := json.Marshal(storableAuthDomainConfig)
	if err != nil {
		return nil, err
	}

	return NewAuthDomain(postableAuthDomain.Name, string(data), orgID)
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
	storableAuthDomainConfig := new(StorableAuthDomainConfig)
	if err := json.Unmarshal([]byte(storableAuthDomain.Data), storableAuthDomainConfig); err != nil {
		return nil, err
	}

	return &AuthDomain{
		storableAuthDomain:       storableAuthDomain,
		storableAuthDomainConfig: storableAuthDomainConfig,
	}, nil
}

func NewGettableAuthDomainFromAuthDomain(authDomain *AuthDomain, authNProviderInfo *AuthNProviderInfo) (*GettableAuthDomain, error) {
	config, err := newAuthDomainConfigFromStorableAuthDomainConfig(authDomain.StorableAuthDomainConfig())
	if err != nil {
		return nil, err
	}

	return &GettableAuthDomain{
		StorableAuthDomain: *authDomain.StorableAuthDomain(),
		Enabled:            authDomain.StorableAuthDomainConfig().SSOEnabled,
		Config:             config,
		RoleMapping:        authDomain.StorableAuthDomainConfig().RoleMapping,
		AuthNProviderInfo:  authNProviderInfo,
	}, nil
}

func newStorableAuthDomainConfig(enabled bool, config AuthDomainConfig, roleMapping *RoleMapping) (*StorableAuthDomainConfig, error) {
	storableAuthDomainConfig := &StorableAuthDomainConfig{
		SSOEnabled:    enabled,
		AuthNProvider: config.Kind,
		RoleMapping:   roleMapping,
	}

	switch config.Kind {
	case AuthNProviderSAML:
		spec, ok := config.Spec.(SamlConfig)
		if !ok {
			return nil, errors.Newf(errors.TypeInvalidInput, ErrCodeAuthDomainInvalidConfig, "saml config is required")
		}

		samlConfig := StorableSamlConfig(spec)
		storableAuthDomainConfig.SAML = &samlConfig

	case AuthNProviderGoogle:
		spec, ok := config.Spec.(GoogleConfig)
		if !ok {
			return nil, errors.Newf(errors.TypeInvalidInput, ErrCodeAuthDomainInvalidConfig, "google auth config is required")
		}

		storableAuthDomainConfig.Google = &spec

	case AuthNProviderOIDC:
		spec, ok := config.Spec.(OIDCConfig)
		if !ok {
			return nil, errors.Newf(errors.TypeInvalidInput, ErrCodeAuthDomainInvalidConfig, "oidc config is required")
		}

		storableAuthDomainConfig.OIDC = &spec

	default:
		return nil, errors.Newf(errors.TypeInvalidInput, ErrCodeAuthDomainInvalidConfig, "invalid authn provider %q", config.Kind.StringValue())
	}

	return storableAuthDomainConfig, nil
}

func newAuthDomainConfigFromStorableAuthDomainConfig(storableAuthDomainConfig *StorableAuthDomainConfig) (AuthDomainConfig, error) {
	switch storableAuthDomainConfig.AuthNProvider {
	case AuthNProviderSAML:
		return AuthDomainConfig{Kind: AuthNProviderSAML, Spec: SamlConfig(*storableAuthDomainConfig.SAML)}, nil

	case AuthNProviderGoogle:
		return AuthDomainConfig{Kind: AuthNProviderGoogle, Spec: *storableAuthDomainConfig.Google}, nil

	case AuthNProviderOIDC:
		return AuthDomainConfig{Kind: AuthNProviderOIDC, Spec: *storableAuthDomainConfig.OIDC}, nil

	default:
		return AuthDomainConfig{}, errors.Newf(errors.TypeInternal, ErrCodeAuthDomainInvalidConfig, "invalid authn provider %q", storableAuthDomainConfig.AuthNProvider.StringValue())
	}
}

func (typ *AuthDomain) StorableAuthDomain() *StorableAuthDomain {
	return typ.storableAuthDomain
}

func (typ *AuthDomain) StorableAuthDomainConfig() *StorableAuthDomainConfig {
	return typ.storableAuthDomainConfig
}

func (typ *AuthDomain) Update(updatableAuthDomain *UpdatableAuthDomain) error {
	storableAuthDomainConfig, err := newStorableAuthDomainConfig(updatableAuthDomain.Enabled, updatableAuthDomain.Config, updatableAuthDomain.RoleMapping)
	if err != nil {
		return err
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

	*typ = PostableAuthDomain(temp)
	return nil
}

func (typ *AuthDomainConfig) UnmarshalJSON(data []byte) error {
	var raw map[string]json.RawMessage
	if err := json.Unmarshal(data, &raw); err != nil {
		return errors.Wrapf(err, errors.TypeInvalidInput, ErrCodeAuthDomainInvalidConfig, "failed to unmarshal auth domain config")
	}

	kindData, ok := raw["kind"]
	if !ok {
		return errors.Newf(errors.TypeInvalidInput, ErrCodeAuthDomainInvalidConfig, "kind is required")
	}

	var kind AuthNProvider
	if err := json.Unmarshal(kindData, &kind); err != nil {
		return errors.Wrapf(err, errors.TypeInvalidInput, ErrCodeAuthDomainInvalidConfig, "failed to unmarshal kind")
	}

	specData, ok := raw["spec"]
	if !ok {
		return errors.Newf(errors.TypeInvalidInput, ErrCodeAuthDomainInvalidConfig, "spec is required")
	}

	switch kind {
	case AuthNProviderSAML:
		spec := SamlConfig{}
		if err := json.Unmarshal(specData, &spec); err != nil {
			return err
		}

		typ.Spec = spec

	case AuthNProviderGoogle:
		spec := GoogleConfig{}
		if err := json.Unmarshal(specData, &spec); err != nil {
			return err
		}

		typ.Spec = spec

	case AuthNProviderOIDC:
		spec := OIDCConfig{}
		if err := json.Unmarshal(specData, &spec); err != nil {
			return err
		}

		typ.Spec = spec

	default:
		return errors.Newf(errors.TypeInvalidInput, ErrCodeAuthDomainInvalidConfig, "invalid authn provider %q", kind.StringValue())
	}

	typ.Kind = kind
	return nil
}

func (typ StorableAuthDomainConfig) MarshalJSON() ([]byte, error) {
	type Alias StorableAuthDomainConfig

	temp := Alias(typ)
	if temp.AuthNProvider == AuthNProviderGoogle {
		temp.AuthNProvider = storableAuthNProviderGoogle
	}

	return json.Marshal(temp)
}

func (typ *StorableAuthDomainConfig) UnmarshalJSON(data []byte) error {
	type Alias StorableAuthDomainConfig

	var temp Alias
	if err := json.Unmarshal(data, &temp); err != nil {
		return err
	}

	if temp.AuthNProvider == storableAuthNProviderGoogle {
		temp.AuthNProvider = AuthNProviderGoogle
	}

	switch temp.AuthNProvider {
	case AuthNProviderGoogle:
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

	*typ = StorableAuthDomainConfig(temp)
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

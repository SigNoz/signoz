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

// authDomainConfigVariants is the single registry of authn provider kinds:
// UnmarshalJSON, JSONSchemaOneOf and the discriminator mapping all derive from
// it, so a new provider is one entry here plus its authn registration.
var authDomainConfigVariants = []authDomainConfigVariant{
	{
		kind: AuthNProviderSAML,
		decodeSpec: func(data []byte) (any, error) {
			spec := SamlConfig{}
			if err := json.Unmarshal(data, &spec); err != nil {
				return nil, err
			}
			return spec, nil
		},
		schema:    authDomainConfigSAML{},
		schemaRef: "#/components/schemas/AuthtypesAuthDomainConfigSAML",
	},
	{
		kind: AuthNProviderGoogle,
		decodeSpec: func(data []byte) (any, error) {
			spec := GoogleConfig{}
			if err := json.Unmarshal(data, &spec); err != nil {
				return nil, err
			}
			return spec, nil
		},
		schema:    authDomainConfigGoogle{},
		schemaRef: "#/components/schemas/AuthtypesAuthDomainConfigGoogle",
	},
	{
		kind: AuthNProviderOIDC,
		decodeSpec: func(data []byte) (any, error) {
			spec := OIDCConfig{}
			if err := json.Unmarshal(data, &spec); err != nil {
				return nil, err
			}
			return spec, nil
		},
		schema:    authDomainConfigOIDC{},
		schemaRef: "#/components/schemas/AuthtypesAuthDomainConfigOIDC",
	},
}

var (
	_ jsonschema.OneOfExposer = AuthDomainConfig{}
	_ jsonschema.Preparer     = AuthDomainConfig{}
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

// StorableAuthDomainConfig is the JSON document persisted in StorableAuthDomain.Data.
type StorableAuthDomainConfig struct {
	Enabled     bool             `json:"enabled"`
	Config      AuthDomainConfig `json:"config"`
	RoleMapping *RoleMapping     `json:"roleMapping"`
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

type authDomainConfigVariant struct {
	kind       AuthNProvider
	decodeSpec func(data []byte) (any, error)
	schema     any
	schemaRef  string
}

type AuthDomain struct {
	storableAuthDomain       *StorableAuthDomain
	storableAuthDomainConfig *StorableAuthDomainConfig
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

// JSONSchemaOneOf returns the oneOf variants for the AuthDomainConfig discriminated union.
// Each variant represents a different authn provider kind with its corresponding spec schema.
func (AuthDomainConfig) JSONSchemaOneOf() []any {
	oneOf := make([]any, len(authDomainConfigVariants))
	for i, variant := range authDomainConfigVariants {
		oneOf[i] = variant.schema
	}

	return oneOf
}

// PrepareJSONSchema marks the schema with x-signoz-discriminator;
// signoz.attachDiscriminators promotes it to a real OpenAPI 3
// discriminator after reflection.
func (AuthDomainConfig) PrepareJSONSchema(schema *jsonschema.Schema) error {
	if schema.ExtraProperties == nil {
		schema.ExtraProperties = map[string]any{}
	}

	mapping := make(map[string]string, len(authDomainConfigVariants))
	for _, variant := range authDomainConfigVariants {
		mapping[variant.kind.StringValue()] = variant.schemaRef
	}

	schema.ExtraProperties["x-signoz-discriminator"] = map[string]any{
		"propertyName": "kind",
		"mapping":      mapping,
	}

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

	for _, variant := range authDomainConfigVariants {
		if variant.kind != kind {
			continue
		}

		spec, err := variant.decodeSpec(specData)
		if err != nil {
			return err
		}

		typ.Kind = kind
		typ.Spec = spec
		return nil
	}

	return errors.Newf(errors.TypeInvalidInput, ErrCodeAuthDomainInvalidConfig, "invalid authn provider %q", kind.StringValue())
}

func (config AuthDomainConfig) SamlConfig() (SamlConfig, error) {
	spec, ok := config.Spec.(SamlConfig)
	if !ok {
		return SamlConfig{}, errors.Newf(errors.TypeInternal, ErrCodeAuthDomainMismatch, "auth domain config is not saml")
	}

	return spec, nil
}

func (config AuthDomainConfig) GoogleConfig() (GoogleConfig, error) {
	spec, ok := config.Spec.(GoogleConfig)
	if !ok {
		return GoogleConfig{}, errors.Newf(errors.TypeInternal, ErrCodeAuthDomainMismatch, "auth domain config is not google")
	}

	return spec, nil
}

func (config AuthDomainConfig) OIDCConfig() (OIDCConfig, error) {
	spec, ok := config.Spec.(OIDCConfig)
	if !ok {
		return OIDCConfig{}, errors.Newf(errors.TypeInternal, ErrCodeAuthDomainMismatch, "auth domain config is not oidc")
	}

	return spec, nil
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

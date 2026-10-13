package authtypes

import (
	"encoding/json"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/swaggest/jsonschema-go"
)

var (
	_ jsonschema.OneOfExposer = AuthDomainConfig{}
	_ jsonschema.Preparer     = AuthDomainConfig{}
)

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

type authDomainConfigVariant struct {
	kind       AuthNProvider
	decodeSpec func(data []byte) (any, error)
	schema     any
	schemaRef  string
}

type AuthDomainConfig struct {
	Kind AuthNProvider `json:"kind" required:"true"`
	Spec any           `json:"spec" required:"true"`
}

type authDomainConfigSAML struct {
	Kind AuthNProvider `json:"kind" description:"The kind of authn provider." required:"true"`
	Spec SamlConfig    `json:"spec" description:"The saml configuration." required:"true"`
}

type authDomainConfigGoogle struct {
	Kind AuthNProvider `json:"kind" description:"The kind of authn provider." required:"true"`
	Spec GoogleConfig  `json:"spec" description:"The google auth configuration." required:"true"`
}

type authDomainConfigOIDC struct {
	Kind AuthNProvider `json:"kind" description:"The kind of authn provider." required:"true"`
	Spec OIDCConfig    `json:"spec" description:"The oidc configuration." required:"true"`
}

type StorableAuthDomainConfig struct {
	Enabled     bool             `json:"enabled"`
	Config      AuthDomainConfig `json:"config"`
	RoleMapping *RoleMapping     `json:"roleMapping"`
}

func (AuthDomainConfig) JSONSchemaOneOf() []any {
	oneOf := make([]any, len(authDomainConfigVariants))
	for i, variant := range authDomainConfigVariants {
		oneOf[i] = variant.schema
	}

	return oneOf
}

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

package alertmanagertypes

import (
	"encoding/json"
	"reflect"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/swaggest/jsonschema-go"
)

type ChannelConfig struct {
	Kind ChannelKind `json:"kind" required:"true"`
	Spec any         `json:"spec" required:"true"`
}

func (c *ChannelConfig) UnmarshalJSON(data []byte) error {
	var envelope struct {
		Kind ChannelKind `json:"kind"`

		// json.RawMessage keeps spec bytes unparsed until Kind is known. Once
		// Kind is known, this Spec can be decoded into the correct type.
		Spec json.RawMessage `json:"spec"`
	}
	if err := decodeStrict(data, &envelope); err != nil {
		return err
	}
	if len(envelope.Spec) == 0 {
		return errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "config.spec is required")
	}

	spec, ok := buildEmptyChannelSpecForKind(envelope.Kind)
	if !ok {
		return ErrUnsupportedChannelKind(envelope.Kind.StringValue())
	}

	if err := json.Unmarshal(envelope.Spec, spec); err != nil {
		return err
	}

	c.Kind = envelope.Kind
	c.Spec = spec

	return nil
}

func (c ChannelConfig) Validate() error {
	expected, ok := buildEmptyChannelSpecForKind(c.Kind)
	if !ok {
		return ErrUnsupportedChannelKind(c.Kind.StringValue())
	}

	if c.Spec == nil {
		return errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "config.spec is required")
	}

	spec, ok := c.Spec.(ChannelSpec)
	if !ok {
		return errors.NewInternalf(errors.CodeInternal, "config.spec was not decoded into a known type")
	}

	// Only a config assembled in Go gets here, and one can pair a spec with the
	// wrong kind. The conversion to a receiver dispatches on the spec, so the
	// mismatch would silently outrank the declared kind.
	if reflect.TypeOf(spec) != reflect.TypeOf(expected) {
		return errors.NewInternalf(errors.CodeInternal, "config.spec does not match kind %q", c.Kind.StringValue())
	}

	return spec.Validate()
}

// IsZero is what bun's nullzero consults, so a channel with no stored config is
// written as NULL rather than as an envelope with an empty kind.
func (c ChannelConfig) IsZero() bool {
	return c.Kind.IsZero() && c.Spec == nil
}

// ChannelConfigVariant names one branch of the union. Each instantiation becomes
// its own OpenAPI component with kind pinned to the one value it accepts.
type ChannelConfigVariant[S any] struct {
	Kind string `json:"kind" required:"true"`
	Spec S      `json:"spec" required:"true"`
}

func (v ChannelConfigVariant[S]) PrepareJSONSchema(s *jsonschema.Schema) error {
	return restrictKindToOneValue(s, v.Kind)
}

var (
	_ jsonschema.OneOfExposer = ChannelConfig{}
	_ jsonschema.Preparer     = ChannelConfig{}
)

func (ChannelConfig) JSONSchemaOneOf() []any {
	return []any{
		ChannelConfigVariant[ChannelSlackConfig]{Kind: ChannelKindSlack.StringValue()},
		ChannelConfigVariant[ChannelEmailConfig]{Kind: ChannelKindEmail.StringValue()},
		ChannelConfigVariant[ChannelWebhookConfig]{Kind: ChannelKindWebhook.StringValue()},
		ChannelConfigVariant[ChannelPagerdutyConfig]{Kind: ChannelKindPagerduty.StringValue()},
		ChannelConfigVariant[ChannelOpsgenieConfig]{Kind: ChannelKindOpsgenie.StringValue()},
		ChannelConfigVariant[ChannelMSTeamsConfig]{Kind: ChannelKindMSTeams.StringValue()},
		ChannelConfigVariant[ChannelGoogleChatConfig]{Kind: ChannelKindGoogleChat.StringValue()},
		ChannelConfigVariant[ChannelJiraConfig]{Kind: ChannelKindJira.StringValue()},
		ChannelConfigVariant[ChannelJSMOpsConfig]{Kind: ChannelKindJSMOps.StringValue()},
		ChannelConfigVariant[ChannelIncidentIOConfig]{Kind: ChannelKindIncidentIO.StringValue()},
	}
}

// PrepareJSONSchema marks the envelope with x-signoz-discriminator, which
// signoz.attachDiscriminators promotes to a real discriminator after reflection.
func (ChannelConfig) PrepareJSONSchema(s *jsonschema.Schema) error {
	return markDiscriminator(s, "kind", map[string]string{
		ChannelKindSlack.StringValue():      channelVariantRef("ChannelSlackConfig"),
		ChannelKindEmail.StringValue():      channelVariantRef("ChannelEmailConfig"),
		ChannelKindWebhook.StringValue():    channelVariantRef("ChannelWebhookConfig"),
		ChannelKindPagerduty.StringValue():  channelVariantRef("ChannelPagerdutyConfig"),
		ChannelKindOpsgenie.StringValue():   channelVariantRef("ChannelOpsgenieConfig"),
		ChannelKindMSTeams.StringValue():    channelVariantRef("ChannelMSTeamsConfig"),
		ChannelKindGoogleChat.StringValue(): channelVariantRef("ChannelGoogleChatConfig"),
		ChannelKindJira.StringValue():       channelVariantRef("ChannelJiraConfig"),
		ChannelKindJSMOps.StringValue():     channelVariantRef("ChannelJSMOpsConfig"),
		ChannelKindIncidentIO.StringValue(): channelVariantRef("ChannelIncidentIOConfig"),
	})
}

// signozDiscriminatorKey is the extension key that signoz.attachDiscriminators
// promotes into a native OpenAPI 3 discriminator after reflection.
const signozDiscriminatorKey = "x-signoz-discriminator"

// schemaRef builds a local component schema reference for a discriminator mapping.
func schemaRef(name string) string {
	return "#/components/schemas/" + name
}

// channelVariantRef builds the component reference the reflector derives for a
// ChannelConfigVariant instantiation: the generic's name followed by the fully
// qualified type argument.
func channelVariantRef(spec string) string {
	return schemaRef("AlertmanagertypesChannelConfigVariantGithubComSigNozSignozPkgTypesAlertmanagertypes" + spec)
}

// markDiscriminator tags a oneOf schema with x-signoz-discriminator, keyed on
// propertyName with the given value -> schema-ref mapping, so generated clients
// get a discriminated DTO instead of an intersection.
func markDiscriminator(s *jsonschema.Schema, propertyName string, mapping map[string]string) error {
	if s.ExtraProperties == nil {
		s.ExtraProperties = map[string]any{}
	}
	s.ExtraProperties[signozDiscriminatorKey] = map[string]any{
		"propertyName": propertyName,
		"mapping":      mapping,
	}
	return nil
}

// restrictKindToOneValue pins a variant's kind to its single legal value, so
// ChannelConfigVariant[ChannelSlackConfig] only accepts "slack".
func restrictKindToOneValue(schema *jsonschema.Schema, channelType string) error {
	kindProp, ok := schema.Properties["kind"]
	if !ok || kindProp.TypeObject == nil {
		return errors.NewInternalf(errors.CodeInternal, "variant schema missing `kind` property")
	}
	kindProp.TypeObject.WithEnum(channelType)
	schema.Properties["kind"] = kindProp
	return nil
}

package alertmanagertypes

import (
	"bytes"
	"encoding/json"
	"reflect"
	"slices"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/swaggest/jsonschema-go"
)

var (
	ErrCodeChannelUnsupportedKind = errors.MustNewCode("channel_unsupported_kind")
)

// ════════════════════════════════════════════════════════════════════════
// Kind
// ════════════════════════════════════════════════════════════════════════

// ChannelKind selects which ChannelSpec a channel carries and which notifier
// integration is built for it.
type ChannelKind struct {
	valuer.String
}

var (
	ChannelKindSlack      = ChannelKind{valuer.NewString("slack")}
	ChannelKindEmail      = ChannelKind{valuer.NewString("email")}
	ChannelKindWebhook    = ChannelKind{valuer.NewString("webhook")}
	ChannelKindPagerduty  = ChannelKind{valuer.NewString("pagerduty")}
	ChannelKindOpsgenie   = ChannelKind{valuer.NewString("opsgenie")}
	ChannelKindMSTeams    = ChannelKind{valuer.NewString("msteams")}
	ChannelKindGoogleChat = ChannelKind{valuer.NewString("googlechat")}
)

func (ChannelKind) Enum() []any {
	return []any{
		ChannelKindSlack,
		ChannelKindEmail,
		ChannelKindWebhook,
		ChannelKindPagerduty,
		ChannelKindOpsgenie,
		ChannelKindMSTeams,
		ChannelKindGoogleChat,
	}
}

func (t ChannelKind) IsValid() bool {
	return slices.ContainsFunc(t.Enum(), func(v any) bool { return v == t })
}

func ErrUnsupportedChannelKind(s string) error {
	return errors.Newf(
		errors.TypeInvalidInput,
		ErrCodeChannelUnsupportedKind,
		"unknown notification channel kind %q; allowed values: %s",
		s, allowedValuesForChannelKind(),
	)
}

// ════════════════════════════════════════════════════════════════════════
// Union
// ════════════════════════════════════════════════════════════════════════

// ChannelConfig is the discriminated union of per-kind configurations. The
// envelope sits on config rather than the resource root, so clients narrow on
// config.kind instead of every request and response flavor becoming a oneOf.
type ChannelConfig struct {
	Kind ChannelKind `json:"kind" required:"true"`
	Spec any         `json:"spec" required:"true"`
}

func (c ChannelConfig) Validate() error {
	newSpec, ok := channelSpecs[c.Kind]
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

	// A decoded config cannot disagree, because UnmarshalJSON builds the spec
	// from the kind. A caller assembling the struct can, and the conversion to a
	// receiver switches on the spec's type, so a mismatch would silently outrank
	// the declared kind.
	if reflect.TypeOf(spec) != reflect.TypeOf(newSpec()) {
		return errors.NewInternalf(errors.CodeInternal, "config.spec does not match kind %q", c.Kind.StringValue())
	}

	return spec.Validate()
}

func (c *ChannelConfig) UnmarshalJSON(data []byte) error {
	channelKindString, specJSON, err := extractKindAndSpec(data)
	if err != nil {
		return err
	}

	factory, ok := channelSpecs[ChannelKind{valuer.NewString(channelKindString)}]
	if !ok {
		return ErrUnsupportedChannelKind(channelKindString)
	}

	spec, err := decodeChannelSpec(specJSON, factory(), channelKindString)
	if err != nil {
		return err
	}

	c.Kind = ChannelKind{valuer.NewString(channelKindString)}
	c.Spec = *spec

	return nil
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
	})
}

// ════════════════════════════════════════════════════════════════════════
// Specs
// ════════════════════════════════════════════════════════════════════════

// ChannelSpec is implemented by every per-type channel configuration. Exactly
// one implementation is carried by a channel, selected by its ChannelKind.
type ChannelSpec interface {
	Validate() error
}

type ChannelSlackConfig struct {
	SendResolved bool   `json:"sendResolved,omitempty"`
	APIURL       string `json:"apiUrl" required:"true"`
	Channel      string `json:"channel" required:"true"`
	Title        string `json:"title,omitempty"`
	Text         string `json:"text,omitempty"`
}

func (c ChannelSlackConfig) Validate() error {
	if c.APIURL == "" {
		return errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "config.spec.apiUrl is required for a slack channel")
	}

	if c.Channel == "" {
		return errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "config.spec.channel is required for a slack channel")
	}

	return nil
}

// ChannelEmailConfig carries no SMTP transport fields: the smarthost,
// credentials and TLS settings come from the deployment's global config, so a
// channel can only choose recipients and body.
type ChannelEmailConfig struct {
	SendResolved bool              `json:"sendResolved,omitempty"`
	To           string            `json:"to" required:"true"`
	HTML         string            `json:"html,omitempty"`
	Headers      map[string]string `json:"headers,omitempty"`
}

func (c ChannelEmailConfig) Validate() error {
	if c.To == "" {
		return errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "config.spec.to is required for an email channel")
	}

	return nil
}

// ChannelWebhookConfig splits apart the two authentication modes the legacy API
// overloaded onto one password field, where an empty username meant the password
// was really a bearer token.
type ChannelWebhookConfig struct {
	SendResolved bool   `json:"sendResolved,omitempty"`
	URL          string `json:"url" required:"true"`
	Username     string `json:"username,omitempty"`
	Password     string `json:"password,omitempty"`
	BearerToken  string `json:"bearerToken,omitempty"`
}

func (c ChannelWebhookConfig) Validate() error {
	if c.URL == "" {
		return errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "config.spec.url is required for a webhook channel")
	}

	usesBasicAuth := c.Username != "" || c.Password != ""

	if usesBasicAuth && c.BearerToken != "" {
		return errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "config.spec.bearerToken cannot be combined with config.spec.username or config.spec.password")
	}

	if usesBasicAuth && (c.Username == "" || c.Password == "") {
		return errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "config.spec.username and config.spec.password must both be set for basic auth")
	}

	return nil
}

type ChannelPagerdutyConfig struct {
	SendResolved bool   `json:"sendResolved,omitempty"`
	RoutingKey   string `json:"routingKey" required:"true"`
	// URL overrides the PagerDuty Events API endpoint, for proxies and tests.
	URL         string            `json:"url,omitempty"`
	Source      string            `json:"source,omitempty"`
	Client      string            `json:"client,omitempty"`
	ClientURL   string            `json:"clientUrl,omitempty"`
	Description string            `json:"description,omitempty"`
	Severity    string            `json:"severity,omitempty"`
	Component   string            `json:"component,omitempty"`
	Group       string            `json:"group,omitempty"`
	Class       string            `json:"class,omitempty"`
	Details     map[string]string `json:"details,omitempty"`
}

func (c ChannelPagerdutyConfig) Validate() error {
	if c.RoutingKey == "" {
		return errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "config.spec.routingKey is required for a pagerduty channel")
	}

	return nil
}

type ChannelOpsgenieConfig struct {
	SendResolved bool   `json:"sendResolved,omitempty"`
	APIKey       string `json:"apiKey" required:"true"`
	// APIURL selects a non-default Opsgenie region, e.g. https://api.eu.opsgenie.com.
	APIURL      string            `json:"apiUrl,omitempty"`
	Message     string            `json:"message,omitempty"`
	Description string            `json:"description,omitempty"`
	Source      string            `json:"source,omitempty"`
	Priority    string            `json:"priority,omitempty"`
	Details     map[string]string `json:"details,omitempty"`
}

func (c ChannelOpsgenieConfig) Validate() error {
	if c.APIKey == "" {
		return errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "config.spec.apiKey is required for an opsgenie channel")
	}

	return nil
}

type ChannelMSTeamsConfig struct {
	SendResolved bool   `json:"sendResolved,omitempty"`
	WebhookURL   string `json:"webhookUrl" required:"true"`
	Title        string `json:"title,omitempty"`
	Text         string `json:"text,omitempty"`
}

func (c ChannelMSTeamsConfig) Validate() error {
	if c.WebhookURL == "" {
		return errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "config.spec.webhookUrl is required for an msteams channel")
	}

	return nil
}

type ChannelGoogleChatConfig struct {
	SendResolved bool   `json:"sendResolved,omitempty"`
	WebhookURL   string `json:"webhookUrl" required:"true"`
	Title        string `json:"title,omitempty"`
	Text         string `json:"text,omitempty"`
}

func (c ChannelGoogleChatConfig) Validate() error {
	if c.WebhookURL == "" {
		return errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "config.spec.webhookUrl is required for a googlechat channel")
	}

	return nil
}

// ════════════════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════════════════

var channelSpecs = map[ChannelKind]func() ChannelSpec{
	ChannelKindSlack:      func() ChannelSpec { return new(ChannelSlackConfig) },
	ChannelKindEmail:      func() ChannelSpec { return new(ChannelEmailConfig) },
	ChannelKindWebhook:    func() ChannelSpec { return new(ChannelWebhookConfig) },
	ChannelKindPagerduty:  func() ChannelSpec { return new(ChannelPagerdutyConfig) },
	ChannelKindOpsgenie:   func() ChannelSpec { return new(ChannelOpsgenieConfig) },
	ChannelKindMSTeams:    func() ChannelSpec { return new(ChannelMSTeamsConfig) },
	ChannelKindGoogleChat: func() ChannelSpec { return new(ChannelGoogleChatConfig) },
}

func allowedValuesForChannelKind() string {
	values := make([]string, 0, len(channelSpecs))
	for channelType := range channelSpecs {
		values = append(values, "`"+channelType.StringValue()+"`")
	}
	slices.Sort(values)
	return strings.Join(values, ", ")
}

// extractKindAndSpec parses a {"kind": "...", "spec": {...}} envelope. Unknown
// keys are rejected here rather than by the caller's decoder: a custom
// UnmarshalJSON receives raw bytes, so DisallowUnknownFields on the request body
// does not reach inside config.
func extractKindAndSpec(data []byte) (string, []byte, error) {
	var head struct {
		Kind string          `json:"kind"`
		Spec json.RawMessage `json:"spec"`
	}
	dec := json.NewDecoder(bytes.NewReader(data))
	dec.DisallowUnknownFields()
	if err := dec.Decode(&head); err != nil {
		return "", nil, errors.WrapInvalidInputf(err, ErrCodeAlertmanagerChannelInvalid, "invalid channel config envelope")
	}
	return head.Kind, head.Spec, nil
}

// decodeChannelSpec rejects unknown fields so a spec meant for another kind is an
// error rather than a silently empty struct, and validates before returning.
func decodeChannelSpec[T ChannelSpec](specJSON []byte, target T, channelType string) (*T, error) {
	if len(specJSON) == 0 {
		return nil, errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "type %q: spec is required", channelType)
	}
	dec := json.NewDecoder(bytes.NewReader(specJSON))
	dec.DisallowUnknownFields()
	if err := dec.Decode(target); err != nil {
		return nil, errors.WrapInvalidInputf(err, ErrCodeAlertmanagerChannelInvalid, "type %q: invalid spec JSON", channelType)
	}
	if err := target.Validate(); err != nil {
		return nil, errors.WrapInvalidInputf(err, ErrCodeAlertmanagerChannelInvalid, "type %q: %s", channelType, err.Error())
	}
	return &target, nil
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

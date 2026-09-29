package alertmanagertypes

import (
	"bytes"
	"encoding/json"
	"net/url"
	"reflect"
	"slices"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/prometheus/alertmanager/config"
	commoncfg "github.com/prometheus/common/config"
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
	ChannelKindJira       = ChannelKind{valuer.NewString("jira")}
	ChannelKindJSMOps     = ChannelKind{valuer.NewString("jsmops")}
	ChannelKindIncidentIO = ChannelKind{valuer.NewString("incidentio")}
)

func (ChannelKind) Enum() []any {
	kinds := make([]any, 0, len(channelKinds))
	for _, channelKind := range channelKinds {
		kinds = append(kinds, channelKind.kind)
	}
	return kinds
}

func (t ChannelKind) IsValid() bool {
	return slices.ContainsFunc(t.Enum(), func(v any) bool { return v == t })
}

// ToStoredType returns the Channel.Type a channel of this kind is stored under,
// which matches the kind for all but msteams.
func (t ChannelKind) ToStoredType() string {
	if t == ChannelKindMSTeams {
		return "msteamsv2"
	}

	return t.StringValue()
}

// parseStoredChannelType inverts ToStoredType. It reports false for the notifier
// kinds v1 accepted but v2 does not model.
func parseStoredChannelType(stored string) (ChannelKind, bool) {
	for _, channelKind := range channelKinds {
		if channelKind.kind.ToStoredType() == stored {
			return channelKind.kind, true
		}
	}

	return ChannelKind{}, false
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
	newSpec, ok := newChannelSpec(c.Kind)
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
	// receiver dispatches on the spec, so a mismatch would silently outrank the
	// declared kind.
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

	factory, ok := newChannelSpec(ChannelKind{valuer.NewString(channelKindString)})
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

// ════════════════════════════════════════════════════════════════════════
// Specs
// ════════════════════════════════════════════════════════════════════════

type ChannelSpec interface {
	Validate() error
	toUndefaultedReceiver(displayName string) (*Receiver, error)
}

// ════════════════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════════════════

// bearerAuthorizationType is the scheme SigNoz writes for token auth.
const bearerAuthorizationType = "Bearer"

// parseSecretURL and parseUpstreamURL wrap the two URL types upstream uses for
// notifier endpoints. Callers holding an optional URL skip the call on an empty
// string, so the field stays nil and is omitted rather than stored as an empty URL.
func parseSecretURL(raw string) (*config.SecretURL, error) {
	parsed, err := parseUpstreamURL(raw)
	if err != nil {
		return nil, err
	}

	return (*config.SecretURL)(parsed), nil
}

func parseUpstreamURL(raw string) (*config.URL, error) {
	parsed, err := url.Parse(raw)
	if err != nil {
		return nil, errors.WrapInvalidInputf(err, ErrCodeAlertmanagerChannelInvalid, "parse url %q", raw)
	}

	return &config.URL{URL: parsed}, nil
}

func formatSecretURL(secretURL *config.SecretURL) string {
	if secretURL == nil {
		return ""
	}

	return formatUpstreamURL((*config.URL)(secretURL))
}

func formatUpstreamURL(upstreamURL *config.URL) string {
	if upstreamURL == nil || upstreamURL.URL == nil {
		return ""
	}

	return upstreamURL.String()
}

// PagerDuty is the one notifier whose details upstream types as map[string]any.
func newUpstreamDetails(details map[string]string) map[string]any {
	if details == nil {
		return nil
	}

	upstream := make(map[string]any, len(details))
	for key, value := range details {
		upstream[key] = value
	}

	return upstream
}

func extractStringDetails(name string, details map[string]any) (map[string]string, error) {
	extracted := make(map[string]string, len(details))
	for key, value := range details {
		stringValue, ok := value.(string)
		if !ok {
			return nil, errors.NewInvalidInputf(
				ErrCodeAlertmanagerChannelInvalid,
				"channel %q sets a non-string value for details.%s, which is not supported", name, key,
			)
		}
		extracted[key] = stringValue
	}

	return extracted, nil
}

func rejectAnyHTTPAuth(channelName string, httpConfig *commoncfg.HTTPClientConfig) error {
	if httpConfig == nil {
		return nil
	}

	if httpConfig.BasicAuth != nil {
		return errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "channel %q sets http_config.basic_auth, which is not supported", channelName)
	}

	if httpConfig.Authorization != nil {
		return errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "channel %q sets http_config.authorization, which is not supported", channelName)
	}

	return rejectUnsupportedHTTPConfig(channelName, httpConfig)
}

func rejectUnsupportedHTTPConfig(channelName string, httpConfig *commoncfg.HTTPClientConfig) error {
	if httpConfig == nil {
		return nil
	}

	for _, field := range []struct {
		fieldName         string
		isFieldConfigured bool
	}{
		{"oauth2", httpConfig.OAuth2 != nil},
		{"bearer_token", httpConfig.BearerToken != ""},
		{"bearer_token_file", httpConfig.BearerTokenFile != ""},
		{"proxy_url", httpConfig.ProxyURL.URL != nil && httpConfig.ProxyURL.String() != ""},
		{"no_proxy", httpConfig.NoProxy != ""},
		{"proxy_from_environment", httpConfig.ProxyFromEnvironment},
		{"http_headers", httpConfig.HTTPHeaders != nil},
		{"tls_config", httpConfig.TLSConfig != (commoncfg.TLSConfig{})},
		{"follow_redirects", !httpConfig.FollowRedirects},
		{"enable_http2", !httpConfig.EnableHTTP2},
	} {
		if field.isFieldConfigured {
			return errors.NewInvalidInputf(
				ErrCodeAlertmanagerChannelInvalid,
				"channel %q sets http_config.%s, which is not supported", channelName, field.fieldName,
			)
		}
	}

	return nil
}

func rejectHTTPBasicAuthBeyondPassword(channelName string, httpConfig *commoncfg.HTTPClientConfig) error {
	if httpConfig == nil || httpConfig.BasicAuth == nil {
		return nil
	}

	basicAuth := httpConfig.BasicAuth
	if *basicAuth != (commoncfg.BasicAuth{Username: basicAuth.Username, Password: basicAuth.Password}) {
		return errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "channel %q sets http_config.basic_auth with fields other than username and password, which is not supported", channelName)
	}

	return nil
}

func rejectHTTPAuthorizationBeyondBearer(channelName string, httpConfig *commoncfg.HTTPClientConfig) error {
	if httpConfig == nil || httpConfig.Authorization == nil {
		return nil
	}

	authorization := httpConfig.Authorization
	if !strings.EqualFold(authorization.Type, bearerAuthorizationType) || *authorization != (commoncfg.Authorization{Type: authorization.Type, Credentials: authorization.Credentials}) {
		return errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "channel %q sets http_config.authorization with fields other than a bearer token, which is not supported", channelName)
	}

	return nil
}

// channelKinds registers each notification kind with the spec constructor
// UnmarshalJSON picks by kind and the extractor that reads a stored receiver
// back. The ChannelKind enum derives from it; the JSON schema hooks stay
// literal lists so each branch reads as one line.
var channelKinds = []channelKindEntry{
	{
		kind:         ChannelKindSlack,
		newSpec:      func() ChannelSpec { return new(ChannelSlackConfig) },
		countConfigs: func(receiver *Receiver) int { return len(receiver.SlackConfigs) },
		extractSpec:  newChannelSlackConfigFromReceiver,
	},
	{
		kind:         ChannelKindEmail,
		newSpec:      func() ChannelSpec { return new(ChannelEmailConfig) },
		countConfigs: func(receiver *Receiver) int { return len(receiver.EmailConfigs) },
		extractSpec:  newChannelEmailConfigFromReceiver,
	},
	{
		kind:         ChannelKindWebhook,
		newSpec:      func() ChannelSpec { return new(ChannelWebhookConfig) },
		countConfigs: func(receiver *Receiver) int { return len(receiver.WebhookConfigs) },
		extractSpec:  newChannelWebhookConfigFromReceiver,
	},
	{
		kind:         ChannelKindPagerduty,
		newSpec:      func() ChannelSpec { return new(ChannelPagerdutyConfig) },
		countConfigs: func(receiver *Receiver) int { return len(receiver.PagerdutyConfigs) },
		extractSpec:  newChannelPagerdutyConfigFromReceiver,
	},
	{
		kind:         ChannelKindOpsgenie,
		newSpec:      func() ChannelSpec { return new(ChannelOpsgenieConfig) },
		countConfigs: func(receiver *Receiver) int { return len(receiver.OpsGenieConfigs) },
		extractSpec:  newChannelOpsgenieConfigFromReceiver,
	},
	{
		kind:         ChannelKindMSTeams,
		newSpec:      func() ChannelSpec { return new(ChannelMSTeamsConfig) },
		countConfigs: func(receiver *Receiver) int { return len(receiver.MSTeamsV2Configs) },
		extractSpec:  newChannelMSTeamsConfigFromReceiver,
	},
	{
		kind:         ChannelKindGoogleChat,
		newSpec:      func() ChannelSpec { return new(ChannelGoogleChatConfig) },
		countConfigs: func(receiver *Receiver) int { return len(receiver.GoogleChatConfigs) },
		extractSpec:  newChannelGoogleChatConfigFromReceiver,
	},
	{
		kind:         ChannelKindJira,
		newSpec:      func() ChannelSpec { return new(ChannelJiraConfig) },
		countConfigs: func(receiver *Receiver) int { return len(receiver.JiraConfigs) },
		extractSpec:  newChannelJiraConfigFromReceiver,
	},
	{
		kind:         ChannelKindJSMOps,
		newSpec:      func() ChannelSpec { return new(ChannelJSMOpsConfig) },
		countConfigs: func(receiver *Receiver) int { return len(receiver.JSMOpsConfigs) },
		extractSpec:  newChannelJSMOpsConfigFromReceiver,
	},
	{
		kind:         ChannelKindIncidentIO,
		newSpec:      func() ChannelSpec { return new(ChannelIncidentIOConfig) },
		countConfigs: func(receiver *Receiver) int { return len(receiver.IncidentIOConfigs) },
		extractSpec:  newChannelIncidentIOConfigFromReceiver,
	},
}

type channelKindEntry struct {
	kind    ChannelKind
	newSpec func() ChannelSpec
	// countConfigs guards extractSpec, which reads the receiver's first config of
	// this kind and so must not be called when there is none.
	countConfigs func(receiver *Receiver) int
	extractSpec  func(name string, receiver *Receiver) (ChannelSpec, error)
}

func newChannelSpec(kind ChannelKind) (func() ChannelSpec, bool) {
	for _, channelKind := range channelKinds {
		if channelKind.kind == kind {
			return channelKind.newSpec, true
		}
	}
	return nil, false
}

// resolveSendResolved falls back to the notifier's own upstream default, because
// send_resolved has no omitempty: a zero value would marshal as an explicit false
// and overwrite the default rather than leave it in place.
func resolveSendResolved(sendResolved *bool, upstreamDefault bool) bool {
	if sendResolved == nil {
		return upstreamDefault
	}

	return *sendResolved
}

func allowedValuesForChannelKind() string {
	return formatAllowedValues((ChannelKind{}).Enum())
}

func formatAllowedValues(enum []any) string {
	values := make([]string, 0, len(enum))
	for _, value := range enum {
		stringValuer, ok := value.(interface{ StringValue() string })
		if !ok {
			continue
		}

		values = append(values, "`"+stringValuer.StringValue()+"`")
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

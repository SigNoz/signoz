package alertmanagertypes

import (
	"bytes"
	"encoding/json"
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
// toReceiver is part of the interface so a new kind cannot be registered in
// channelKinds without also being convertible to an upstream receiver.
type ChannelSpec interface {
	Validate() error
	toReceiver(displayName string) (*Receiver, error)
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

func (c ChannelSlackConfig) toReceiver(displayName string) (*Receiver, error) {
	apiURL, err := parseSecretURL(c.APIURL)
	if err != nil {
		return nil, err
	}

	return &Receiver{Receiver: &config.Receiver{
		Name: displayName,
		SlackConfigs: []*config.SlackConfig{{
			NotifierConfig: config.NotifierConfig{VSendResolved: c.SendResolved},
			APIURL:         apiURL,
			Channel:        c.Channel,
			Title:          c.Title,
			Text:           c.Text,
		}},
	}}, nil
}

// newChannelSlackConfigFromReceiver returns nil when the receiver carries no
// slack configuration.
func newChannelSlackConfigFromReceiver(_ string, receiver *Receiver) (ChannelSpec, error) {
	if len(receiver.SlackConfigs) == 0 {
		return nil, nil
	}

	slack := receiver.SlackConfigs[0]

	return &ChannelSlackConfig{
		SendResolved: slack.VSendResolved,
		APIURL:       formatSecretURL(slack.APIURL),
		Channel:      slack.Channel,
		Title:        slack.Title,
		Text:         slack.Text,
	}, nil
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

func (c ChannelEmailConfig) toReceiver(displayName string) (*Receiver, error) {
	return &Receiver{Receiver: &config.Receiver{
		Name: displayName,
		EmailConfigs: []*config.EmailConfig{{
			NotifierConfig: config.NotifierConfig{VSendResolved: c.SendResolved},
			To:             c.To,
			HTML:           c.HTML,
			Headers:        c.Headers,
		}},
	}}, nil
}

func newChannelEmailConfigFromReceiver(_ string, receiver *Receiver) (ChannelSpec, error) {
	if len(receiver.EmailConfigs) == 0 {
		return nil, nil
	}

	email := receiver.EmailConfigs[0]

	return &ChannelEmailConfig{
		SendResolved: email.VSendResolved,
		To:           email.To,
		HTML:         email.HTML,
		Headers:      email.Headers,
	}, nil
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

func (c ChannelWebhookConfig) toReceiver(displayName string) (*Receiver, error) {
	webhook := &config.WebhookConfig{
		NotifierConfig: config.NotifierConfig{VSendResolved: c.SendResolved},
		URL:            config.SecretTemplateURL(c.URL),
	}

	// Seeded from upstream's default rather than a zero value: FollowRedirects
	// and EnableHTTP2 marshal unconditionally, so a zero value would persist
	// them as false and read back as a config this API cannot represent.
	switch {
	case c.Username != "":
		httpConfig := commoncfg.DefaultHTTPClientConfig
		httpConfig.BasicAuth = &commoncfg.BasicAuth{
			Username: c.Username,
			Password: commoncfg.Secret(c.Password),
		}
		webhook.HTTPConfig = &httpConfig
	case c.BearerToken != "":
		httpConfig := commoncfg.DefaultHTTPClientConfig
		httpConfig.Authorization = &commoncfg.Authorization{
			Type:        bearerAuthorizationType,
			Credentials: commoncfg.Secret(c.BearerToken),
		}
		webhook.HTTPConfig = &httpConfig
	}

	return &Receiver{Receiver: &config.Receiver{
		Name:           displayName,
		WebhookConfigs: []*config.WebhookConfig{webhook},
	}}, nil
}

func newChannelWebhookConfigFromReceiver(name string, receiver *Receiver) (ChannelSpec, error) {
	if len(receiver.WebhookConfigs) == 0 {
		return nil, nil
	}

	upstream := receiver.WebhookConfigs[0]
	if err := assertRepresentableHTTPConfig(name, upstream.HTTPConfig); err != nil {
		return nil, err
	}

	webhook := &ChannelWebhookConfig{
		SendResolved: upstream.VSendResolved,
		URL:          string(upstream.URL),
	}

	if upstream.HTTPConfig != nil {
		if basicAuth := upstream.HTTPConfig.BasicAuth; basicAuth != nil {
			webhook.Username = basicAuth.Username
			webhook.Password = string(basicAuth.Password)
		}
		if authorization := upstream.HTTPConfig.Authorization; authorization != nil {
			webhook.BearerToken = string(authorization.Credentials)
		}
	}

	return webhook, nil
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

func (c ChannelPagerdutyConfig) toReceiver(displayName string) (*Receiver, error) {
	eventsURL, err := parseUpstreamURL(c.URL)
	if err != nil {
		return nil, err
	}

	return &Receiver{Receiver: &config.Receiver{
		Name: displayName,
		PagerdutyConfigs: []*config.PagerdutyConfig{{
			NotifierConfig: config.NotifierConfig{VSendResolved: c.SendResolved},
			RoutingKey:     config.Secret(c.RoutingKey),
			URL:            eventsURL,
			Source:         c.Source,
			Client:         c.Client,
			ClientURL:      c.ClientURL,
			Description:    c.Description,
			Severity:       c.Severity,
			Component:      c.Component,
			Group:          c.Group,
			Class:          c.Class,
			Details:        newUpstreamDetails(c.Details),
		}},
	}}, nil
}

func newChannelPagerdutyConfigFromReceiver(name string, receiver *Receiver) (ChannelSpec, error) {
	if len(receiver.PagerdutyConfigs) == 0 {
		return nil, nil
	}

	pagerduty := receiver.PagerdutyConfigs[0]
	details, err := extractStringDetails(name, pagerduty.Details)
	if err != nil {
		return nil, err
	}

	return &ChannelPagerdutyConfig{
		SendResolved: pagerduty.VSendResolved,
		RoutingKey:   string(pagerduty.RoutingKey),
		URL:          formatUpstreamURL(pagerduty.URL),
		Source:       pagerduty.Source,
		Client:       pagerduty.Client,
		ClientURL:    pagerduty.ClientURL,
		Description:  pagerduty.Description,
		Severity:     pagerduty.Severity,
		Component:    pagerduty.Component,
		Group:        pagerduty.Group,
		Class:        pagerduty.Class,
		Details:      details,
	}, nil
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

func (c ChannelOpsgenieConfig) toReceiver(displayName string) (*Receiver, error) {
	apiURL, err := parseUpstreamURL(c.APIURL)
	if err != nil {
		return nil, err
	}

	return &Receiver{Receiver: &config.Receiver{
		Name: displayName,
		OpsGenieConfigs: []*config.OpsGenieConfig{{
			NotifierConfig: config.NotifierConfig{VSendResolved: c.SendResolved},
			APIKey:         config.Secret(c.APIKey),
			APIURL:         apiURL,
			Message:        c.Message,
			Description:    c.Description,
			Source:         c.Source,
			Priority:       c.Priority,
			Details:        c.Details,
		}},
	}}, nil
}

func newChannelOpsgenieConfigFromReceiver(_ string, receiver *Receiver) (ChannelSpec, error) {
	if len(receiver.OpsGenieConfigs) == 0 {
		return nil, nil
	}

	opsgenie := receiver.OpsGenieConfigs[0]

	return &ChannelOpsgenieConfig{
		SendResolved: opsgenie.VSendResolved,
		APIKey:       string(opsgenie.APIKey),
		APIURL:       formatUpstreamURL(opsgenie.APIURL),
		Message:      opsgenie.Message,
		Description:  opsgenie.Description,
		Source:       opsgenie.Source,
		Priority:     opsgenie.Priority,
		Details:      opsgenie.Details,
	}, nil
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

func (c ChannelMSTeamsConfig) toReceiver(displayName string) (*Receiver, error) {
	webhookURL, err := parseSecretURL(c.WebhookURL)
	if err != nil {
		return nil, err
	}

	return &Receiver{Receiver: &config.Receiver{
		Name: displayName,
		MSTeamsV2Configs: []*config.MSTeamsV2Config{{
			NotifierConfig: config.NotifierConfig{VSendResolved: c.SendResolved},
			WebhookURL:     webhookURL,
			Title:          c.Title,
			Text:           c.Text,
		}},
	}}, nil
}

func newChannelMSTeamsConfigFromReceiver(_ string, receiver *Receiver) (ChannelSpec, error) {
	if len(receiver.MSTeamsV2Configs) == 0 {
		return nil, nil
	}

	msteams := receiver.MSTeamsV2Configs[0]

	return &ChannelMSTeamsConfig{
		SendResolved: msteams.VSendResolved,
		WebhookURL:   formatSecretURL(msteams.WebhookURL),
		Title:        msteams.Title,
		Text:         msteams.Text,
	}, nil
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

func (c ChannelGoogleChatConfig) toReceiver(displayName string) (*Receiver, error) {
	webhookURL, err := parseSecretURL(c.WebhookURL)
	if err != nil {
		return nil, err
	}

	return &Receiver{
		Receiver: &config.Receiver{Name: displayName},
		GoogleChatConfigs: []*GoogleChatReceiverConfig{{
			NotifierConfig: config.NotifierConfig{VSendResolved: c.SendResolved},
			WebhookURL:     webhookURL,
			Title:          c.Title,
			Text:           c.Text,
		}},
	}, nil
}

func newChannelGoogleChatConfigFromReceiver(_ string, receiver *Receiver) (ChannelSpec, error) {
	if len(receiver.GoogleChatConfigs) == 0 {
		return nil, nil
	}

	googlechat := receiver.GoogleChatConfigs[0]

	return &ChannelGoogleChatConfig{
		SendResolved: googlechat.VSendResolved,
		WebhookURL:   formatSecretURL(googlechat.WebhookURL),
		Title:        googlechat.Title,
		Text:         googlechat.Text,
	}, nil
}

// ════════════════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════════════════

// channelKinds registers each notification kind with the spec constructor
// UnmarshalJSON picks by kind and the extractor that reads a stored receiver
// back. The ChannelKind enum derives from it; the JSON schema hooks stay
// literal lists so each branch reads as one line.
var channelKinds = []channelKindEntry{
	{
		kind:        ChannelKindSlack,
		newSpec:     func() ChannelSpec { return new(ChannelSlackConfig) },
		extractSpec: newChannelSlackConfigFromReceiver,
	},
	{
		kind:        ChannelKindEmail,
		newSpec:     func() ChannelSpec { return new(ChannelEmailConfig) },
		extractSpec: newChannelEmailConfigFromReceiver,
	},
	{
		kind:        ChannelKindWebhook,
		newSpec:     func() ChannelSpec { return new(ChannelWebhookConfig) },
		extractSpec: newChannelWebhookConfigFromReceiver,
	},
	{
		kind:        ChannelKindPagerduty,
		newSpec:     func() ChannelSpec { return new(ChannelPagerdutyConfig) },
		extractSpec: newChannelPagerdutyConfigFromReceiver,
	},
	{
		kind:        ChannelKindOpsgenie,
		newSpec:     func() ChannelSpec { return new(ChannelOpsgenieConfig) },
		extractSpec: newChannelOpsgenieConfigFromReceiver,
	},
	{
		kind:        ChannelKindMSTeams,
		newSpec:     func() ChannelSpec { return new(ChannelMSTeamsConfig) },
		extractSpec: newChannelMSTeamsConfigFromReceiver,
	},
	{
		kind:        ChannelKindGoogleChat,
		newSpec:     func() ChannelSpec { return new(ChannelGoogleChatConfig) },
		extractSpec: newChannelGoogleChatConfigFromReceiver,
	},
}

type channelKindEntry struct {
	kind    ChannelKind
	newSpec func() ChannelSpec
	// extractSpec returns nil when the receiver carries no config of this kind.
	extractSpec func(name string, receiver *Receiver) (ChannelSpec, error)
}

func newChannelSpec(kind ChannelKind) (func() ChannelSpec, bool) {
	for _, channelKind := range channelKinds {
		if channelKind.kind == kind {
			return channelKind.newSpec, true
		}
	}
	return nil, false
}

func allowedValuesForChannelKind() string {
	values := make([]string, 0, len(channelKinds))
	for _, channelKind := range channelKinds {
		values = append(values, "`"+channelKind.kind.StringValue()+"`")
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

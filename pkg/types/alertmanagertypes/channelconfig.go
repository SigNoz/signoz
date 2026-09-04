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
	"github.com/prometheus/common/model"
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

type ChannelSlackConfig struct {
	SendResolved *bool  `json:"sendResolved,omitempty"`
	APIURL       string `json:"apiUrl" required:"true"`
	Channel      string `json:"channel,omitempty"`
	Title        string `json:"title,omitempty"`
	Text         string `json:"text,omitempty"`
}

func (c ChannelSlackConfig) Validate() error {
	if c.APIURL == "" {
		return errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "config.spec.apiUrl is required for a slack channel")
	}

	return nil
}

func (c ChannelSlackConfig) toUndefaultedReceiver(displayName string) (*Receiver, error) {
	apiURL, err := parseSecretURL(c.APIURL)
	if err != nil {
		return nil, err
	}

	return &Receiver{Receiver: &config.Receiver{
		Name: displayName,
		SlackConfigs: []*config.SlackConfig{{
			NotifierConfig: config.NotifierConfig{VSendResolved: resolveSendResolved(c.SendResolved, config.DefaultSlackConfig.VSendResolved)},
			APIURL:         apiURL,
			Channel:        c.Channel,
			Title:          c.Title,
			Text:           c.Text,
		}},
	}}, nil
}

func newChannelSlackConfigFromReceiver(_ string, receiver *Receiver) (ChannelSpec, error) {
	slack := receiver.SlackConfigs[0]
	sendResolved := slack.VSendResolved

	return &ChannelSlackConfig{
		SendResolved: &sendResolved,
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
	SendResolved *bool             `json:"sendResolved,omitempty"`
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

func (c ChannelEmailConfig) toUndefaultedReceiver(displayName string) (*Receiver, error) {
	return &Receiver{Receiver: &config.Receiver{
		Name: displayName,
		EmailConfigs: []*config.EmailConfig{{
			NotifierConfig: config.NotifierConfig{VSendResolved: resolveSendResolved(c.SendResolved, config.DefaultEmailConfig.VSendResolved)},
			To:             c.To,
			HTML:           c.HTML,
			Headers:        c.Headers,
		}},
	}}, nil
}

func newChannelEmailConfigFromReceiver(_ string, receiver *Receiver) (ChannelSpec, error) {
	email := receiver.EmailConfigs[0]
	sendResolved := email.VSendResolved

	return &ChannelEmailConfig{
		SendResolved: &sendResolved,
		To:           email.To,
		HTML:         email.HTML,
		Headers:      email.Headers,
	}, nil
}

// ChannelWebhookConfig splits apart the two authentication modes the legacy API
// overloaded onto one password field, where an empty username meant the password
// was really a bearer token.
type ChannelWebhookConfig struct {
	SendResolved *bool  `json:"sendResolved,omitempty"`
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

func (c ChannelWebhookConfig) toUndefaultedReceiver(displayName string) (*Receiver, error) {
	webhook := &config.WebhookConfig{
		NotifierConfig: config.NotifierConfig{VSendResolved: resolveSendResolved(c.SendResolved, config.DefaultWebhookConfig.VSendResolved)},
		URL:            config.SecretTemplateURL(c.URL),
	}

	// Seeded from upstream's default rather than a zero value: FollowRedirects
	// and EnableHTTP2 marshal unconditionally, so a zero value would persist
	// them as false and read back as a config ChannelWebhookConfig cannot represent.
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
	upstream := receiver.WebhookConfigs[0]
	sendResolved := upstream.VSendResolved
	if err := rejectUnrepresentableHTTPConfig(name, upstream.HTTPConfig); err != nil {
		return nil, err
	}

	webhook := &ChannelWebhookConfig{
		SendResolved: &sendResolved,
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
	SendResolved *bool  `json:"sendResolved,omitempty"`
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

func (c ChannelPagerdutyConfig) toUndefaultedReceiver(displayName string) (*Receiver, error) {
	var eventsURL *config.URL
	if c.URL != "" {
		parsed, err := parseUpstreamURL(c.URL)
		if err != nil {
			return nil, err
		}
		eventsURL = parsed
	}

	return &Receiver{Receiver: &config.Receiver{
		Name: displayName,
		PagerdutyConfigs: []*config.PagerdutyConfig{{
			NotifierConfig: config.NotifierConfig{VSendResolved: resolveSendResolved(c.SendResolved, config.DefaultPagerdutyConfig.VSendResolved)},
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
	pagerduty := receiver.PagerdutyConfigs[0]
	sendResolved := pagerduty.VSendResolved

	var details map[string]string
	if len(pagerduty.Details) > 0 {
		extracted, err := extractStringDetails(name, pagerduty.Details)
		if err != nil {
			return nil, err
		}
		details = extracted
	}

	return &ChannelPagerdutyConfig{
		SendResolved: &sendResolved,
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
	SendResolved *bool  `json:"sendResolved,omitempty"`
	APIKey       string `json:"apiKey" required:"true"`
	// APIURL selects a non-default Opsgenie region, e.g. https://api.eu.opsgenie.com.
	APIURL      string            `json:"apiUrl,omitempty"`
	Message     string            `json:"message,omitempty"`
	Description string            `json:"description,omitempty"`
	Source      string            `json:"source,omitempty"`
	Details     map[string]string `json:"details,omitempty"`

	// Priority stays optional: nothing seeds it, so v1 channels that never set
	// one hold an empty value, and an empty priority is meaningful — the
	// notifier omits it and Opsgenie applies its own.
	Priority string `json:"priority,omitempty"`
}

func (c ChannelOpsgenieConfig) Validate() error {
	if c.APIKey == "" {
		return errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "config.spec.apiKey is required for an opsgenie channel")
	}

	return nil
}

func (c ChannelOpsgenieConfig) toUndefaultedReceiver(displayName string) (*Receiver, error) {
	var apiURL *config.URL
	if c.APIURL != "" {
		parsed, err := parseUpstreamURL(c.APIURL)
		if err != nil {
			return nil, err
		}
		apiURL = parsed
	}

	return &Receiver{Receiver: &config.Receiver{
		Name: displayName,
		OpsGenieConfigs: []*config.OpsGenieConfig{{
			NotifierConfig: config.NotifierConfig{VSendResolved: resolveSendResolved(c.SendResolved, config.DefaultOpsGenieConfig.VSendResolved)},
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
	opsgenie := receiver.OpsGenieConfigs[0]
	sendResolved := opsgenie.VSendResolved

	return &ChannelOpsgenieConfig{
		SendResolved: &sendResolved,
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
	SendResolved *bool  `json:"sendResolved,omitempty"`
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

func (c ChannelMSTeamsConfig) toUndefaultedReceiver(displayName string) (*Receiver, error) {
	webhookURL, err := parseSecretURL(c.WebhookURL)
	if err != nil {
		return nil, err
	}

	return &Receiver{Receiver: &config.Receiver{
		Name: displayName,
		MSTeamsV2Configs: []*config.MSTeamsV2Config{{
			NotifierConfig: config.NotifierConfig{VSendResolved: resolveSendResolved(c.SendResolved, config.DefaultMSTeamsV2Config.VSendResolved)},
			WebhookURL:     webhookURL,
			Title:          c.Title,
			Text:           c.Text,
		}},
	}}, nil
}

func newChannelMSTeamsConfigFromReceiver(_ string, receiver *Receiver) (ChannelSpec, error) {
	msteams := receiver.MSTeamsV2Configs[0]
	sendResolved := msteams.VSendResolved

	return &ChannelMSTeamsConfig{
		SendResolved: &sendResolved,
		WebhookURL:   formatSecretURL(msteams.WebhookURL),
		Title:        msteams.Title,
		Text:         msteams.Text,
	}, nil
}

type ChannelGoogleChatConfig struct {
	SendResolved *bool  `json:"sendResolved,omitempty"`
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

func (c ChannelGoogleChatConfig) toUndefaultedReceiver(displayName string) (*Receiver, error) {
	webhookURL, err := parseSecretURL(c.WebhookURL)
	if err != nil {
		return nil, err
	}

	return &Receiver{
		Receiver: &config.Receiver{Name: displayName},
		GoogleChatConfigs: []*GoogleChatReceiverConfig{{
			NotifierConfig: config.NotifierConfig{VSendResolved: resolveSendResolved(c.SendResolved, DefaultGoogleChatReceiverConfig.VSendResolved)},
			WebhookURL:     webhookURL,
			Title:          c.Title,
			Text:           c.Text,
		}},
	}, nil
}

func newChannelGoogleChatConfigFromReceiver(_ string, receiver *Receiver) (ChannelSpec, error) {
	googlechat := receiver.GoogleChatConfigs[0]
	sendResolved := googlechat.VSendResolved

	return &ChannelGoogleChatConfig{
		SendResolved: &sendResolved,
		WebhookURL:   formatSecretURL(googlechat.WebhookURL),
		Title:        googlechat.Title,
		Text:         googlechat.Text,
	}, nil
}

type ChannelJiraConfig struct {
	SendResolved *bool `json:"sendResolved,omitempty"`
	// Site is the Jira Cloud base URL, https://<site>.atlassian.net. Only Jira
	// Cloud is supported; the REST base is derived from it.
	Site              string         `json:"site" required:"true"`
	Project           string         `json:"project" required:"true"`
	IssueType         string         `json:"issueType" required:"true"`
	Summary           string         `json:"summary,omitempty"`
	Description       string         `json:"description,omitempty"`
	Priority          string         `json:"priority,omitempty"`
	Labels            []string       `json:"labels,omitempty"`
	ResolveTransition string         `json:"resolveTransition,omitempty"`
	ReopenTransition  string         `json:"reopenTransition,omitempty"`
	ReopenDuration    string         `json:"reopenDuration,omitempty"`
	WontFixResolution string         `json:"wontFixResolution,omitempty"`
	CustomFields      map[string]any `json:"customFields,omitempty"`

	Email    string `json:"email" required:"true"`
	APIToken string `json:"apiToken" required:"true"`
}

func (c ChannelJiraConfig) Validate() error {
	for _, required := range []struct {
		value string
		field string
	}{
		{c.Site, "site"},
		{c.Project, "project"},
		{c.IssueType, "issueType"},
		{c.Email, "email"},
		{c.APIToken, "apiToken"},
	} {
		if required.value == "" {
			return errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "config.spec.%s is required for a jira channel", required.field)
		}
	}

	if c.ReopenDuration != "" {
		if _, err := model.ParseDuration(c.ReopenDuration); err != nil {
			return errors.WrapInvalidInputf(err, ErrCodeAlertmanagerChannelInvalid, "config.spec.reopenDuration %q is not a valid duration", c.ReopenDuration)
		}
	}

	return nil
}

func (c ChannelJiraConfig) toUndefaultedReceiver(displayName string) (*Receiver, error) {
	// Seeded from upstream's default rather than a zero value: FollowRedirects
	// and EnableHTTP2 marshal unconditionally, so a zero value would persist them
	// as false and read back as a config ChannelJiraConfig cannot represent.
	httpConfig := commoncfg.DefaultHTTPClientConfig
	httpConfig.BasicAuth = &commoncfg.BasicAuth{
		Username: c.Email,
		Password: commoncfg.Secret(c.APIToken),
	}

	jira := &JiraReceiverConfig{
		// JiraReceiverConfig seeds no send_resolved of its own, so unset means off.
		NotifierConfig:    config.NotifierConfig{VSendResolved: resolveSendResolved(c.SendResolved, false)},
		Site:              c.Site,
		Project:           c.Project,
		IssueType:         c.IssueType,
		Summary:           c.Summary,
		Description:       c.Description,
		Priority:          c.Priority,
		Labels:            c.Labels,
		ResolveTransition: c.ResolveTransition,
		ReopenTransition:  c.ReopenTransition,
		WontFixResolution: c.WontFixResolution,
		CustomFields:      c.CustomFields,
		HTTPConfig:        &httpConfig,
	}

	if c.ReopenDuration != "" {
		reopenDuration, err := model.ParseDuration(c.ReopenDuration)
		if err != nil {
			return nil, errors.WrapInvalidInputf(err, ErrCodeAlertmanagerChannelInvalid, "parse reopenDuration %q", c.ReopenDuration)
		}
		jira.ReopenDuration = reopenDuration
	}

	return &Receiver{
		Receiver:    &config.Receiver{Name: displayName},
		JiraConfigs: []*JiraReceiverConfig{jira},
	}, nil
}

func newChannelJiraConfigFromReceiver(name string, receiver *Receiver) (ChannelSpec, error) {
	jira := receiver.JiraConfigs[0]
	sendResolved := jira.VSendResolved

	if err := rejectUnmodelledHTTPAuth(name, jira.HTTPConfig, "basic_auth"); err != nil {
		return nil, err
	}

	spec := &ChannelJiraConfig{
		SendResolved:      &sendResolved,
		Site:              jira.Site,
		Project:           jira.Project,
		IssueType:         jira.IssueType,
		Summary:           jira.Summary,
		Description:       jira.Description,
		Priority:          jira.Priority,
		Labels:            jira.Labels,
		ResolveTransition: jira.ResolveTransition,
		ReopenTransition:  jira.ReopenTransition,
		ReopenDuration:    jira.ReopenDuration.String(),
		WontFixResolution: jira.WontFixResolution,
		CustomFields:      jira.CustomFields,
	}

	if jira.HTTPConfig != nil && jira.HTTPConfig.BasicAuth != nil {
		spec.Email = jira.HTTPConfig.BasicAuth.Username
		spec.APIToken = string(jira.HTTPConfig.BasicAuth.Password)
	}

	return spec, nil
}

// ChannelJSMOpsConfig carries no API URL: JSM Ops is a single global gateway
// keyed by the integration API key, which the notifier pins itself.
type ChannelJSMOpsConfig struct {
	SendResolved *bool  `json:"sendResolved,omitempty"`
	APIKey       string `json:"apiKey" required:"true"`
	Message      string `json:"message,omitempty"`
	Description  string `json:"description,omitempty"`
	Priority     string `json:"priority,omitempty"`
	// Tags is the comma-separated list JSM Ops attaches to the alert.
	Tags string `json:"tags,omitempty"`
}

func (c ChannelJSMOpsConfig) Validate() error {
	if c.APIKey == "" {
		return errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "config.spec.apiKey is required for a jsmops channel")
	}

	return nil
}

func (c ChannelJSMOpsConfig) toUndefaultedReceiver(displayName string) (*Receiver, error) {
	return &Receiver{
		Receiver: &config.Receiver{Name: displayName},
		JSMOpsConfigs: []*JSMOpsReceiverConfig{{
			NotifierConfig: config.NotifierConfig{VSendResolved: resolveSendResolved(c.SendResolved, DefaultJSMOpsReceiverConfig.VSendResolved)},
			APIKey:         config.Secret(c.APIKey),
			Message:        c.Message,
			Description:    c.Description,
			Priority:       c.Priority,
			Tags:           c.Tags,
		}},
	}, nil
}

func newChannelJSMOpsConfigFromReceiver(name string, receiver *Receiver) (ChannelSpec, error) {
	jsmops := receiver.JSMOpsConfigs[0]
	sendResolved := jsmops.VSendResolved

	if err := rejectUnmodelledHTTPAuth(name, jsmops.HTTPConfig); err != nil {
		return nil, err
	}

	return &ChannelJSMOpsConfig{
		SendResolved: &sendResolved,
		APIKey:       string(jsmops.APIKey),
		Message:      jsmops.Message,
		Description:  jsmops.Description,
		Priority:     jsmops.Priority,
		Tags:         jsmops.Tags,
	}, nil
}

type ChannelIncidentIOConfig struct {
	SendResolved *bool `json:"sendResolved,omitempty"`
	// URL is the HTTP alert source's events endpoint,
	// https://api.incident.io/v2/alert_events/http/<source_config_id>.
	URL string `json:"url" required:"true"`
	// Token is the source's secret on its own, without the Bearer prefix
	// incident.io's setup page shows.
	Token       string `json:"token" required:"true"`
	Title       string `json:"title,omitempty"`
	Description string `json:"description,omitempty"`
	// Metadata is merged over the group's common labels, these entries winning on
	// a key clash. Values are template-expanded.
	Metadata map[string]string `json:"metadata,omitempty"`
}

func (c ChannelIncidentIOConfig) Validate() error {
	if c.URL == "" {
		return errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "config.spec.url is required for an incidentio channel")
	}

	if c.Token == "" {
		return errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "config.spec.token is required for an incidentio channel")
	}

	return nil
}

func (c ChannelIncidentIOConfig) toUndefaultedReceiver(displayName string) (*Receiver, error) {
	return &Receiver{
		Receiver: &config.Receiver{Name: displayName},
		IncidentIOConfigs: []*IncidentIOReceiverConfig{{
			NotifierConfig: config.NotifierConfig{VSendResolved: resolveSendResolved(c.SendResolved, DefaultIncidentIOReceiverConfig.VSendResolved)},
			URL:            c.URL,
			Token:          config.Secret(c.Token),
			Title:          c.Title,
			Description:    c.Description,
			Metadata:       c.Metadata,
		}},
	}, nil
}

func newChannelIncidentIOConfigFromReceiver(name string, receiver *Receiver) (ChannelSpec, error) {
	incidentio := receiver.IncidentIOConfigs[0]
	sendResolved := incidentio.VSendResolved

	if err := rejectUnmodelledHTTPAuth(name, incidentio.HTTPConfig); err != nil {
		return nil, err
	}

	return &ChannelIncidentIOConfig{
		SendResolved: &sendResolved,
		URL:          incidentio.URL,
		Token:        string(incidentio.Token),
		Title:        incidentio.Title,
		Description:  incidentio.Description,
		Metadata:     incidentio.Metadata,
	}, nil
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

// rejectUnmodelledHTTPAuth fails the read when http_config carries credentials
// the kind's spec has no field for. Only the members named in modelled are
// lifted into spec fields; anything else would be dropped here and would
// unauthenticate the channel on the next write.
func rejectUnmodelledHTTPAuth(name string, httpConfig *commoncfg.HTTPClientConfig, modelled ...string) error {
	if httpConfig == nil {
		return nil
	}

	for _, member := range []struct {
		set  bool
		name string
	}{
		{httpConfig.BasicAuth != nil, "basic_auth"},
		{httpConfig.Authorization != nil, "authorization"},
	} {
		if member.set && !slices.Contains(modelled, member.name) {
			return errors.NewInvalidInputf(
				ErrCodeAlertmanagerChannelInvalid,
				"channel %q sets http_config.%s, which is not supported", name, member.name,
			)
		}
	}

	return rejectUnrepresentableHTTPConfig(name, httpConfig)
}

// rejectUnrepresentableHTTPConfig fails the read when a stored webhook uses an
// http_config member ChannelWebhookConfig has no field for.
func rejectUnrepresentableHTTPConfig(name string, httpConfig *commoncfg.HTTPClientConfig) error {
	if httpConfig == nil {
		return nil
	}

	// basic_auth and authorization are the only members ChannelWebhookConfig
	// partly models, so rather than checking whether they are set at all, compare
	// them against what it would write back for the same credentials.
	basicAuth := httpConfig.BasicAuth
	authorization := httpConfig.Authorization

	for _, unrepresentable := range []struct {
		set    bool
		member string
	}{
		{httpConfig.OAuth2 != nil, "oauth2"},
		{httpConfig.BearerToken != "", "bearer_token"},
		{httpConfig.BearerTokenFile != "", "bearer_token_file"},
		{httpConfig.ProxyURL.URL != nil && httpConfig.ProxyURL.String() != "", "proxy_url"},
		{httpConfig.NoProxy != "", "no_proxy"},
		{httpConfig.ProxyFromEnvironment, "proxy_from_environment"},
		{httpConfig.HTTPHeaders != nil, "http_headers"},
		{httpConfig.TLSConfig != (commoncfg.TLSConfig{}), "tls_config"},
		{basicAuth != nil && *basicAuth != (commoncfg.BasicAuth{Username: basicAuth.Username, Password: basicAuth.Password}), "basic_auth"},
		{authorization != nil && *authorization != (commoncfg.Authorization{Type: bearerAuthorizationType, Credentials: authorization.Credentials}), "authorization"},
		{!httpConfig.FollowRedirects, "follow_redirects"},
		{!httpConfig.EnableHTTP2, "enable_http2"},
	} {
		if unrepresentable.set {
			return errors.NewInvalidInputf(
				ErrCodeAlertmanagerChannelInvalid,
				"channel %q sets http_config.%s, which is not supported", name, unrepresentable.member,
			)
		}
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

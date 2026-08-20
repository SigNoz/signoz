package alertmanagertypes

import (
	"encoding/json"
	"net/url"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/prometheus/alertmanager/config"
	commoncfg "github.com/prometheus/common/config"
)

// ════════════════════════════════════════════════════════════════════════
// Upstream field wrappers
// ════════════════════════════════════════════════════════════════════════

// bearerAuthorizationType is the scheme SigNoz writes for token auth.
const bearerAuthorizationType = "Bearer"

// parseSecretURL and parseUpstreamURL wrap the two URL types upstream uses for
// notifier endpoints. An empty string yields a nil pointer so the field is
// omitted rather than stored as an empty URL.
func parseSecretURL(raw string) (*config.SecretURL, error) {
	parsed, err := parseUpstreamURL(raw)
	if err != nil || parsed == nil {
		return nil, err
	}

	return (*config.SecretURL)(parsed), nil
}

func parseUpstreamURL(raw string) (*config.URL, error) {
	if raw == "" {
		return nil, nil
	}

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
	if details == nil {
		return nil, nil
	}

	extracted := make(map[string]string, len(details))
	for key, value := range details {
		stringValue, ok := value.(string)
		if !ok {
			return nil, errors.NewInvalidInputf(
				ErrCodeAlertmanagerChannelInvalid,
				"channel %q sets a non-string value for details.%s, which this API cannot represent", name, key,
			)
		}
		extracted[key] = stringValue
	}

	return extracted, nil
}

// ════════════════════════════════════════════════════════════════════════
// API -> storage
// ════════════════════════════════════════════════════════════════════════

// ToReceiver populates the upstream receiver directly and hands it to
// newDefaultedReceiver, which is the only place upstream applies a notifier's
// defaults and validation — several integrations panic without them.
func (p *PostableNotificationChannel) ToReceiver() (*Receiver, error) {
	receiver := &Receiver{Receiver: &config.Receiver{Name: p.DisplayName}}

	switch spec := p.Config.Spec.(type) {
	case *ChannelSlackConfig:
		apiURL, err := parseSecretURL(spec.APIURL)
		if err != nil {
			return nil, err
		}

		receiver.SlackConfigs = []*config.SlackConfig{{
			NotifierConfig: config.NotifierConfig{VSendResolved: spec.SendResolved},
			APIURL:         apiURL,
			Channel:        spec.Channel,
			Title:          spec.Title,
			Text:           spec.Text,
		}}
	case *ChannelEmailConfig:
		receiver.EmailConfigs = []*config.EmailConfig{{
			NotifierConfig: config.NotifierConfig{VSendResolved: spec.SendResolved},
			To:             spec.To,
			HTML:           spec.HTML,
			Headers:        spec.Headers,
		}}
	case *ChannelWebhookConfig:
		webhook := &config.WebhookConfig{
			NotifierConfig: config.NotifierConfig{VSendResolved: spec.SendResolved},
			URL:            config.SecretTemplateURL(spec.URL),
		}

		// Seeded from upstream's default rather than a zero value: FollowRedirects
		// and EnableHTTP2 marshal unconditionally, so a zero value would persist
		// them as false and read back as a config this API cannot represent.
		switch {
		case spec.Username != "":
			httpConfig := commoncfg.DefaultHTTPClientConfig
			httpConfig.BasicAuth = &commoncfg.BasicAuth{
				Username: spec.Username,
				Password: commoncfg.Secret(spec.Password),
			}
			webhook.HTTPConfig = &httpConfig
		case spec.BearerToken != "":
			httpConfig := commoncfg.DefaultHTTPClientConfig
			httpConfig.Authorization = &commoncfg.Authorization{
				Type:        bearerAuthorizationType,
				Credentials: commoncfg.Secret(spec.BearerToken),
			}
			webhook.HTTPConfig = &httpConfig
		}

		receiver.WebhookConfigs = []*config.WebhookConfig{webhook}
	case *ChannelPagerdutyConfig:
		eventsURL, err := parseUpstreamURL(spec.URL)
		if err != nil {
			return nil, err
		}

		receiver.PagerdutyConfigs = []*config.PagerdutyConfig{{
			NotifierConfig: config.NotifierConfig{VSendResolved: spec.SendResolved},
			RoutingKey:     config.Secret(spec.RoutingKey),
			URL:            eventsURL,
			Source:         spec.Source,
			Client:         spec.Client,
			ClientURL:      spec.ClientURL,
			Description:    spec.Description,
			Severity:       spec.Severity,
			Component:      spec.Component,
			Group:          spec.Group,
			Class:          spec.Class,
			Details:        newUpstreamDetails(spec.Details),
		}}
	case *ChannelOpsgenieConfig:
		apiURL, err := parseUpstreamURL(spec.APIURL)
		if err != nil {
			return nil, err
		}

		receiver.OpsGenieConfigs = []*config.OpsGenieConfig{{
			NotifierConfig: config.NotifierConfig{VSendResolved: spec.SendResolved},
			APIKey:         config.Secret(spec.APIKey),
			APIURL:         apiURL,
			Message:        spec.Message,
			Description:    spec.Description,
			Source:         spec.Source,
			Priority:       spec.Priority,
			Details:        spec.Details,
		}}
	case *ChannelMSTeamsConfig:
		webhookURL, err := parseSecretURL(spec.WebhookURL)
		if err != nil {
			return nil, err
		}

		receiver.MSTeamsV2Configs = []*config.MSTeamsV2Config{{
			NotifierConfig: config.NotifierConfig{VSendResolved: spec.SendResolved},
			WebhookURL:     webhookURL,
			Title:          spec.Title,
			Text:           spec.Text,
		}}
	case *ChannelGoogleChatConfig:
		webhookURL, err := parseSecretURL(spec.WebhookURL)
		if err != nil {
			return nil, err
		}

		receiver.GoogleChatConfigs = []*GoogleChatReceiverConfig{{
			NotifierConfig: config.NotifierConfig{VSendResolved: spec.SendResolved},
			WebhookURL:     webhookURL,
			Title:          spec.Title,
			Text:           spec.Text,
		}}
	default:
		return nil, ErrUnsupportedChannelKind(p.Config.Kind.StringValue())
	}

	return newDefaultedReceiver(receiver)
}

// ════════════════════════════════════════════════════════════════════════
// Storage -> API
// ════════════════════════════════════════════════════════════════════════

// toPostableNotificationChannel derives the kind from the config the receiver
// actually carries rather than from Channel.Type, so a row written with several
// notifier kinds is rejected instead of reported under whichever one
// receiverChannelType happened to pick.
func (c *Channel) toPostableNotificationChannel() (*PostableNotificationChannel, error) {
	receiver := &Receiver{Receiver: &config.Receiver{}}
	if err := json.Unmarshal([]byte(c.Data), receiver); err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "unmarshal channel %q", c.Name)
	}

	postable := &PostableNotificationChannel{Name: c.InternalName, DisplayName: c.Name}
	count := 0

	if len(receiver.SlackConfigs) > 0 {
		slack := receiver.SlackConfigs[0]
		postable.Config = ChannelConfig{Kind: ChannelKindSlack, Spec: &ChannelSlackConfig{
			SendResolved: slack.VSendResolved,
			APIURL:       formatSecretURL(slack.APIURL),
			Channel:      slack.Channel,
			Title:        slack.Title,
			Text:         slack.Text,
		}}
		count++
	}

	if len(receiver.EmailConfigs) > 0 {
		email := receiver.EmailConfigs[0]
		postable.Config = ChannelConfig{Kind: ChannelKindEmail, Spec: &ChannelEmailConfig{
			SendResolved: email.VSendResolved,
			To:           email.To,
			HTML:         email.HTML,
			Headers:      email.Headers,
		}}
		count++
	}

	if len(receiver.WebhookConfigs) > 0 {
		upstream := receiver.WebhookConfigs[0]
		if err := assertRepresentableHTTPConfig(c.Name, upstream.HTTPConfig); err != nil {
			return nil, err
		}

		webhook := ChannelWebhookConfig{
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
		postable.Config = ChannelConfig{Kind: ChannelKindWebhook, Spec: &webhook}
		count++
	}

	if len(receiver.PagerdutyConfigs) > 0 {
		pagerduty := receiver.PagerdutyConfigs[0]
		details, err := extractStringDetails(c.Name, pagerduty.Details)
		if err != nil {
			return nil, err
		}

		postable.Config = ChannelConfig{Kind: ChannelKindPagerduty, Spec: &ChannelPagerdutyConfig{
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
		}}
		count++
	}

	if len(receiver.OpsGenieConfigs) > 0 {
		opsgenie := receiver.OpsGenieConfigs[0]
		postable.Config = ChannelConfig{Kind: ChannelKindOpsgenie, Spec: &ChannelOpsgenieConfig{
			SendResolved: opsgenie.VSendResolved,
			APIKey:       string(opsgenie.APIKey),
			APIURL:       formatUpstreamURL(opsgenie.APIURL),
			Message:      opsgenie.Message,
			Description:  opsgenie.Description,
			Source:       opsgenie.Source,
			Priority:     opsgenie.Priority,
			Details:      opsgenie.Details,
		}}
		count++
	}

	if len(receiver.MSTeamsV2Configs) > 0 {
		msteams := receiver.MSTeamsV2Configs[0]
		postable.Config = ChannelConfig{Kind: ChannelKindMSTeams, Spec: &ChannelMSTeamsConfig{
			SendResolved: msteams.VSendResolved,
			WebhookURL:   formatSecretURL(msteams.WebhookURL),
			Title:        msteams.Title,
			Text:         msteams.Text,
		}}
		count++
	}

	if len(receiver.GoogleChatConfigs) > 0 {
		googlechat := receiver.GoogleChatConfigs[0]
		postable.Config = ChannelConfig{Kind: ChannelKindGoogleChat, Spec: &ChannelGoogleChatConfig{
			SendResolved: googlechat.VSendResolved,
			WebhookURL:   formatSecretURL(googlechat.WebhookURL),
			Title:        googlechat.Title,
			Text:         googlechat.Text,
		}}
		count++
	}

	if count == 0 {
		return nil, errors.NewNotFoundf(
			ErrCodeChannelUnsupportedKind,
			"channel %q carries no notifier configuration this API supports", c.Name,
		)
	}

	if count > 1 {
		return nil, errors.NewInvalidInputf(
			ErrCodeAlertmanagerChannelInvalid,
			"channel %q carries %d notifier configurations; this API represents one per channel", c.Name, count,
		)
	}

	return postable, nil
}

// assertRepresentableHTTPConfig fails when a stored webhook carries http_config
// members this API has no field for. Without it a read would drop them and the
// next write would persist the channel without them, silently unauthenticating
// it. The two booleans are checked last: upstream marshals them unconditionally,
// so they are the least specific signal of a config we cannot represent.
func assertRepresentableHTTPConfig(name string, httpConfig *commoncfg.HTTPClientConfig) error {
	if httpConfig == nil {
		return nil
	}

	member := ""
	switch {
	case httpConfig.OAuth2 != nil:
		member = "oauth2"
	case httpConfig.BearerToken != "":
		member = "bearer_token"
	case httpConfig.BearerTokenFile != "":
		member = "bearer_token_file"
	case httpConfig.ProxyURL.URL != nil && httpConfig.ProxyURL.String() != "":
		member = "proxy_url"
	case httpConfig.NoProxy != "":
		member = "no_proxy"
	case httpConfig.ProxyFromEnvironment:
		member = "proxy_from_environment"
	case httpConfig.HTTPHeaders != nil:
		member = "http_headers"
	case httpConfig.TLSConfig.CAFile != "", httpConfig.TLSConfig.CertFile != "",
		httpConfig.TLSConfig.KeyFile != "", httpConfig.TLSConfig.ServerName != "",
		httpConfig.TLSConfig.InsecureSkipVerify:
		member = "tls_config"
	case !httpConfig.FollowRedirects:
		member = "follow_redirects"
	case !httpConfig.EnableHTTP2:
		member = "enable_http2"
	}

	if member != "" {
		return errors.NewInvalidInputf(
			ErrCodeAlertmanagerChannelInvalid,
			"channel %q sets http_config.%s, which this API cannot represent", name, member,
		)
	}

	return nil
}

func (c *Channel) ToGettableNotificationChannel() (*GettableNotificationChannel, error) {
	postable, err := c.toPostableNotificationChannel()
	if err != nil {
		return nil, err
	}

	return &GettableNotificationChannel{
		Name:        postable.Name,
		DisplayName: postable.DisplayName,
		Config:      postable.Config,
		ID:          c.ID,
		CreatedAt:   c.CreatedAt,
		UpdatedAt:   c.UpdatedAt,
	}, nil
}

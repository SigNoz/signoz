package alertmanagertypes

import (
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/prometheus/alertmanager/config"
	commoncfg "github.com/prometheus/common/config"
)

// bearerAuthorizationType is the scheme SigNoz writes for token auth.
const bearerAuthorizationType = "Bearer"

// ChannelWebhookConfig splits apart the two authentication modes the legacy API
// overloaded onto one password field, where an empty username meant the password
// was really a bearer token. Username or Password may be set without the other,
// as upstream allows, but not together with BearerToken.
type ChannelWebhookConfig struct {
	SendResolved *bool  `json:"sendResolved,omitempty"`
	URL          string `json:"url" required:"true" format:"password"`
	Username     string `json:"username"`
	Password     string `json:"password" format:"password"`
	BearerToken  string `json:"bearerToken" format:"password"`
}

func (c *ChannelWebhookConfig) UnmarshalJSON(data []byte) error {
	type alias ChannelWebhookConfig
	if err := decodeStrict(data, (*alias)(c)); err != nil {
		return err
	}

	fillSendResolved(&c.SendResolved, config.DefaultWebhookConfig.VSendResolved)

	return c.Validate()
}

func (c ChannelWebhookConfig) Validate() error {
	if c.URL == "" {
		return errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "config.spec.url is required for a webhook channel")
	}

	usesBasicAuth := c.Username != "" || c.Password != ""

	if usesBasicAuth && c.BearerToken != "" {
		return errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "config.spec.bearerToken cannot be combined with config.spec.username or config.spec.password")
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
	case c.Username != "" || c.Password != "":
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
	if err := rejectUnsupportedHTTPConfig(name, upstream.HTTPConfig); err != nil {
		return nil, err
	}

	if err := rejectHTTPBasicAuthBeyondPassword(name, upstream.HTTPConfig); err != nil {
		return nil, err
	}

	if err := rejectHTTPAuthorizationBeyondBearer(name, upstream.HTTPConfig); err != nil {
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

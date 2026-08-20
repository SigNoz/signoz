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

// ToReceiver hands the assembled receiver to newDefaultedReceiver, which is the
// only place upstream applies a notifier's defaults and validation — several
// integrations panic without them.
func (p *PostableNotificationChannel) ToReceiver() (*Receiver, error) {
	spec, ok := p.Config.Spec.(ChannelSpec)
	if !ok {
		return nil, errors.NewInternalf(errors.CodeInternal, "config.spec was not decoded into a known type")
	}

	receiver, err := spec.toReceiver(p.DisplayName)
	if err != nil {
		return nil, err
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
	found := 0

	for _, channelKind := range channelKinds {
		spec, err := channelKind.extractSpec(c.Name, receiver)
		if err != nil {
			return nil, err
		}

		if spec == nil {
			continue
		}

		postable.Config = ChannelConfig{Kind: channelKind.kind, Spec: spec}
		found++
	}

	if found == 0 {
		return nil, errors.NewNotFoundf(
			ErrCodeChannelUnsupportedKind,
			"channel %q carries no notifier configuration this API supports", c.Name,
		)
	}

	if found > 1 {
		return nil, errors.NewInvalidInputf(
			ErrCodeAlertmanagerChannelInvalid,
			"channel %q carries %d notifier configurations; this API represents one per channel", c.Name, found,
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

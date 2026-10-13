package alertmanagertypes

import (
	"net/url"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/prometheus/alertmanager/config"
	commoncfg "github.com/prometheus/common/config"
)

type ChannelSpec interface {
	Validate() error
	toUndefaultedReceiver(displayName string) (*Receiver, error)
}

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

// fillSendResolved gives an omitted field its notifier default, so what is
// stored and read back is what takes effect.
func fillSendResolved(sendResolved **bool, upstreamDefault bool) {
	if *sendResolved == nil {
		value := upstreamDefault
		*sendResolved = &value
	}
}

// resolveSendResolved covers a spec assembled in code rather than decoded, whose
// defaults were never filled. send_resolved has no omitempty, so a zero value
// would marshal as an explicit false and overwrite the default rather than leave it.
func resolveSendResolved(sendResolved *bool, upstreamDefault bool) bool {
	if sendResolved == nil {
		return upstreamDefault
	}

	return *sendResolved
}

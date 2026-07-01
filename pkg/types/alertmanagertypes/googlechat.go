package alertmanagertypes

import (
	"net/url"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/prometheus/alertmanager/config"
	commoncfg "github.com/prometheus/common/config"
)

type GoogleChatReceiverConfig struct {
	config.NotifierConfig `yaml:",inline" json:",inline"`

	HTTPConfig *commoncfg.HTTPClientConfig `yaml:"http_config,omitempty" json:"http_config,omitempty"`

	WebhookURL *config.SecretURL `yaml:"webhook_url,omitempty" json:"webhook_url,omitempty"`
	Title      string            `yaml:"title,omitempty" json:"title,omitempty"`
	Text       string            `yaml:"text,omitempty" json:"text,omitempty"`
}

var DefaultGoogleChatReceiverConfig = GoogleChatReceiverConfig{
	NotifierConfig: config.NotifierConfig{
		VSendResolved: false,
	},
	Title: `[{{ .Status | toUpper }}{{ if eq .Status "firing" }}:{{ .Alerts.Firing | len }}{{ end }}] {{ .CommonLabels.alertname }}`,
	Text: `{{ range .Alerts -}}
*Alert:* {{ .Labels.alertname }}{{ if .Labels.severity }} ({{ .Labels.severity }}){{ end }}{{ if .Annotations.summary }}
*Summary:* {{ .Annotations.summary }}{{ end }}{{ if .Annotations.description }}
*Description:* {{ .Annotations.description }}{{ end }}
{{ end }}`,
}

func (c *GoogleChatReceiverConfig) UnmarshalYAML(unmarshal func(any) error) error {
	*c = DefaultGoogleChatReceiverConfig
	type plain GoogleChatReceiverConfig
	return unmarshal((*plain)(c))
}

// ValidateGoogleChatWebhookURL validates Google Chat webhook URL format.
func ValidateGoogleChatWebhookURL(rawURL string) error {
	u, err := url.Parse(rawURL)
	if err != nil {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "invalid google chat webhook_url: %v", err)
	}
	if u.Scheme != "https" {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "google chat webhook_url must use https")
	}
	host := strings.ToLower(u.Hostname())
	if host != "chat.googleapis.com" {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "google chat webhook_url must use chat.googleapis.com")
	}
	return nil
}

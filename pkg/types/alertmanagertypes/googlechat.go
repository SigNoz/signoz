package alertmanagertypes

import (
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

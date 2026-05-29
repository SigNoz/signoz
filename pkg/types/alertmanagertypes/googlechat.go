package alertmanagertypes

import (
	"github.com/prometheus/alertmanager/config"
	commoncfg "github.com/prometheus/common/config"
)

// GoogleChatReceiverConfig is a SigNoz-native notifier config. Shape mirrors
// upstream notifier configs: inline NotifierConfig gives send_resolved +
// SendResolved(); HTTPConfig is filled from Global.HTTPConfig when omitted
// (Config.applyNativeDefaults). Config shape only — no notifier impl yet.
type GoogleChatReceiverConfig struct {
	config.NotifierConfig `yaml:",inline" json:",inline"`

	HTTPConfig *commoncfg.HTTPClientConfig `yaml:"http_config,omitempty" json:"http_config,omitempty"`

	WebhookURL *config.SecretURL `yaml:"webhook_url,omitempty" json:"webhook_url,omitempty"`
	Title      string            `yaml:"title,omitempty" json:"title,omitempty"`
	Text       string            `yaml:"text,omitempty" json:"text,omitempty"`
}

// DefaultGoogleChatReceiverConfig — mirrors upstream's DefaultSlackConfig.
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

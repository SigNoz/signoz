package alertmanagertypes

import (
	"github.com/prometheus/alertmanager/config"
	commoncfg "github.com/prometheus/common/config"
)

// GoogleChatReceiverConfig is a SigNoz-native notifier config that upstream
// alertmanager does not know about. It is carried on Receiver alongside the
// embedded *config.Receiver and round-trips through JSON via that embed's
// struct tags — Channel.Data and the stored config blob preserve it
// automatically without any separate registry or marshalling.
//
// The shape mirrors upstream's notifier configs (e.g. SlackConfig): the
// inline-embedded NotifierConfig contributes send_resolved + the
// SendResolved() method that the notify pipeline uses to gate resolved
// notifications, and HTTPConfig is filled in from Config.Global.HTTPConfig
// when omitted (see Config.applyNativeDefaults). Only the config shape is
// defined here; a future notifier package would consume these fields, POST
// to the webhook, and implement notify.Notifier.
type GoogleChatReceiverConfig struct {
	config.NotifierConfig `yaml:",inline" json:",inline"`

	HTTPConfig *commoncfg.HTTPClientConfig `yaml:"http_config,omitempty" json:"http_config,omitempty"`

	WebhookURL *config.SecretURL `yaml:"webhook_url,omitempty" json:"webhook_url,omitempty"`
	Title      string            `yaml:"title,omitempty" json:"title,omitempty"`
	Text       string            `yaml:"text,omitempty" json:"text,omitempty"`
}

// DefaultGoogleChatReceiverConfig holds the defaults applied by
// GoogleChatReceiverConfig.UnmarshalYAML before user-specified fields are
// overlaid. Mirrors upstream's DefaultSlackConfig / DefaultPagerdutyConfig.
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

// UnmarshalYAML implements the per-config defaulting pattern used by every
// upstream notifier config: install the defaults first, then overlay the
// user-specified fields. Triggered by the yaml round-trip in NewReceiver.
func (c *GoogleChatReceiverConfig) UnmarshalYAML(unmarshal func(any) error) error {
	*c = DefaultGoogleChatReceiverConfig
	type plain GoogleChatReceiverConfig
	return unmarshal((*plain)(c))
}

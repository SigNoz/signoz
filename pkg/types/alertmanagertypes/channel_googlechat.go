package alertmanagertypes

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/prometheus/alertmanager/config"
	commoncfg "github.com/prometheus/common/config"
)

type ChannelGoogleChatConfig struct {
	SendResolved *bool                        `json:"sendResolved,omitempty"`
	WebhookURL   string                       `json:"webhookUrl" required:"true" format:"password"`
	Title        valuer.UnsetOrNonEmptyString `json:"title,omitzero"`
	Text         valuer.UnsetOrNonEmptyString `json:"text,omitzero"`
}

func (c *ChannelGoogleChatConfig) UnmarshalJSON(data []byte) error {
	type alias ChannelGoogleChatConfig
	if err := decodeStrict(data, (*alias)(c)); err != nil {
		return err
	}

	fillSendResolved(&c.SendResolved, DefaultGoogleChatReceiverConfig.VSendResolved)
	c.Title.SetIfUnset(DefaultGoogleChatReceiverConfig.Title)
	c.Text.SetIfUnset(DefaultGoogleChatReceiverConfig.Text)

	return c.Validate()
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
			Title:          c.Title.StringValue(),
			Text:           c.Text.StringValue(),
		}},
	}, nil
}

func newChannelGoogleChatConfigFromReceiver(name string, receiver *Receiver) (ChannelSpec, error) {
	googlechat := receiver.GoogleChatConfigs[0]
	sendResolved := googlechat.VSendResolved

	if err := rejectAnyHTTPAuth(name, googlechat.HTTPConfig); err != nil {
		return nil, err
	}

	return &ChannelGoogleChatConfig{
		SendResolved: &sendResolved,
		WebhookURL:   formatSecretURL(googlechat.WebhookURL),
		Title:        valuer.UnsetIfEmpty(googlechat.Title),
		Text:         valuer.UnsetIfEmpty(googlechat.Text),
	}, nil
}

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
**Alert:** {{ .Labels.alertname }}{{ if .Labels.severity }} ({{ .Labels.severity }}){{ end }}{{ if .Annotations.summary }}
**Summary:** {{ .Annotations.summary }}{{ end }}{{ if .Annotations.description }}
**Description:** {{ .Annotations.description }}{{ end }}
{{ end }}`,
}

func (c *GoogleChatReceiverConfig) UnmarshalYAML(unmarshal func(any) error) error {
	*c = DefaultGoogleChatReceiverConfig
	type plain GoogleChatReceiverConfig
	if err := unmarshal((*plain)(c)); err != nil {
		return err
	}
	if c.WebhookURL == nil {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "google chat webhook_url is required")
	}
	return nil
}

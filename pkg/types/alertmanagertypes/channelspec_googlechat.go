package alertmanagertypes

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/prometheus/alertmanager/config"
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

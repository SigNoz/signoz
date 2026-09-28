package alertmanagertypes

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/prometheus/alertmanager/config"
)

type ChannelMSTeamsConfig struct {
	SendResolved *bool                        `json:"sendResolved,omitempty"`
	WebhookURL   string                       `json:"webhookUrl" required:"true" format:"password"`
	Title        valuer.UnsetOrNonEmptyString `json:"title"`
	Text         valuer.UnsetOrNonEmptyString `json:"text"`
}

func (c ChannelMSTeamsConfig) Validate() error {
	if c.WebhookURL == "" {
		return errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "config.spec.webhookUrl is required for an msteams channel")
	}

	return nil
}

func (c ChannelMSTeamsConfig) toUndefaultedReceiver(displayName string) (*Receiver, error) {
	webhookURL, err := parseSecretURL(c.WebhookURL)
	if err != nil {
		return nil, err
	}

	return &Receiver{Receiver: &config.Receiver{
		Name: displayName,
		MSTeamsV2Configs: []*config.MSTeamsV2Config{{
			NotifierConfig: config.NotifierConfig{VSendResolved: resolveSendResolved(c.SendResolved, config.DefaultMSTeamsV2Config.VSendResolved)},
			WebhookURL:     webhookURL,
			Title:          c.Title.StringValue(),
			Text:           c.Text.StringValue(),
		}},
	}}, nil
}

func newChannelMSTeamsConfigFromReceiver(name string, receiver *Receiver) (ChannelSpec, error) {
	msteams := receiver.MSTeamsV2Configs[0]
	sendResolved := msteams.VSendResolved

	if err := rejectAnyHTTPAuth(name, msteams.HTTPConfig); err != nil {
		return nil, err
	}

	return &ChannelMSTeamsConfig{
		SendResolved: &sendResolved,
		WebhookURL:   formatSecretURL(msteams.WebhookURL),
		Title:        valuer.UnsetIfEmpty(msteams.Title),
		Text:         valuer.UnsetIfEmpty(msteams.Text),
	}, nil
}

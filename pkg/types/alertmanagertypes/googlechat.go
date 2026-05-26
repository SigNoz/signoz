package alertmanagertypes

import "github.com/prometheus/alertmanager/config"

// channelTypeGoogleChat is the channel.Type discriminator for Google Chat
// receivers. Unlike the upstream notifier types (slack, webhook, ...), Google
// Chat is a SigNoz-native notifier, so it is not derivable by reflecting over
// config.Receiver's fields.
const channelTypeGoogleChat = "googlechat"

// GoogleChatReceiverConfig is a SigNoz-native notifier config that upstream
// alertmanager does not know about. It is carried on Receiver alongside the
// embedded *config.Receiver and round-trips through JSON via that embed's
// struct tags — no separate registry or marshalling is required.
type GoogleChatReceiverConfig struct {
	WebhookURL        *config.SecretURL `json:"webhook_url" yaml:"webhook_url"`
	Title             string            `json:"title" yaml:"title"`
	Text              string            `json:"text" yaml:"text"`
	SendResolvedValue bool              `json:"send_resolved" yaml:"send_resolved"`
}

// SendResolved implements notify.ResolvedSender.
func (c *GoogleChatReceiverConfig) SendResolved() bool {
	return c != nil && c.SendResolvedValue
}

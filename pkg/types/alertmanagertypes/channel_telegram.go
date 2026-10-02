package alertmanagertypes

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/prometheus/alertmanager/config"
)

// ChannelTelegramConfig maps onto upstream alertmanager TelegramConfig. The
// notifier already lives upstream; this only models the fields the UI and v2
// API expose. messageThreadId targets a Telegram forum topic.
type ChannelTelegramConfig struct {
	SendResolved    *bool                        `json:"sendResolved,omitempty"`
	BotToken        string                       `json:"botToken" required:"true" format:"password"`
	ChatID          int64                        `json:"chatId" required:"true"`
	MessageThreadID *int                         `json:"messageThreadId,omitempty"`
	Message         valuer.UnsetOrNonEmptyString `json:"message,omitzero"`
}

func (c *ChannelTelegramConfig) UnmarshalJSON(data []byte) error {
	type alias ChannelTelegramConfig
	if err := decodeStrict(data, (*alias)(c)); err != nil {
		return err
	}

	fillSendResolved(&c.SendResolved, config.DefaultTelegramConfig.VSendResolved)
	c.Message.SetIfUnset(config.DefaultTelegramConfig.Message)

	return c.Validate()
}

func (c ChannelTelegramConfig) Validate() error {
	if c.BotToken == "" {
		return errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "config.spec.botToken is required for a telegram channel")
	}

	if c.ChatID == 0 {
		return errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "config.spec.chatId is required for a telegram channel")
	}

	if c.MessageThreadID != nil && *c.MessageThreadID <= 0 {
		return errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "config.spec.messageThreadId must be greater than 0")
	}

	return nil
}

func (c ChannelTelegramConfig) toUndefaultedReceiver(displayName string) (*Receiver, error) {
	telegram := &config.TelegramConfig{
		NotifierConfig: config.NotifierConfig{VSendResolved: resolveSendResolved(c.SendResolved, config.DefaultTelegramConfig.VSendResolved)},
		BotToken:       config.Secret(c.BotToken),
		ChatID:         c.ChatID,
		Message:        c.Message.StringValue(),
	}
	if c.MessageThreadID != nil {
		telegram.MessageThreadID = *c.MessageThreadID
	}

	return &Receiver{Receiver: &config.Receiver{
		Name:            displayName,
		TelegramConfigs: []*config.TelegramConfig{telegram},
	}}, nil
}

func newChannelTelegramConfigFromReceiver(name string, receiver *Receiver) (ChannelSpec, error) {
	telegram := receiver.TelegramConfigs[0]
	sendResolved := telegram.VSendResolved

	if err := rejectAnyHTTPAuth(name, telegram.HTTPConfig); err != nil {
		return nil, err
	}

	if telegram.BotTokenFile != "" {
		return nil, errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "channel %q sets token_file, which is not supported", name)
	}

	if telegram.ChatIDFile != "" {
		return nil, errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "channel %q sets chat_file, which is not supported", name)
	}

	if telegram.APIUrl != nil {
		return nil, errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "channel %q sets api_url, which is not supported", name)
	}

	if telegram.DisableNotifications {
		return nil, errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "channel %q sets disable_notifications, which is not supported", name)
	}

	if telegram.ParseMode != "" && telegram.ParseMode != "HTML" {
		return nil, errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "channel %q sets parse_mode %q, which is not supported", name, telegram.ParseMode)
	}

	if telegram.BotToken == "" {
		return nil, errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "channel %q is missing a bot token", name)
	}

	if telegram.ChatID == 0 {
		return nil, errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "channel %q is missing a chat id", name)
	}

	spec := &ChannelTelegramConfig{
		SendResolved: &sendResolved,
		BotToken:     string(telegram.BotToken),
		ChatID:       telegram.ChatID,
		Message:      valuer.UnsetIfEmpty(telegram.Message),
	}
	if telegram.MessageThreadID != 0 {
		threadID := telegram.MessageThreadID
		spec.MessageThreadID = &threadID
	}

	return spec, nil
}

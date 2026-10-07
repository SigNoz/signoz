package alertmanagertypes

import (
	"slices"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/prometheus/alertmanager/config"
)

// Telegram renders the message with parse_mode HTML, which only accepts a small
// tag set and requires every stray <, > and & to be escaped. The notifier is
// upstream's and expands with text/template, so each interpolated value is piped
// through html; an unescaped alert annotation would otherwise fail the whole
// send with "can't parse entities".
// https://core.telegram.org/bots/api#html-style
const DefaultTelegramMessageTemplate = `<b>[{{ .Status | toUpper }}{{ if eq .Status "firing" }}:{{ .Alerts.Firing | len }}{{ end }}] {{ .CommonLabels.alertname | html }}</b>

{{ range .Alerts -}}
<b>Alert:</b> {{ .Labels.alertname | html }}{{ if .Labels.severity }} ({{ .Labels.severity | html }}){{ end }}
{{ if .Annotations.summary }}<b>Summary:</b> {{ .Annotations.summary | html }}
{{ end }}{{ if .Annotations.description }}<b>Descriptionnn:</b> {{ .Annotations.description | html }}
{{ end }}{{ if .GeneratorURL }}<a href="{{ .GeneratorURL | html }}">View in SigNoz</a>
{{ end }}{{ if .Annotations.related_logs }}<a href="{{ .Annotations.related_logs | html }}">View related logs</a>
{{ end }}{{ if .Annotations.related_traces }}<a href="{{ .Annotations.related_traces | html }}">View related traces</a>
{{ end }}
{{ end }}`

// telegramParseModes mirrors the values upstream's TelegramConfig accepts.
var telegramParseModes = []string{"Markdown", "MarkdownV2", "HTML"}

// ChannelTelegramConfig configures delivery to a Telegram chat through a bot.
// ChatID is the numeric chat the bot posts to, negative for groups and channels;
// Telegram's @username form is not accepted upstream.
type ChannelTelegramConfig struct {
	SendResolved *bool  `json:"sendResolved,omitempty"`
	BotToken     string `json:"botToken" required:"true" format:"password"`
	ChatID       int64  `json:"chatId" required:"true"`
	// APIURL points at a self-hosted Bot API server. Left empty, the global
	// telegram_api_url applies.
	APIURL string `json:"apiUrl"`
	// MessageThreadID targets a topic inside a forum group.
	MessageThreadID      int                          `json:"messageThreadId,omitempty"`
	Message              valuer.UnsetOrNonEmptyString `json:"message,omitzero"`
	ParseMode            string                       `json:"parseMode"`
	DisableNotifications bool                         `json:"disableNotifications,omitempty"`
}

func (c *ChannelTelegramConfig) UnmarshalJSON(data []byte) error {
	type alias ChannelTelegramConfig
	if err := decodeStrict(data, (*alias)(c)); err != nil {
		return err
	}

	fillSendResolved(&c.SendResolved, config.DefaultTelegramConfig.VSendResolved)
	c.Message.SetIfUnset(DefaultTelegramMessageTemplate)
	if c.ParseMode == "" {
		c.ParseMode = config.DefaultTelegramConfig.ParseMode
	}

	return c.Validate()
}

// Validate repeats the checks upstream's TelegramConfig.UnmarshalYAML makes, so
// a bad channel fails on the request with a field name rather than as a yaml
// error surfacing out of the config resolve.
func (c ChannelTelegramConfig) Validate() error {
	if c.BotToken == "" {
		return errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "config.spec.botToken is required for a telegram channel")
	}

	if c.ChatID == 0 {
		return errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "config.spec.chatId is required for a telegram channel")
	}

	if c.ParseMode != "" && !slices.Contains(telegramParseModes, c.ParseMode) {
		return errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "config.spec.parseMode for a telegram channel must be one of %s", strings.Join(telegramParseModes, ", "))
	}

	return nil
}

func (c ChannelTelegramConfig) toUndefaultedReceiver(displayName string) (*Receiver, error) {
	var apiURL *config.URL
	if c.APIURL != "" {
		parsed, err := parseUpstreamURL(c.APIURL)
		if err != nil {
			return nil, err
		}
		apiURL = parsed
	}

	return &Receiver{Receiver: &config.Receiver{
		Name: displayName,
		TelegramConfigs: []*config.TelegramConfig{{
			NotifierConfig:       config.NotifierConfig{VSendResolved: resolveSendResolved(c.SendResolved, config.DefaultTelegramConfig.VSendResolved)},
			APIUrl:               apiURL,
			BotToken:             config.Secret(c.BotToken),
			ChatID:               c.ChatID,
			MessageThreadID:      c.MessageThreadID,
			Message:              c.Message.StringValue(),
			ParseMode:            c.ParseMode,
			DisableNotifications: c.DisableNotifications,
		}},
	}}, nil
}

func newChannelTelegramConfigFromReceiver(name string, receiver *Receiver) (ChannelSpec, error) {
	telegram := receiver.TelegramConfigs[0]
	sendResolved := telegram.VSendResolved

	if err := rejectAnyHTTPAuth(name, telegram.HTTPConfig); err != nil {
		return nil, err
	}

	// Both read a path on the server's filesystem, so they are refused rather
	// than silently dropped on the way back out.
	if telegram.BotTokenFile != "" {
		return nil, errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "channel %q sets bot_token_file, which is not supported", name)
	}

	if telegram.ChatIDFile != "" {
		return nil, errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "channel %q sets chat_id_file, which is not supported", name)
	}

	return &ChannelTelegramConfig{
		SendResolved:         &sendResolved,
		BotToken:             string(telegram.BotToken),
		ChatID:               telegram.ChatID,
		APIURL:               formatUpstreamURL(telegram.APIUrl),
		MessageThreadID:      telegram.MessageThreadID,
		Message:              valuer.UnsetIfEmpty(telegram.Message),
		ParseMode:            telegram.ParseMode,
		DisableNotifications: telegram.DisableNotifications,
	}, nil
}

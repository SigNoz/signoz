package alertmanagertypes

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/prometheus/alertmanager/config"
	commoncfg "github.com/prometheus/common/config"
)

// Telegram renders the message with parse_mode HTML, which only accepts a small
// tag set and requires every stray <, > and & to be escaped. Each interpolated
// value is piped through html so the template renders identically under both
// template engines; an unescaped alert annotation would otherwise fail the
// whole send with "can't parse entities".
// https://core.telegram.org/bots/api#html-style
const (
	// DefaultTelegramTitleTemplate is sent in bold above the message.
	DefaultTelegramTitleTemplate = `[{{ .Status | toUpper }}{{ if eq .Status "firing" }}:{{ .Alerts.Firing | len }}{{ end }}] {{ .CommonLabels.alertname | html }}`

	DefaultTelegramMessageTemplate = `{{ range .Alerts -}}
<b>Alert:</b> {{ .Labels.alertname | html }}{{ if .Labels.severity }} ({{ .Labels.severity | html }}){{ end }}
{{ if .Annotations.summary }}<b>Summary:</b> {{ .Annotations.summary | html }}
{{ end }}{{ if .Annotations.description }}<b>Description:</b> {{ .Annotations.description | html }}
{{ end }}{{ if .GeneratorURL }}<a href="{{ .GeneratorURL | html }}">View in SigNoz</a>
{{ end }}{{ if .Annotations.related_logs }}<a href="{{ .Annotations.related_logs | html }}">View related logs</a>
{{ end }}{{ if .Annotations.related_traces }}<a href="{{ .Annotations.related_traces | html }}">View related traces</a>
{{ end }}
{{ end }}`
)

// telegramParseMode is the only mode SigNoz renders for. Upstream also accepts
// Markdown, MarkdownV2 and the empty string, but those carry per-mode escaping
// rules that nothing renders to, so the spec does not offer them.
const telegramParseMode = "HTML"

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
	Title                valuer.UnsetOrNonEmptyString `json:"title,omitzero"`
	Message              valuer.UnsetOrNonEmptyString `json:"message,omitzero"`
	DisableNotifications bool                         `json:"disableNotifications,omitempty"`
}

func (c *ChannelTelegramConfig) UnmarshalJSON(data []byte) error {
	type alias ChannelTelegramConfig
	if err := decodeStrict(data, (*alias)(c)); err != nil {
		return err
	}

	fillSendResolved(&c.SendResolved, DefaultTelegramReceiverConfig.VSendResolved)
	c.Title.SetIfUnset(DefaultTelegramTitleTemplate)
	c.Message.SetIfUnset(DefaultTelegramMessageTemplate)

	return c.Validate()
}

// Validate repeats the checks TelegramReceiverConfig.UnmarshalYAML makes, so
// a bad channel fails on the request with a field name rather than as a yaml
// error surfacing out of the config resolve.
func (c ChannelTelegramConfig) Validate() error {
	if c.BotToken == "" {
		return errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "config.spec.botToken is required for a telegram channel")
	}

	if c.ChatID == 0 {
		return errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "config.spec.chatId is required for a telegram channel")
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

	return &Receiver{
		Receiver: &config.Receiver{Name: displayName},
		TelegramConfigs: []*TelegramReceiverConfig{{
			NotifierConfig:       config.NotifierConfig{VSendResolved: resolveSendResolved(c.SendResolved, DefaultTelegramReceiverConfig.VSendResolved)},
			APIUrl:               apiURL,
			BotToken:             config.Secret(c.BotToken),
			ChatID:               c.ChatID,
			MessageThreadID:      c.MessageThreadID,
			Title:                c.Title.StringValue(),
			Message:              c.Message.StringValue(),
			ParseMode:            telegramParseMode,
			DisableNotifications: c.DisableNotifications,
		}},
	}, nil
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

	// Dropping a non-HTML parse_mode on the way out would silently rewrite the
	// channel on the next write, so it is refused instead.
	if telegram.ParseMode != telegramParseMode {
		return nil, errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "channel %q sets parse_mode %q, only %s is supported", name, telegram.ParseMode, telegramParseMode)
	}

	return &ChannelTelegramConfig{
		SendResolved:         &sendResolved,
		BotToken:             string(telegram.BotToken),
		ChatID:               telegram.ChatID,
		APIURL:               formatUpstreamURL(telegram.APIUrl),
		MessageThreadID:      telegram.MessageThreadID,
		Title:                valuer.UnsetIfEmpty(telegram.Title),
		Message:              valuer.UnsetIfEmpty(telegram.Message),
		DisableNotifications: telegram.DisableNotifications,
	}, nil
}

// TelegramReceiverConfig is upstream's TelegramConfig with a Title, under the
// same keys so receivers stored as upstream's still decode. Title has no
// default: a receiver without one sends Message alone.
type TelegramReceiverConfig struct {
	config.NotifierConfig `yaml:",inline" json:",inline"`

	HTTPConfig *commoncfg.HTTPClientConfig `yaml:"http_config,omitempty" json:"http_config,omitempty"`

	APIUrl               *config.URL   `yaml:"api_url" json:"api_url,omitempty"`
	BotToken             config.Secret `yaml:"bot_token,omitempty" json:"token,omitempty"`
	BotTokenFile         string        `yaml:"bot_token_file,omitempty" json:"token_file,omitempty"`
	ChatID               int64         `yaml:"chat_id,omitempty" json:"chat,omitempty"`
	ChatIDFile           string        `yaml:"chat_id_file,omitempty" json:"chat_file,omitempty"`
	MessageThreadID      int           `yaml:"message_thread_id,omitempty" json:"message_thread_id,omitempty"`
	Title                string        `yaml:"title,omitempty" json:"title,omitempty"`
	Message              string        `yaml:"message,omitempty" json:"message,omitempty"`
	DisableNotifications bool          `yaml:"disable_notifications,omitempty" json:"disable_notifications,omitempty"`
	ParseMode            string        `yaml:"parse_mode,omitempty" json:"parse_mode,omitempty"`
}

var DefaultTelegramReceiverConfig = TelegramReceiverConfig{
	NotifierConfig:       config.DefaultTelegramConfig.NotifierConfig,
	Message:              config.DefaultTelegramConfig.Message,
	DisableNotifications: config.DefaultTelegramConfig.DisableNotifications,
	ParseMode:            config.DefaultTelegramConfig.ParseMode,
}

func (c *TelegramReceiverConfig) UnmarshalYAML(unmarshal func(any) error) error {
	*c = DefaultTelegramReceiverConfig
	type plain TelegramReceiverConfig
	if err := unmarshal((*plain)(c)); err != nil {
		return err
	}

	if c.BotToken != "" && c.BotTokenFile != "" {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "at most one of bot_token & bot_token_file must be configured")
	}
	if c.ChatID == 0 && c.ChatIDFile == "" {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "missing chat_id or chat_id_file on telegram_config")
	}
	if c.ChatID != 0 && c.ChatIDFile != "" {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "at most one of chat_id & chat_id_file must be configured")
	}
	switch c.ParseMode {
	case "", "Markdown", "MarkdownV2", "HTML":
	default:
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "unknown parse_mode on telegram_config, must be Markdown, MarkdownV2, HTML or empty string")
	}

	return nil
}

package googlechat

import (
	"log/slog"
	"net/http"

	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/prometheus/alertmanager/notify"
	"github.com/prometheus/alertmanager/template"
)

const (
	Integration = "googlechat"
	// maxMessageBytes is the Google Chat message payload limit.
	// https://developers.google.com/chat/api/guides/message-formats/basic#maximum_size
	maxMessageBytes = 32000
)

// Notifier implements notify.Notifier for Google Chat.
type Notifier struct {
	conf      *alertmanagertypes.GoogleChatReceiverConfig
	tmpl      *template.Template
	logger    *slog.Logger
	client    *http.Client
	retrier   *notify.Retrier
	templater alertmanagertypes.Templater
}

// Message is the Google Chat webhook payload.
type Message struct {
	Text string `json:"text"`
}

// content holds the rendered title and body for a Google Chat message.
type content struct {
	title, body   string
	isDefaultBody bool
}

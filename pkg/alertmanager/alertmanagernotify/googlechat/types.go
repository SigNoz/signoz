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
	// maxAlertSections caps per-alert sections in a grouped card. Google Chat
	// allows 100 widgets per card and silently drops the section that crosses
	// that count and every section after it, so we cap well under the limit
	// (~63 widgets worst case) and add a "+N more" note for the overflow.
	// https://developers.google.com/workspace/chat/api/reference/rpc/google.apps.card.v1#card
	maxAlertSections = 30
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

// Message is the Google Chat webhook payload. A message carries a short text
// summary (space list / push preview) and a rich card.
type Message struct {
	Text    string       `json:"text,omitempty"`
	CardsV2 []cardWithID `json:"cardsV2,omitempty"`
}

type cardWithID struct {
	CardID string `json:"cardId"`
	Card   card   `json:"card"`
}

type card struct {
	Header   *cardHeader   `json:"header,omitempty"`
	Sections []cardSection `json:"sections"`
}

type cardHeader struct {
	Title    string `json:"title,omitempty"`
	Subtitle string `json:"subtitle,omitempty"`
}

type cardSection struct {
	Header  string   `json:"header,omitempty"`
	Widgets []widget `json:"widgets"`
}

// widget is a one-of: exactly one field is set per instance.
type widget struct {
	TextParagraph *textParagraph `json:"textParagraph,omitempty"`
	ButtonList    *buttonList    `json:"buttonList,omitempty"`
}

type textParagraph struct {
	Text string `json:"text"`
}

type buttonList struct {
	Buttons []button `json:"buttons"`
}

type button struct {
	Text    string  `json:"text"`
	OnClick onClick `json:"onClick"`
}

type onClick struct {
	OpenLink openLink `json:"openLink"`
}

type openLink struct {
	URL string `json:"url"`
}

// content holds the rendered title and the per-alert HTML bodies for a Google
// Chat message. bodies is positionally aligned with the alerts slice.
type content struct {
	title  string
	bodies []string
}

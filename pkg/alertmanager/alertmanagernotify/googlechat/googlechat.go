package googlechat

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"net/url"
	"unicode/utf8"

	"github.com/SigNoz/signoz/pkg/alertmanager/alertmanagertemplate"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/templating/markdownrenderer"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/prometheus/alertmanager/notify"
	"github.com/prometheus/alertmanager/template"
	"github.com/prometheus/alertmanager/types"
	"github.com/prometheus/common/model"
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

// content holds the rendered title and the HTML bodies for a Google Chat message.
// bodies is per-alert (positionally aligned with the alerts slice) for a custom
// body template, but a single combined entry for the default template.
type content struct {
	title  string
	bodies []string
}

func New(conf *alertmanagertypes.GoogleChatReceiverConfig, t *template.Template, l *slog.Logger, templater alertmanagertypes.Templater) (*Notifier, error) {
	if conf.HTTPConfig == nil {
		return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "google chat http_config is nil")
	}
	client, err := notify.NewClientWithTracing(*conf.HTTPConfig, Integration)
	if err != nil {
		return nil, err
	}
	return &Notifier{
		conf:      conf,
		tmpl:      t,
		logger:    l,
		client:    client,
		retrier:   &notify.Retrier{RetryCodes: []int{http.StatusTooManyRequests}},
		templater: templater,
	}, nil
}

func (n *Notifier) Notify(ctx context.Context, alerts ...*types.Alert) (bool, error) {
	if n.conf.WebhookURL == nil {
		return false, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "google chat webhook_url is empty")
	}

	key, err := notify.ExtractGroupKey(ctx)
	if err != nil {
		return false, err
	}
	n.logger.DebugContext(ctx, "sending google chat notification", slog.Any("group_key", key))

	c, err := n.prepareContent(ctx, alerts)
	if err != nil {
		return false, err
	}
	// Empty title and every body empty means a misconfigured template, so fail
	// loudly and non-retryably instead of sending a card with no content.
	if c.title == "" && !isAnyNonEmpty(c.bodies) {
		return false, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "google chat message rendered empty; check the channel title/text templates")
	}

	status := statusLine(alerts)

	// Cap per-alert sections well under Google Chat's 100-widget limit and keep
	// the card readable; the overflow count drives a "+N more" note. Capping
	// before the size guard keeps the trim loop working only on rendered bodies.
	capAlerts, capBodies, remaining := capAlertSections(alerts, c.bodies)

	// Serialized-size guard: keep the payload within Google Chat's byte limit by
	// trimming the longest body first, then the title (which appears in both the
	// summary and the card header). Banners/buttons are small and bounded, so
	// trimming the text fields always brings the payload under the limit.
	title := c.title
	bodies := append([]string(nil), capBodies...)
	// The shared "Open in SigNoz" button is per-rule (LabelRuleSource), so source
	// it from the original first alert, not the capped set which is empty when no
	// body renders.
	var footerAlert *types.Alert
	if len(alerts) > 0 {
		footerAlert = alerts[0]
	}
	buf, err := encodeMessage(buildMessage(title, status, capAlerts, bodies, remaining, footerAlert))
	if err != nil {
		return false, err
	}
	for buf.Len() > maxMessageBytes {
		over := buf.Len() - maxMessageBytes
		if i := longestBodyIndex(bodies); i >= 0 {
			bodies[i] = truncateToByteLimit(bodies[i], max(len(bodies[i])-over, 0))
		} else if title != "" {
			title = truncateToByteLimit(title, max(len(title)-over, 0))
		} else {
			break
		}
		if buf, err = encodeMessage(buildMessage(title, status, capAlerts, bodies, remaining, footerAlert)); err != nil {
			return false, err
		}
	}

	// Thread same-rule alerts together: threadKey is a stable hash of the
	// alert group key. Changing a rule's grouping starts a new thread.
	u, err := url.Parse(n.conf.WebhookURL.String())
	if err != nil {
		return false, errors.WrapInternalf(err, errors.CodeInternal, "parse google chat webhook url")
	}
	q := u.Query()
	q.Set("threadKey", key.Hash())
	q.Set("messageReplyOption", "REPLY_MESSAGE_FALLBACK_TO_NEW_THREAD")
	u.RawQuery = q.Encode()

	resp, err := notify.PostJSON(ctx, n.client, u.String(), buf) //nolint:bodyclose
	if err != nil {
		return true, notify.RedactURL(err)
	}
	defer notify.Drain(resp)

	shouldRetry, err := n.retrier.Check(resp.StatusCode, resp.Body)
	if err != nil {
		return shouldRetry, notify.NewErrorWithReason(notify.GetFailureReasonFromStatusCode(resp.StatusCode), err)
	}
	return shouldRetry, err
}

// prepareContent expands the title and body templates. Custom templates (from
// alert annotations) override the channel defaults. The title is used as a plain
// summary + card header; the body is converted to HTML for the card text widget.
func (n *Notifier) prepareContent(ctx context.Context, alerts []*types.Alert) (content, error) {
	customTitle, customBody := alertmanagertemplate.ExtractTemplatesFromAnnotations(alerts)
	result, err := n.templater.Expand(ctx, alertmanagertypes.ExpandRequest{
		TitleTemplate:        customTitle,
		BodyTemplate:         customBody,
		DefaultTitleTemplate: n.conf.Title,
		DefaultBodyTemplate:  n.conf.Text,
	}, alerts)
	if err != nil {
		return content{}, err
	}

	// Each body goes into a per-alert card textParagraph, which renders HTML.
	// Default and custom templates are both standard markdown, so convert each
	// one. Bold/links/lists/code render well; tables flatten (rare in alerts).
	bodies := make([]string, len(result.Body))
	for i, body := range result.Body {
		if body == "" {
			continue
		}
		html, err := markdownrenderer.RenderHTML(body)
		if err != nil {
			return content{}, err
		}
		bodies[i] = html
	}

	return content{title: result.Title, bodies: bodies}, nil
}

// statusLine returns a colored firing/resolved banner for the card body.
func statusLine(alerts []*types.Alert) string {
	if types.Alerts(alerts...).Status() == model.AlertResolved {
		return `<font color="#33a853"><b>🟢 RESOLVED</b></font>`
	}
	return `<font color="#d32f2f"><b>🔴 FIRING</b></font>`
}

// relatedButtons builds the per-alert "View Related Logs/Traces" buttons from
// the annotations the ruler attaches to each alert. Empty links are skipped.
func relatedButtons(alert *types.Alert) []button {
	var buttons []button
	add := func(text, u string) {
		if u != "" {
			buttons = append(buttons, button{Text: text, OnClick: onClick{OpenLink: openLink{URL: u}}})
		}
	}
	add("View Related Logs", string(alert.Annotations[ruletypes.AnnotationRelatedLogs]))
	add("View Related Traces", string(alert.Annotations[ruletypes.AnnotationRelatedTraces]))
	return buttons
}

// sigNozButton builds the shared "Open in SigNoz" button from the ruleSource
// label, which is per-rule (identical for every alert in the group).
func sigNozButton(alert *types.Alert) *button {
	if u := string(alert.Labels[ruletypes.LabelRuleSource]); u != "" {
		return &button{Text: "Open in SigNoz", OnClick: onClick{OpenLink: openLink{URL: u}}}
	}
	return nil
}

// capAlertSections keeps the first maxAlertSections non-empty bodies (with their
// aligned alerts) and returns the count of non-empty bodies dropped beyond the
// cap. Capping the render set up front keeps the card within Google Chat's
// widget limit and bounds the size-guard trim loop.
func capAlertSections(alerts []*types.Alert, bodies []string) ([]*types.Alert, []string, int) {
	capAlerts := make([]*types.Alert, 0, maxAlertSections)
	capBodies := make([]string, 0, maxAlertSections)
	remaining := 0
	for i, body := range bodies {
		if body == "" {
			continue
		}
		if len(capBodies) >= maxAlertSections {
			remaining++
			continue
		}
		var alert *types.Alert
		if i < len(alerts) {
			alert = alerts[i]
		}
		capAlerts = append(capAlerts, alert)
		capBodies = append(capBodies, body)
	}
	return capAlerts, capBodies, remaining
}

// buildMessage assembles the text+card payload: a plain text summary plus a card
// with a status banner, one section per alert (its body + related-link buttons),
// an optional "+N more" note, and a shared "Open in SigNoz" footer button. The
// alerts and bodies slices are the already-capped, aligned render set; footerAlert
// is the original first alert, used for the per-rule footer button so it survives
// even when no body renders.
func buildMessage(title, statusHTML string, alerts []*types.Alert, bodies []string, remaining int, footerAlert *types.Alert) Message {
	sections := []cardSection{{Widgets: []widget{{TextParagraph: &textParagraph{Text: statusHTML}}}}}

	for i, body := range bodies {
		if body == "" {
			continue
		}
		widgets := []widget{{TextParagraph: &textParagraph{Text: body}}}
		if i < len(alerts) && alerts[i] != nil {
			if btns := relatedButtons(alerts[i]); len(btns) > 0 {
				widgets = append(widgets, widget{ButtonList: &buttonList{Buttons: btns}})
			}
		}
		sections = append(sections, cardSection{Widgets: widgets})
	}

	if remaining > 0 {
		note := fmt.Sprintf("<i>…and %d more alerts. Open in SigNoz for the full list.</i>", remaining)
		sections = append(sections, cardSection{Widgets: []widget{{TextParagraph: &textParagraph{Text: note}}}})
	}

	if footerAlert != nil {
		if btn := sigNozButton(footerAlert); btn != nil {
			sections = append(sections, cardSection{Widgets: []widget{{ButtonList: &buttonList{Buttons: []button{*btn}}}}})
		}
	}

	return Message{
		Text: title,
		CardsV2: []cardWithID{{
			CardID: "signoz-alert",
			Card:   card{Header: &cardHeader{Title: title}, Sections: sections},
		}},
	}
}

// isAnyNonEmpty reports whether any string in ss is non-empty.
func isAnyNonEmpty(ss []string) bool {
	for _, s := range ss {
		if s != "" {
			return true
		}
	}
	return false
}

// longestBodyIndex returns the index of the longest non-empty body, or -1 when
// all bodies are empty.
func longestBodyIndex(bodies []string) int {
	idx, best := -1, 0
	for i, b := range bodies {
		if len(b) > best {
			idx, best = i, len(b)
		}
	}
	return idx
}

func encodeMessage(msg Message) (*bytes.Buffer, error) {
	var buf bytes.Buffer
	if err := json.NewEncoder(&buf).Encode(msg); err != nil {
		return nil, err
	}
	return &buf, nil
}

// truncateToByteLimit trims s to at most maxBytes bytes on a rune boundary,
// appending an ellipsis when it truncates.
func truncateToByteLimit(s string, maxBytes int) string {
	if len(s) <= maxBytes {
		return s
	}
	const ellipsis = "..."
	target := maxBytes - len(ellipsis)
	if target <= 0 {
		return ellipsis[:maxBytes]
	}
	truncated := s
	for len(truncated) > target {
		_, size := utf8.DecodeLastRuneInString(truncated)
		if size == 0 {
			break
		}
		truncated = truncated[:len(truncated)-size]
	}
	return truncated + ellipsis
}

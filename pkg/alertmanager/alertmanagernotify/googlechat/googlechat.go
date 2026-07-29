package googlechat

import (
	"bytes"
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/url"
	"strings"
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

func New(conf *alertmanagertypes.GoogleChatReceiverConfig, t *template.Template, l *slog.Logger, templater alertmanagertypes.Templater) (*Notifier, error) {
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
	// Empty title AND body means a misconfigured template, so fail loudly and
	// non-retryably instead of sending a card with no content.
	if c.title == "" && c.body == "" {
		return false, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "google chat message rendered empty; check the channel title/text templates")
	}

	status := statusLine(alerts)
	buttons := linkButtons(alerts[0])
	msg := buildMessage(c.title, status, c.body, buttons)
	var buf bytes.Buffer
	if err := json.NewEncoder(&buf).Encode(msg); err != nil {
		return false, err
	}
	// Serialized-size guard: the card body is the large field, so measure the
	// serialized buffer and trim that many body bytes. Each removed body byte
	// drops >=1 serialized byte, so a single pass lands within the limit.
	if buf.Len() > maxMessageBytes {
		over := buf.Len() - maxMessageBytes
		body := truncateToByteLimit(c.body, max(len(c.body)-over, 0))
		msg = buildMessage(c.title, status, body, buttons)
		buf.Reset()
		if err := json.NewEncoder(&buf).Encode(msg); err != nil {
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

	resp, err := notify.PostJSON(ctx, n.client, u.String(), &buf) //nolint:bodyclose
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

	title := result.Title
	body := strings.Join(result.Body, "\n\n")
	// The body goes into a card textParagraph, which renders HTML. Default and
	// custom templates are both standard markdown, so convert uniformly.
	if body != "" {
		if body, err = markdownrenderer.RenderHTML(body); err != nil {
			return content{}, err
		}
	}

	return content{title: title, body: body}, nil
}

// statusLine returns a colored firing/resolved banner for the card body.
func statusLine(alerts []*types.Alert) string {
	if types.Alerts(alerts...).Status() == model.AlertResolved {
		return `<font color="#33a853"><b>🟢 RESOLVED</b></font>`
	}
	return `<font color="#d32f2f"><b>🔴 FIRING</b></font>`
}

// linkButtons builds openLink buttons from the rule/link data the ruler attaches
// to every alert. Empty links are skipped.
func linkButtons(alert *types.Alert) []button {
	var buttons []button
	add := func(text, u string) {
		if u != "" {
			buttons = append(buttons, button{Text: text, OnClick: onClick{OpenLink: openLink{URL: u}}})
		}
	}
	add("Open in SigNoz", string(alert.Labels[ruletypes.LabelRuleSource]))
	add("View Related Logs", string(alert.Annotations[ruletypes.AnnotationRelatedLogs]))
	add("View Related Traces", string(alert.Annotations[ruletypes.AnnotationRelatedTraces]))
	return buttons
}

// buildMessage assembles the text+card payload: a plain text summary plus a card
// with a status banner, the body, and link buttons.
func buildMessage(title, statusHTML, bodyHTML string, buttons []button) Message {
	widgets := []widget{{TextParagraph: &textParagraph{Text: statusHTML}}}
	if bodyHTML != "" {
		widgets = append(widgets, widget{TextParagraph: &textParagraph{Text: bodyHTML}})
	}
	if len(buttons) > 0 {
		widgets = append(widgets, widget{ButtonList: &buttonList{Buttons: buttons}})
	}
	return Message{
		Text: title,
		CardsV2: []cardWithID{{
			CardID: "signoz-alert",
			Card: card{
				Header:   &cardHeader{Title: title},
				Sections: []cardSection{{Widgets: widgets}},
			},
		}},
	}
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

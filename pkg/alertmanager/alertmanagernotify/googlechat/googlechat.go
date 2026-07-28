package googlechat

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/url"
	"strings"
	"unicode/utf8"

	"github.com/SigNoz/signoz/pkg/alertmanager/alertmanagertemplate"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/templating/markdownrenderer"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/prometheus/alertmanager/notify"
	"github.com/prometheus/alertmanager/template"
	"github.com/prometheus/alertmanager/types"
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
		retrier:   &notify.Retrier{},
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
	text := c.title
	if c.body != "" {
		text = fmt.Sprintf("%s\n%s", c.title, c.body)
	}
	text = sanitizeUTF8(text)

	msg := Message{Text: text}
	var buf bytes.Buffer
	if err := json.NewEncoder(&buf).Encode(msg); err != nil {
		return false, err
	}
	// One-time truncation to Google Chat's payload limit. Note: heavy JSON
	// escaping could leave the payload marginally over after re-encoding;
	if buf.Len() > maxMessageBytes {
		over := buf.Len() - maxMessageBytes
		target := max(len(text)-over, 0)
		msg.Text = truncateToByteLimit(text, target)
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
// alert annotations) override the channel defaults; result.IsDefaultBody tells
// whether the body came from the default template.
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

	// Default templates are already authored in Google Chat dialect. Custom
	// templates are standard markdown, so convert them. The templater only
	// reports IsDefaultBody, so the title is gated on the body's default-ness.
	if !result.IsDefaultBody {
		if body != "" {
			if body, err = markdownrenderer.RenderGoogleChatMarkdown(body); err != nil {
				return content{}, err
			}
		}
		if title != "" {
			if title, err = markdownrenderer.RenderGoogleChatMarkdown(title); err != nil {
				return content{}, err
			}
		}
	}

	return content{
		title:         title,
		body:          body,
		isDefaultBody: result.IsDefaultBody,
	}, nil
}

// sanitizeUTF8 replaces invalid UTF-8 byte sequences with the Unicode
// replacement character so Google Chat does not reject the payload.
func sanitizeUTF8(s string) string {
	if utf8.ValidString(s) {
		return s
	}
	var b strings.Builder
	b.Grow(len(s))
	for _, r := range s {
		if r == utf8.RuneError {
			b.WriteRune('�')
		} else {
			b.WriteRune(r)
		}
	}
	return b.String()
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

// Package mattermost delivers alerts to a Mattermost incoming webhook as one
// message attachment per alert: a bar coloured by status and severity, a status
// icon and the alert name linked back to SigNoz, the channel text rendered for
// that alert, and severity and start time fields. A rule's _title_template and
// _body_template replace the card title and body.
package mattermost

import (
	"bytes"
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"os"
	"strings"

	"github.com/SigNoz/signoz/pkg/alertmanager/alertmanagertemplate"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/prometheus/alertmanager/config"
	"github.com/prometheus/alertmanager/notify"
	"github.com/prometheus/alertmanager/template"
	"github.com/prometheus/alertmanager/types"
	commoncfg "github.com/prometheus/common/config"
)

const (
	Integration = "mattermost"

	// Mattermost supports 16383 chars max per post; each card body is kept
	// well under it so a grouped notification still fits.
	maxAttachmentTextRunes = 4000

	// Mattermost accepts at most 100 attachments per post.
	maxAttachments = 100

	colorResolved = "#2eb886"
	colorWarning  = "#f2c744"
	colorCritical = "#e01e5a"

	iconResolved = ":large_green_circle:"
	iconWarning  = ":large_yellow_circle:"
	iconCritical = ":red_circle:"
)

type Notifier struct {
	conf      *config.MattermostConfig
	tmpl      *template.Template
	logger    *slog.Logger
	client    *http.Client
	retrier   *notify.Retrier
	templater alertmanagertypes.Templater
}

// request is the incoming webhook payload.
// https://developers.mattermost.com/integrate/webhooks/incoming/#parameters
type request struct {
	Text        string       `json:"text,omitempty"`
	Channel     string       `json:"channel,omitempty"`
	Username    string       `json:"username,omitempty"`
	IconURL     string       `json:"icon_url,omitempty"`
	IconEmoji   string       `json:"icon_emoji,omitempty"`
	Attachments []attachment `json:"attachments"`
}

// https://developers.mattermost.com/integrate/reference/message-attachments/
type attachment struct {
	Fallback  string  `json:"fallback"`
	Color     string  `json:"color"`
	Title     string  `json:"title"`
	TitleLink string  `json:"title_link,omitempty"`
	Text      string  `json:"text,omitempty"`
	Fields    []field `json:"fields,omitempty"`
	Footer    string  `json:"footer,omitempty"`
}

type field struct {
	Title string `json:"title"`
	Value string `json:"value"`
	Short bool   `json:"short"`
}

func New(conf *config.MattermostConfig, t *template.Template, l *slog.Logger, templater alertmanagertypes.Templater, httpOpts ...commoncfg.HTTPClientOption) (*Notifier, error) {
	if conf.HTTPConfig == nil {
		return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "mattermost http_config is nil")
	}

	client, err := notify.NewClientWithTracing(*conf.HTTPConfig, Integration, httpOpts...)
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

func (n *Notifier) Notify(ctx context.Context, as ...*types.Alert) (bool, error) {
	key, err := notify.ExtractGroupKey(ctx)
	if err != nil {
		return false, err
	}

	logger := n.logger.With(slog.String("group_key", key.String()))

	attachments, err := n.buildAttachments(ctx, logger, as)
	if err != nil {
		return false, err
	}

	webhookURL, err := n.getWebhookURL()
	if err != nil {
		return false, err
	}

	var tmplErr error
	tmplText := notify.TmplText(n.tmpl, notify.GetTemplateData(ctx, n.tmpl, as, logger), &tmplErr)
	req := &request{
		Channel:     tmplText(n.conf.Channel),
		Username:    tmplText(n.conf.Username),
		IconURL:     tmplText(n.conf.IconURL),
		IconEmoji:   tmplText(n.conf.IconEmoji),
		Attachments: attachments,
	}
	if tmplErr != nil {
		return false, tmplErr
	}

	var buf bytes.Buffer
	if err := json.NewEncoder(&buf).Encode(req); err != nil {
		return false, err
	}

	resp, err := notify.PostJSON(ctx, n.client, webhookURL, &buf) //nolint:bodyclose
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

// buildAttachments renders one card per alert. A rule's title template
// replaces the alert name in every card's title; its body template replaces
// the channel text, aligned with the alerts by position.
func (n *Notifier) buildAttachments(ctx context.Context, logger *slog.Logger, as []*types.Alert) ([]attachment, error) {
	customTitle, customBody := alertmanagertemplate.ExtractTemplatesFromAnnotations(as)

	var result *alertmanagertypes.ExpandResult
	if customTitle != "" || customBody != "" {
		var err error
		result, err = n.templater.Expand(ctx, alertmanagertypes.ExpandRequest{
			TitleTemplate: customTitle,
			BodyTemplate:  customBody,
		}, as)
		if err != nil {
			return nil, err
		}

		if len(result.MissingVars) > 0 {
			logger.WarnContext(ctx, "unresolved variables in rule template", slog.Any("template_missing_vars", result.MissingVars))
		}
	}

	shown := as
	if len(shown) > maxAttachments {
		logger.WarnContext(ctx, "dropped alerts over the attachment limit", slog.Int("max_attachments", maxAttachments), slog.Int("alerts", len(as)))
		shown = shown[:maxAttachments]
	}

	attachments := make([]attachment, 0, len(shown))
	for i, alert := range shown {
		name := string(alert.Labels["alertname"])
		if result != nil && result.Title != "" {
			name = result.Title
		}

		var text string
		if customBody != "" && !result.IsDefaultBody && i < len(result.Body) {
			text = result.Body[i]
		} else {
			rendered, err := n.renderChannelText(ctx, logger, alert)
			if err != nil {
				return nil, err
			}
			text = rendered
		}

		text, truncated := notify.TruncateInRunes(strings.TrimSpace(text), maxAttachmentTextRunes)
		if truncated {
			logger.WarnContext(ctx, "truncated attachment text", slog.Int("max_runes", maxAttachmentTextRunes))
		}

		icon, color := statusStyle(alert)
		status := strings.ToUpper(string(alert.Status()))
		attachments = append(attachments, attachment{
			Fallback:  status + ": " + name,
			Color:     color,
			Title:     icon + " " + status + ": " + name,
			TitleLink: alert.GeneratorURL,
			Text:      text,
			Fields:    alertFields(alert),
			Footer:    "SigNoz",
		})
	}

	return attachments, nil
}

// renderChannelText renders the channel's text for a single alert, so each
// card carries only its own alert.
func (n *Notifier) renderChannelText(ctx context.Context, logger *slog.Logger, alert *types.Alert) (string, error) {
	if n.conf.Text == "" {
		return "", nil
	}

	var tmplErr error
	rendered := notify.TmplText(n.tmpl, notify.GetTemplateData(ctx, n.tmpl, []*types.Alert{alert}, logger), &tmplErr)(n.conf.Text)
	if tmplErr != nil {
		return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "failed to execute mattermost template: %s", tmplErr.Error())
	}

	return rendered, nil
}

// statusStyle colours a card green when resolved, yellow when a warning is
// firing and red for anything else firing.
func statusStyle(alert *types.Alert) (string, string) {
	switch {
	case alert.Resolved():
		return iconResolved, colorResolved
	case strings.EqualFold(string(alert.Labels["severity"]), "warning"):
		return iconWarning, colorWarning
	default:
		return iconCritical, colorCritical
	}
}

func alertFields(alert *types.Alert) []field {
	fields := make([]field, 0, 3)
	if severity := string(alert.Labels["severity"]); severity != "" {
		fields = append(fields, field{Title: "Severity", Value: severity, Short: true})
	}
	if !alert.StartsAt.IsZero() {
		fields = append(fields, field{Title: "Started", Value: alert.StartsAt.UTC().Format("2006-01-02 15:04 UTC"), Short: true})
	}
	if alert.Resolved() && !alert.EndsAt.IsZero() {
		fields = append(fields, field{Title: "Resolved", Value: alert.EndsAt.UTC().Format("2006-01-02 15:04 UTC"), Short: true})
	}

	return fields
}

func (n *Notifier) getWebhookURL() (string, error) {
	if n.conf.WebhookURL != nil {
		return n.conf.WebhookURL.String(), nil
	}

	content, err := os.ReadFile(n.conf.WebhookURLFile)
	if err != nil {
		return "", errors.WrapInternalf(err, errors.CodeInternal, "could not read %s", n.conf.WebhookURLFile)
	}

	webhookURL := strings.TrimSpace(string(content))
	if webhookURL == "" {
		return "", errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "mattermost webhook url is empty")
	}

	return webhookURL, nil
}

// Package mattermost delivers alerts to a Mattermost incoming webhook. Without
// per-rule templates it is upstream's notifier unchanged; when the alerts carry
// _title_template or _body_template annotations it sends those instead of the
// channel's text.
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
	upstream "github.com/prometheus/alertmanager/notify/mattermost"
	"github.com/prometheus/alertmanager/template"
	"github.com/prometheus/alertmanager/types"
	commoncfg "github.com/prometheus/common/config"
)

const (
	Integration = "mattermost"

	// Mattermost supports 16383 chars max, the same limit upstream truncates to.
	maxTextLenRunes = 16383
)

type Notifier struct {
	conf      *config.MattermostConfig
	tmpl      *template.Template
	logger    *slog.Logger
	client    *http.Client
	retrier   *notify.Retrier
	templater alertmanagertypes.Templater
	upstream  notify.Notifier
}

// request carries the fields of upstream's request that a rule-templated post
// keeps. https://developers.mattermost.com/integrate/webhooks/incoming/#parameters
type request struct {
	Text      string `json:"text"`
	Channel   string `json:"channel,omitempty"`
	Username  string `json:"username,omitempty"`
	IconURL   string `json:"icon_url,omitempty"`
	IconEmoji string `json:"icon_emoji,omitempty"`
}

func New(conf *config.MattermostConfig, t *template.Template, l *slog.Logger, templater alertmanagertypes.Templater, httpOpts ...commoncfg.HTTPClientOption) (*Notifier, error) {
	if conf.HTTPConfig == nil {
		return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "mattermost http_config is nil")
	}

	upstreamNotifier, err := upstream.New(conf, t, l, httpOpts...)
	if err != nil {
		return nil, err
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
		upstream:  upstreamNotifier,
	}, nil
}

func (n *Notifier) Notify(ctx context.Context, as ...*types.Alert) (bool, error) {
	customTitle, customBody := alertmanagertemplate.ExtractTemplatesFromAnnotations(as)
	if customTitle == "" && customBody == "" {
		return n.upstream.Notify(ctx, as...)
	}

	key, err := notify.ExtractGroupKey(ctx)
	if err != nil {
		return false, err
	}

	logger := n.logger.With(slog.String("group_key", key.String()))

	text, err := n.buildText(ctx, logger, as, customTitle, customBody)
	if err != nil {
		return false, err
	}

	text, truncated := notify.TruncateInRunes(text, maxTextLenRunes)
	if truncated {
		logger.WarnContext(ctx, "truncated text", slog.Int("max_runes", maxTextLenRunes))
	}

	webhookURL, err := n.getWebhookURL()
	if err != nil {
		return false, err
	}

	var tmplErr error
	tmplText := notify.TmplText(n.tmpl, notify.GetTemplateData(ctx, n.tmpl, as, logger), &tmplErr)
	req := &request{
		Text:      text,
		Channel:   tmplText(n.conf.Channel),
		Username:  tmplText(n.conf.Username),
		IconURL:   tmplText(n.conf.IconURL),
		IconEmoji: tmplText(n.conf.IconEmoji),
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

// buildText puts the rule's title as a heading above the body. Rule templates
// are authored in markdown, which Mattermost renders as is. A rule without a
// body template falls back to the channel's text; one without a title template
// sends the body alone.
func (n *Notifier) buildText(ctx context.Context, logger *slog.Logger, as []*types.Alert, customTitle, customBody string) (string, error) {
	result, err := n.templater.Expand(ctx, alertmanagertypes.ExpandRequest{
		TitleTemplate:       customTitle,
		BodyTemplate:        customBody,
		DefaultBodyTemplate: n.conf.Text,
	}, as)
	if err != nil {
		return "", err
	}

	if len(result.MissingVars) > 0 {
		logger.WarnContext(ctx, "unresolved variables in rule template", slog.Any("template_missing_vars", result.MissingVars))
	}

	body := strings.TrimSpace(strings.Join(nonEmpty(result.Body), "\n\n"))
	if result.Title == "" {
		return body, nil
	}

	return strings.TrimSpace("#### " + result.Title + "\n\n" + body), nil
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

func nonEmpty(parts []string) []string {
	kept := make([]string, 0, len(parts))
	for _, part := range parts {
		if part != "" {
			kept = append(kept, part)
		}
	}

	return kept
}

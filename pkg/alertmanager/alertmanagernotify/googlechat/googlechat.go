// Copyright (c) 2026 SigNoz, Inc.
// SPDX-License-Identifier: Apache-2.0

package googlechat

import (
	"bytes"
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/url"
	"strings"

	"github.com/SigNoz/signoz/pkg/alertmanager/alertmanagertemplate"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	commoncfg "github.com/prometheus/common/config"

	"github.com/prometheus/alertmanager/notify"
	"github.com/prometheus/alertmanager/template"
	"github.com/prometheus/alertmanager/types"
)

const (
	Integration = "googlechat"
)

// Notifier implements a Notifier for Google Chat notifications.
type Notifier struct {
	config    *alertmanagertypes.GoogleChatReceiverConfig
	logger    *slog.Logger
	client    *http.Client
	retrier   *notify.Retrier
	templater alertmanagertypes.Templater
}

// New returns a new Google Chat notifier. The template is consumed via the
// templater, so the *template.Template argument is accepted only for signature
// parity with the other notifiers.
func New(cfg *alertmanagertypes.GoogleChatReceiverConfig, _ *template.Template, l *slog.Logger, templater alertmanagertypes.Templater, httpOpts ...commoncfg.HTTPClientOption) (*Notifier, error) {
	if cfg == nil {
		return nil, errors.NewInternalf(errors.CodeInternal, "google chat config is required")
	}
	if cfg.WebhookURL == nil {
		return nil, errors.NewInternalf(errors.CodeInternal, "google chat webhook_url is required")
	}
	if err := validateWebhookURL(cfg.WebhookURL.String()); err != nil {
		return nil, err
	}

	client, err := notify.NewClientWithTracing(commoncfg.DefaultHTTPClientConfig, Integration, httpOpts...)
	if err != nil {
		return nil, err
	}

	return &Notifier{
		config:    cfg,
		logger:    l,
		client:    client,
		retrier:   &notify.Retrier{},
		templater: templater,
	}, nil
}

func validateWebhookURL(rawURL string) error {
	u, err := url.Parse(rawURL)
	if err != nil {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "invalid google chat webhook_url: %v", err)
	}
	if u.Scheme != "https" {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "google chat webhook_url must use https")
	}
	host := strings.ToLower(u.Hostname())
	if host != "chat.googleapis.com" {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "google chat webhook_url must use chat.googleapis.com")
	}
	return nil
}

// Message represents the payload sent to Google Chat webhook.
type Message struct {
	Text string `json:"text"`
}

// Notify implements the Notifier interface.
func (n *Notifier) Notify(ctx context.Context, alerts ...*types.Alert) (bool, error) {
	key, err := notify.ExtractGroupKey(ctx)
	if err != nil {
		return false, err
	}
	logger := n.logger.With(slog.Any("group_key", key))
	logger.DebugContext(ctx, "extracted group key")

	cfg := n.config

	// Expand the title/body templates via the shared templater so that
	// per-alert custom templates supplied through annotations override the
	// receiver defaults (consistent with the other SigNoz notifiers).
	customTitle, customBody := alertmanagertemplate.ExtractTemplatesFromAnnotations(alerts)
	result, err := n.templater.Expand(ctx, alertmanagertypes.ExpandRequest{
		TitleTemplate:        customTitle,
		BodyTemplate:         customBody,
		DefaultTitleTemplate: cfg.Title,
		DefaultBodyTemplate:  cfg.Text,
	}, alerts)
	if err != nil {
		return false, errors.NewInternalf(errors.CodeInternal, "failed to render templates: %v", err)
	}

	// Build the final message: the title followed by each alert's (non-empty)
	// rendered body. Google Chat receives a single plain-text message.
	finalText := result.Title
	bodyParts := make([]string, 0, len(result.Body))
	for _, body := range result.Body {
		if body != "" {
			bodyParts = append(bodyParts, body)
		}
	}
	if len(bodyParts) > 0 {
		finalText = result.Title + "\n" + strings.Join(bodyParts, "\n")
	}

	msg := &Message{
		Text: finalText,
	}

	var buf bytes.Buffer
	if err := json.NewEncoder(&buf).Encode(msg); err != nil {
		return false, err
	}

	// Add threading support
	// https://developers.google.com/chat/how-tos/webhooks#start_a_message_thread
	webhookURL := cfg.WebhookURL.String()
	u, err := url.Parse(webhookURL)
	if err != nil {
		return false, errors.NewInternalf(errors.CodeInternal, "unable to parse googlechat url: %v", err)
	}
	q := u.Query()
	q.Set("threadKey", key.Hash())
	q.Set("messageReplyOption", "REPLY_MESSAGE_FALLBACK_TO_NEW_THREAD")
	u.RawQuery = q.Encode()
	webhookURL = u.String()

	resp, err := notify.PostJSON(ctx, n.client, webhookURL, &buf) //nolint:bodyclose
	if err != nil {
		if ctx.Err() != nil {
			err = errors.NewInternalf(errors.CodeInternal, "failed to post JSON to google chat: %v", context.Cause(ctx))
		}
		return true, notify.RedactURL(err)
	}
	defer notify.Drain(resp)

	shouldRetry, err := n.retrier.Check(resp.StatusCode, resp.Body)
	if err != nil {
		return shouldRetry, notify.NewErrorWithReason(notify.GetFailureReasonFromStatusCode(resp.StatusCode), err)
	}

	return shouldRetry, err
}

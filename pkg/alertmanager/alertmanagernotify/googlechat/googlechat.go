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
	"unicode/utf8"

	"github.com/SigNoz/signoz/pkg/alertmanager/alertmanagertemplate"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/templating/markdownrenderer"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	commoncfg "github.com/prometheus/common/config"

	"github.com/prometheus/alertmanager/notify"
	"github.com/prometheus/alertmanager/template"
	"github.com/prometheus/alertmanager/types"
)

const (
	Integration = "googlechat"
	// maxMessageBytes is the Google Chat API limit for the entire message payload
	// https://developers.google.com/chat/api/guides/message-formats/basic#maximum_size
	maxMessageBytes = 32000
)

// Notifier implements a Notifier for Google Chat notifications.
type Notifier struct {
	config    *alertmanagertypes.GoogleChatReceiverConfig
	tmpl      *template.Template
	logger    *slog.Logger
	client    *http.Client
	retrier   *notify.Retrier
	templater alertmanagertypes.Templater
}

// New returns a new Google Chat notifier.
func New(cfg *alertmanagertypes.GoogleChatReceiverConfig, t *template.Template, l *slog.Logger, templater alertmanagertypes.Templater, httpOpts ...commoncfg.HTTPClientOption) (*Notifier, error) {
	client, err := notify.NewClientWithTracing(*cfg.HTTPConfig, Integration, httpOpts...)
	if err != nil {
		return nil, err
	}

	return &Notifier{
		config:    cfg,
		tmpl:      t,
		logger:    l,
		client:    client,
		retrier:   &notify.Retrier{},
		templater: templater,
	}, nil
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

	// Use the templater to expand title and body with custom template support
	result, err := n.prepareContent(ctx, alerts)
	if err != nil {
		return false, err
	}

	// Build the final message
	finalText := result.Title
	if result.Body != "" {
		finalText = result.Title + "\n" + result.Body
	}

	// Sanitize UTF-8
	finalText = sanitizeUTF8(finalText)

	// Encode message and check total payload size
	msg := &Message{
		Text: finalText,
	}

	var buf bytes.Buffer
	if err := json.NewEncoder(&buf).Encode(msg); err != nil {
		return false, err
	}

	// If the payload exceeds the limit, truncate the text
	if buf.Len() > maxMessageBytes {
		// Calculate how many bytes over the limit we are
		excessBytes := buf.Len() - maxMessageBytes

		// Remove at least that many bytes from the text
		newTextSize := len(finalText) - excessBytes
		if newTextSize < 0 {
			newTextSize = 0
		}

		finalText = truncateToByteLimit(finalText, newTextSize)
		msg.Text = finalText

		// Re-encode with truncated text
		buf.Reset()
		if err := json.NewEncoder(&buf).Encode(msg); err != nil {
			return false, err
		}
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

// prepareContent expands alert templates and returns the title and body
// ready to send. This supports custom templates from alert annotations.
func (n *Notifier) prepareContent(ctx context.Context, alerts []*types.Alert) (*contentResult, error) {
	// Extract custom templates from alert annotations
	customTitle, customBody := alertmanagertemplate.ExtractTemplatesFromAnnotations(alerts)

	// Use the templater to expand templates
	result, err := n.templater.Expand(ctx, alertmanagertypes.ExpandRequest{
		TitleTemplate:        customTitle,
		BodyTemplate:         customBody,
		DefaultTitleTemplate: n.config.Title,
		DefaultBodyTemplate:  n.config.Text,
	}, alerts)
	if err != nil {
		return nil, err
	}

	// For Google Chat, we combine all bodies into a single text message
	body := ""
	if len(result.Body) > 0 {
		// Join all alert bodies with newlines
		body = strings.Join(result.Body, "\n\n")
	}

	// Custom templates are authored in standard markdown, but Google Chat
	// webhooks expect a different format
	title := result.Title
	if !result.IsDefaultBody {
		if body != "" {
			rendered, renderErr := markdownrenderer.RenderGoogleChatMarkdown(body)
			if renderErr != nil {
				return nil, renderErr
			}
			body = rendered
		}
		if title != "" {
			rendered, renderErr := markdownrenderer.RenderGoogleChatMarkdown(title)
			if renderErr != nil {
				return nil, renderErr
			}
			title = rendered
		}
	}

	return &contentResult{
		Title:         title,
		Body:          body,
		IsDefaultBody: result.IsDefaultBody,
	}, nil
}

// contentResult holds the prepared content for a Google Chat message.
type contentResult struct {
	Title         string
	Body          string
	IsDefaultBody bool
}

// sanitizeUTF8 removes invalid UTF-8 characters from a string and replaces them
func sanitizeUTF8(s string) string {
	if utf8.ValidString(s) {
		return s
	}

	// String contains invalid UTF-8, rebuild it with valid characters only
	var buf strings.Builder
	buf.Grow(len(s))

	for _, r := range s {
		if r == utf8.RuneError {
			// Invalid UTF-8 byte sequence, replace with replacement character
			buf.WriteRune('\uFFFD')
		} else {
			buf.WriteRune(r)
		}
	}

	return buf.String()
}

// truncateToByteLimit truncates a string to fit within the specified byte limit
func truncateToByteLimit(s string, maxBytes int) string {
	if len(s) <= maxBytes {
		return s
	}

	// Reserve space for ellipsis
	const ellipsis = "..."
	const ellipsisBytes = len(ellipsis)
	targetBytes := maxBytes - ellipsisBytes

	if targetBytes <= 0 {
		// Edge case: limit is too small even for ellipsis
		return ellipsis[:maxBytes]
	}

	// Truncate at UTF-8 character boundary
	truncated := s
	for len(truncated) > targetBytes {
		// Remove one rune at a time from the end
		_, size := utf8.DecodeLastRuneInString(truncated)
		if size == 0 {
			break
		}
		truncated = truncated[:len(truncated)-size]
	}

	return truncated + ellipsis
}

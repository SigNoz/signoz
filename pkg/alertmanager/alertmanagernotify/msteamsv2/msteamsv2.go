// Copyright (c) 2026 SigNoz, Inc.
// Copyright 2019 Prometheus Team
// SPDX-License-Identifier: Apache-2.0

package msteamsv2

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"unicode"

	"github.com/SigNoz/signoz/pkg/alertmanager/alertmanagertemplate"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
	commoncfg "github.com/prometheus/common/config"
	"github.com/prometheus/common/model"

	"github.com/prometheus/alertmanager/config"
	"github.com/prometheus/alertmanager/notify"
	"github.com/prometheus/alertmanager/template"
	"github.com/prometheus/alertmanager/types"
)

const (
	colorRed   = "Attention"
	colorGreen = "Good"
	colorGrey  = "Warning"
)

const (
	Integration = "msteamsv2"

	// Teams rejects messages over 28 KB; the margin covers the workflow's own envelope.
	// https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook
	maxMessageBytes = 25 * 1024
)

type Notifier struct {
	conf         *config.MSTeamsV2Config
	titleLink    string
	tmpl         *template.Template
	logger       *slog.Logger
	client       *http.Client
	retrier      *notify.Retrier
	webhookURL   *config.SecretURL
	postJSONFunc func(ctx context.Context, client *http.Client, url string, body io.Reader) (*http.Response, error)
	templater    alertmanagertypes.Templater
}

// https://learn.microsoft.com/en-us/connectors/teams/?tabs=text1#adaptivecarditemschema
type Content struct {
	Schema  string   `json:"$schema"`
	Type    string   `json:"type"`
	Version string   `json:"version"`
	Body    []Body   `json:"body"`
	Msteams Msteams  `json:"msteams,omitzero"`
	Actions []Action `json:"actions"`
}

type Body struct {
	Type   string `json:"type"`
	Text   string `json:"text"`
	Weight string `json:"weight,omitempty"`
	Size   string `json:"size,omitempty"`
	Wrap   bool   `json:"wrap,omitempty"`
	Style  string `json:"style,omitempty"`
	Color  string `json:"color,omitempty"`
}

type Action struct {
	Type  string `json:"type"`
	Title string `json:"title"`
	URL   string `json:"url"`
}

type Msteams struct {
	Width string `json:"width"`
}

type Attachment struct {
	ContentType string  `json:"contentType"`
	ContentURL  *string `json:"contentUrl"` // Use a pointer to handle null values
	Content     Content `json:"content"`
}

type teamsMessage struct {
	Type        string       `json:"type"`
	Attachments []Attachment `json:"attachments"`
}

// New returns a new notifier that uses the Microsoft Teams Power Platform connector.
func New(c *config.MSTeamsV2Config, t *template.Template, titleLink string, l *slog.Logger, templater alertmanagertypes.Templater, httpOpts ...commoncfg.HTTPClientOption) (*Notifier, error) {
	client, err := notify.NewClientWithTracing(*c.HTTPConfig, Integration, httpOpts...)
	if err != nil {
		return nil, err
	}

	n := &Notifier{
		conf:         c,
		titleLink:    titleLink,
		tmpl:         t,
		logger:       l,
		client:       client,
		retrier:      &notify.Retrier{},
		webhookURL:   c.WebhookURL,
		postJSONFunc: notify.PostJSON,
		templater:    templater,
	}

	return n, nil
}

func (n *Notifier) Notify(ctx context.Context, as ...*types.Alert) (bool, error) {
	key, err := notify.ExtractGroupKey(ctx)
	if err != nil {
		return false, err
	}

	n.logger.DebugContext(ctx, "extracted group key", slog.String("key", string(key)))

	data := notify.GetTemplateData(ctx, n.tmpl, as, n.logger)
	tmpl := notify.TmplText(n.tmpl, data, &err)
	if err != nil {
		return false, err
	}

	titleLink := tmpl(n.titleLink)
	if err != nil {
		return false, err
	}

	var url string
	if n.conf.WebhookURL != nil {
		url = n.conf.WebhookURL.String()
	} else {
		content, err := os.ReadFile(n.conf.WebhookURLFile)
		if err != nil {
			return false, errors.WrapInternalf(err, errors.CodeInternal, "read webhook_url_file")
		}
		url = strings.TrimSpace(string(content))
	}

	bodyBlocks, err := n.prepareContent(ctx, as)
	if err != nil {
		n.logger.ErrorContext(ctx, "failed to prepare notification content", errors.Attr(err))
		return false, err
	}

	payload, err := encodeMessage(bodyBlocks, titleLink)
	if err != nil {
		return false, err
	}
	for payload.Len() > maxMessageBytes {
		longest := indexLongestText(bodyBlocks)
		if longest < 0 {
			break
		}
		text := bodyBlocks[longest].Text
		bodyBlocks[longest].Text, _ = notify.TruncateInBytes(text, max(len(text)-(payload.Len()-maxMessageBytes), 0))
		n.logger.WarnContext(ctx, "truncated message text to fit the size limit", slog.Int("max_bytes", maxMessageBytes))
		if payload, err = encodeMessage(bodyBlocks, titleLink); err != nil {
			return false, err
		}
	}

	resp, err := n.postJSONFunc(ctx, n.client, url, payload) //nolint:bodyclose
	if err != nil {
		return true, notify.RedactURL(err)
	}
	defer notify.Drain(resp) //drain is used to close the body of the response hence the nolint directive

	// https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/connectors-using?tabs=cURL#rate-limiting-for-connectors
	shouldRetry, err := n.retrier.Check(resp.StatusCode, resp.Body)
	if err != nil {
		return shouldRetry, notify.NewErrorWithReason(notify.GetFailureReasonFromStatusCode(resp.StatusCode), err)
	}
	return shouldRetry, err
}

// prepareContent builds the Adaptive Card body blocks for the notification.
// The first block is always the title; the remainder is the channel text, or
// one block per alert when the alerts carried a custom body template.
func (n *Notifier) prepareContent(ctx context.Context, alerts []*types.Alert) ([]Body, error) {
	customTitle, customBody := alertmanagertemplate.ExtractTemplatesFromAnnotations(alerts)
	result, err := n.templater.Expand(ctx, alertmanagertypes.ExpandRequest{
		TitleTemplate:        customTitle,
		BodyTemplate:         customBody,
		DefaultTitleTemplate: n.conf.Title,
		DefaultBodyTemplate:  n.conf.Text,
	}, escapeLabelValues(alerts))
	if err != nil {
		return nil, err
	}

	color := colorGrey
	switch types.Alerts(alerts...).Status() {
	case model.AlertFiring:
		color = colorRed
	case model.AlertResolved:
		color = colorGreen
	}

	blocks := []Body{{
		Type:   "TextBlock",
		Text:   result.Title,
		Weight: "Bolder",
		Size:   "Medium",
		Wrap:   true,
		Style:  "heading",
		Color:  color,
	}}

	if result.IsDefaultBody {
		for _, body := range result.Body {
			if body = strings.TrimSpace(body); body != "" {
				blocks = append(blocks, Body{Type: "TextBlock", Text: body, Wrap: true})
			}
		}
		return blocks, nil
	}

	// Custom body path: result.Body is positionally aligned with alerts;
	// entries for alerts whose template rendered empty are kept as "" so we
	// can skip them here without shifting the per-alert color index.
	for i, body := range result.Body {
		if body == "" || i >= len(alerts) {
			continue
		}
		perAlertColor := colorRed
		if alerts[i].Resolved() {
			perAlertColor = colorGreen
		}
		blocks = append(blocks, Body{
			Type:  "TextBlock",
			Text:  body,
			Wrap:  true,
			Color: perAlertColor,
		})
	}
	return blocks, nil
}

// escapeLabelValues copies the alerts so a label value shows on the card as written instead of being read as markdown.
func escapeLabelValues(alerts []*types.Alert) []*types.Alert {
	escaped := make([]*types.Alert, 0, len(alerts))

	for _, alert := range alerts {
		labels := make(model.LabelSet, len(alert.Labels))
		for name, value := range alert.Labels {
			if name == ruletypes.LabelRuleSource {
				labels[name] = value
				continue
			}
			labels[name] = model.LabelValue(escapeMarkdown(string(value)))
		}

		copied := *alert
		copied.Labels = labels
		escaped = append(escaped, &copied)
	}

	return escaped
}

// escapeMarkdown leaves an underscore inside a word alone, since Teams only reads one at a word edge as emphasis.
func escapeMarkdown(value string) string {
	runes := []rune(value)

	var escaped strings.Builder
	for i, r := range runes {
		switch r {
		case '*', '[', ']':
			escaped.WriteRune('\\')
		case '_':
			if i == 0 || i == len(runes)-1 || !isWordRune(runes[i-1]) || !isWordRune(runes[i+1]) {
				escaped.WriteRune('\\')
			}
		}
		escaped.WriteRune(r)
	}

	return escaped.String()
}

func isWordRune(r rune) bool {
	return unicode.IsLetter(r) || unicode.IsDigit(r)
}

// A message as referenced in https://learn.microsoft.com/en-us/connectors/teams/?tabs=text1%2Cdotnet#request-body-schema
func encodeMessage(bodyBlocks []Body, titleLink string) (*bytes.Buffer, error) {
	message := teamsMessage{
		Type: "message",
		Attachments: []Attachment{
			{
				ContentType: "application/vnd.microsoft.card.adaptive",
				ContentURL:  nil,
				Content: Content{
					Schema:  "http://adaptivecards.io/schemas/adaptive-card.json",
					Type:    "AdaptiveCard",
					Version: "1.2",
					Body:    bodyBlocks,
					Actions: []Action{
						{
							Type:  "Action.OpenUrl",
							Title: "View Alert",
							URL:   titleLink,
						},
					},
					Msteams: Msteams{
						Width: "full",
					},
				},
			},
		},
	}

	var payload bytes.Buffer
	if err := json.NewEncoder(&payload).Encode(message); err != nil {
		return nil, err
	}

	return &payload, nil
}

// indexLongestText returns -1 once no block has text left to trim; the title at index 0 goes last.
func indexLongestText(blocks []Body) int {
	longest := -1
	for i := 1; i < len(blocks); i++ {
		if len(blocks[i].Text) > 0 && (longest < 0 || len(blocks[i].Text) > len(blocks[longest].Text)) {
			longest = i
		}
	}
	if longest < 0 && len(blocks) > 0 && len(blocks[0].Text) > 0 {
		return 0
	}

	return longest
}

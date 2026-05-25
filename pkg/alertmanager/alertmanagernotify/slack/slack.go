// Copyright (c) 2026 SigNoz, Inc.
// Copyright 2019 Prometheus Team
// SPDX-License-Identifier: Apache-2.0

package slack

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"os"
	"strings"

	"github.com/SigNoz/signoz/pkg/alertmanager/alertmanagertemplate"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/templating/markdownrenderer"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
	commoncfg "github.com/prometheus/common/config"

	"github.com/prometheus/alertmanager/config"
	"github.com/prometheus/alertmanager/notify"
	"github.com/prometheus/alertmanager/template"
	"github.com/prometheus/alertmanager/types"
)

const (
	Integration = "slack"
	colorRed    = "#FF0000"
	colorGreen  = "#00FF00"
)

// https://api.slack.com/reference/messaging/attachments#legacy_fields - 1024, no units given, assuming runes or characters.
const maxTitleLenRunes = 1024

// Notifier implements a Notifier for Slack notifications.
type Notifier struct {
	conf      *config.SlackConfig
	tmpl      *template.Template
	logger    *slog.Logger
	client    *http.Client
	retrier   *notify.Retrier
	templater alertmanagertypes.Templater

	postJSONFunc func(ctx context.Context, client *http.Client, url string, body io.Reader) (*http.Response, error)
}

// New returns a new Slack notification handler.
func New(c *config.SlackConfig, t *template.Template, l *slog.Logger, templater alertmanagertypes.Templater, httpOpts ...commoncfg.HTTPClientOption) (*Notifier, error) {
	client, err := notify.NewClientWithTracing(*c.HTTPConfig, Integration, httpOpts...)
	if err != nil {
		return nil, err
	}

	return &Notifier{
		conf:         c,
		tmpl:         t,
		logger:       l,
		client:       client,
		retrier:      &notify.Retrier{},
		templater:    templater,
		postJSONFunc: notify.PostJSON,
	}, nil
}

// request is the request for sending a slack notification.
type request struct {
	Channel     string       `json:"channel,omitempty"`
	Username    string       `json:"username,omitempty"`
	IconEmoji   string       `json:"icon_emoji,omitempty"`
	IconURL     string       `json:"icon_url,omitempty"`
	LinkNames   bool         `json:"link_names,omitempty"`
	Text        string       `json:"text,omitempty"`
	Attachments []attachment `json:"attachments"`
}

// attachment is used to display a richly-formatted message block.
type attachment struct {
	Title      string               `json:"title,omitempty"`
	TitleLink  string               `json:"title_link,omitempty"`
	Pretext    string               `json:"pretext,omitempty"`
	Text       string               `json:"text"`
	Fallback   string               `json:"fallback"`
	CallbackID string               `json:"callback_id"`
	Fields     []config.SlackField  `json:"fields,omitempty"`
	Actions    []config.SlackAction `json:"actions,omitempty"`
	ImageURL   string               `json:"image_url,omitempty"`
	ThumbURL   string               `json:"thumb_url,omitempty"`
	Footer     string               `json:"footer,omitempty"`
	Color      string               `json:"color,omitempty"`
	MrkdwnIn   []string             `json:"mrkdwn_in,omitempty"`
	Blocks     []any                `json:"blocks,omitempty"`
}

// Notify implements the Notifier interface.
func (n *Notifier) Notify(ctx context.Context, as ...*types.Alert) (bool, error) {

	key, err := notify.ExtractGroupKey(ctx)
	if err != nil {
		return false, err
	}
	logger := n.logger.With(slog.Any("group_key", key))
	logger.DebugContext(ctx, "extracted group key")

	var (
		data     = notify.GetTemplateData(ctx, n.tmpl, as, logger)
		tmplText = notify.TmplText(n.tmpl, data, &err)
	)

	attachments, err := n.prepareContent(ctx, as, tmplText)
	if err != nil {
		n.logger.ErrorContext(ctx, "failed to prepare notification content", errors.Attr(err))
		return false, err
	}

	if len(attachments) > 0 {
		n.addFieldsAndActions(&attachments[0], tmplText)
	}

	req := &request{
		Channel:     tmplText(n.conf.Channel),
		Username:    tmplText(n.conf.Username),
		IconEmoji:   tmplText(n.conf.IconEmoji),
		IconURL:     tmplText(n.conf.IconURL),
		LinkNames:   n.conf.LinkNames,
		Text:        tmplText(n.conf.MessageText),
		Attachments: attachments,
	}
	if err != nil {
		return false, err
	}

	var buf bytes.Buffer
	if err := json.NewEncoder(&buf).Encode(req); err != nil {
		return false, err
	}

	var u string
	if n.conf.APIURL != nil {
		u = n.conf.APIURL.String()
	} else {
		content, err := os.ReadFile(n.conf.APIURLFile)
		if err != nil {
			return false, err
		}
		u = strings.TrimSpace(string(content))
	}

	if n.conf.Timeout > 0 {
		postCtx, cancel := context.WithTimeoutCause(ctx, n.conf.Timeout, errors.NewInternalf(errors.CodeTimeout, "configured slack timeout reached (%s)", n.conf.Timeout))
		defer cancel()
		ctx = postCtx
	}

	resp, err := n.postJSONFunc(ctx, n.client, u, &buf) //nolint:bodyclose
	if err != nil {
		if ctx.Err() != nil {
			err = errors.NewInternalf(errors.CodeInternal, "failed to post JSON to slack: %v", context.Cause(ctx))
		}
		return true, notify.RedactURL(err)
	}
	defer notify.Drain(resp)

	// Use a retrier to generate an error message for non-200 responses and
	// classify them as retriable or not.
	retry, err := n.retrier.Check(resp.StatusCode, resp.Body)
	if err != nil {
		err = errors.NewInternalf(errors.CodeInternal, "channel %q: %v", req.Channel, err)
		return retry, notify.NewErrorWithReason(notify.GetFailureReasonFromStatusCode(resp.StatusCode), err)
	}

	// Slack web API might return errors with a 200 response code.
	// https://docs.slack.dev/tools/node-slack-sdk/web-api/#handle-errors
	retry, err = checkResponseError(resp)
	if err != nil {
		err = errors.NewInternalf(errors.CodeInternal, "channel %q: %v", req.Channel, err)
		return retry, notify.NewErrorWithReason(notify.ClientErrorReason, err)
	}

	return retry, nil
}

// prepareContent expands alert templates and returns the Slack attachment(s)
// ready to send. When alerts carry a custom body template, one title-only
// attachment plus one body attachment per alert is returned so that each alert
// can get its own firing/resolved color and per-alert action buttons.
func (n *Notifier) prepareContent(ctx context.Context, alerts []*types.Alert, tmplText func(string) string) ([]attachment, error) {
	customTitle, customBody := alertmanagertemplate.ExtractTemplatesFromAnnotations(alerts)
	result, err := n.templater.Expand(ctx, alertmanagertypes.ExpandRequest{
		TitleTemplate:        customTitle,
		BodyTemplate:         customBody,
		DefaultTitleTemplate: n.conf.Title,
		DefaultBodyTemplate:  n.conf.Text,
	}, alerts)
	if err != nil {
		return nil, err
	}

	title, truncated := notify.TruncateInRunes(result.Title, maxTitleLenRunes)
	if truncated {
		n.logger.WarnContext(ctx, "Truncated title", slog.Int("max_runes", maxTitleLenRunes))
	}

	if result.IsDefaultBody {
		var markdownIn []string
		if len(n.conf.MrkdwnIn) == 0 {
			markdownIn = []string{"fallback", "pretext", "text"}
		} else {
			markdownIn = n.conf.MrkdwnIn
		}
		return []attachment{
			{
				Title:      title,
				TitleLink:  tmplText(n.conf.TitleLink),
				Pretext:    tmplText(n.conf.Pretext),
				Text:       result.Body[0],
				Fallback:   tmplText(n.conf.Fallback),
				CallbackID: tmplText(n.conf.CallbackID),
				ImageURL:   tmplText(n.conf.ImageURL),
				ThumbURL:   tmplText(n.conf.ThumbURL),
				Footer:     tmplText(n.conf.Footer),
				Color:      tmplText(n.conf.Color),
				MrkdwnIn:   markdownIn,
			},
		}, nil
	}

	// Custom template path: one title attachment + one attachment per
	// non-empty alert body. result.Body is positionally aligned with alerts,
	// so we index alerts[i] directly and skip empty entries.
	attachments := make([]attachment, 0, 1+len(result.Body))
	attachments = append(attachments, attachment{
		Title:     title,
		TitleLink: tmplText(n.conf.TitleLink),
	})

	for i, body := range result.Body {
		if body == "" || i >= len(alerts) {
			continue
		}

		// Custom bodies are authored in markdown; render each non-empty body to
		// Slack's mrkdwn flavour. Default bodies skip this because the Text
		// template is already channel-ready.
		rendered, renderErr := markdownrenderer.RenderSlackMrkdwn(body)
		if renderErr != nil {
			return nil, renderErr
		}

		color := colorRed
		if alerts[i].Resolved() {
			color = colorGreen
		}
		attachments = append(attachments, attachment{
			Text:     rendered,
			Color:    color,
			MrkdwnIn: []string{"text"},
			Actions:  buildRelatedLinkActions(alerts[i]),
		})
	}

	return attachments, nil
}

// buildRelatedLinkActions returns the "View Related Logs/Traces" action
// buttons for an alert, or nil when no related-link annotations are present.
func buildRelatedLinkActions(alert *types.Alert) []config.SlackAction {
	var actions []config.SlackAction
	if link := alert.Annotations[ruletypes.AnnotationRelatedLogs]; link != "" {
		actions = append(actions, config.SlackAction{Type: "button", Text: "View Related Logs", URL: string(link)})
	}
	if link := alert.Annotations[ruletypes.AnnotationRelatedTraces]; link != "" {
		actions = append(actions, config.SlackAction{Type: "button", Text: "View Related Traces", URL: string(link)})
	}
	return actions
}

// addFieldsAndActions populates fields and actions on the attachment from the Slack config.
func (n *Notifier) addFieldsAndActions(att *attachment, tmplText func(string) string) {
	numFields := len(n.conf.Fields)
	if numFields > 0 {
		fields := make([]config.SlackField, numFields)
		for index, field := range n.conf.Fields {
			var short bool
			if field.Short != nil {
				short = *field.Short
			} else {
				short = n.conf.ShortFields
			}
			fields[index] = config.SlackField{
				Title: tmplText(field.Title),
				Value: tmplText(field.Value),
				Short: &short,
			}
		}
		att.Fields = fields
	}

	numActions := len(n.conf.Actions)
	if numActions > 0 {
		actions := make([]config.SlackAction, numActions)
		for index, action := range n.conf.Actions {
			slackAction := config.SlackAction{
				Type:  tmplText(action.Type),
				Text:  tmplText(action.Text),
				URL:   tmplText(action.URL),
				Style: tmplText(action.Style),
				Name:  tmplText(action.Name),
				Value: tmplText(action.Value),
			}

			if action.ConfirmField != nil {
				slackAction.ConfirmField = &config.SlackConfirmationField{
					Title:       tmplText(action.ConfirmField.Title),
					Text:        tmplText(action.ConfirmField.Text),
					OkText:      tmplText(action.ConfirmField.OkText),
					DismissText: tmplText(action.ConfirmField.DismissText),
				}
			}

			actions[index] = slackAction
		}
		att.Actions = actions
	}
}

// checkResponseError parses out the error message from Slack API response.
func checkResponseError(resp *http.Response) (bool, error) {
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return true, errors.WrapInternalf(err, errors.CodeInternal, "could not read response body")
	}

	if strings.HasPrefix(resp.Header.Get("Content-Type"), "application/json") {
		return checkJSONResponseError(body)
	}
	return checkTextResponseError(body)
}

// checkTextResponseError classifies plaintext responses from Slack.
// A plaintext (non-JSON) response is successful if it's a string "ok".
// This is typically a response for an Incoming Webhook
// (https://api.slack.com/messaging/webhooks#handling_errors)
func checkTextResponseError(body []byte) (bool, error) {
	if !bytes.Equal(body, []byte("ok")) {
		return false, errors.NewInternalf(errors.CodeInternal, "received an error response from Slack: %s", string(body))
	}
	return false, nil
}

// checkJSONResponseError classifies JSON responses from Slack.
func checkJSONResponseError(body []byte) (bool, error) {
	// response is for parsing out errors from the JSON response.
	type response struct {
		OK    bool   `json:"ok"`
		Error string `json:"error"`
	}

	var data response
	if err := json.Unmarshal(body, &data); err != nil {
		return true, errors.NewInternalf(errors.CodeInternal, "could not unmarshal JSON response %q: %v", string(body), err)
	}
	if !data.OK {
		return false, errors.NewInternalf(errors.CodeInternal, "error response from Slack: %s", data.Error)
	}
	return false, nil
}

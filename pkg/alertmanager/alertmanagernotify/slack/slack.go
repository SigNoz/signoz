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
	conf        *config.SlackConfig
	tmpl        *template.Template
	logger      *slog.Logger
	client      *http.Client
	retrier     *notify.Retrier
	templater   alertmanagertypes.Templater
	orgID       string
	threadStore alertmanagertypes.AlertThreadStore

	postJSONFunc func(ctx context.Context, client *http.Client, url string, body io.Reader) (*http.Response, error)
}

// New returns a new Slack notification handler.
func New(c *config.SlackConfig, t *template.Template, l *slog.Logger, templater alertmanagertypes.Templater, orgID string, threadStore alertmanagertypes.AlertThreadStore, httpOpts ...commoncfg.HTTPClientOption) (*Notifier, error) {
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
		orgID:        orgID,
		threadStore:  threadStore,
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
	ThreadTs    string       `json:"thread_ts,omitempty"`
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

	// Check if all alerts in this group are resolved
	allResolved := true
	for _, a := range as {
		if !a.Resolved() {
			allResolved = false
			break
		}
	}

	// Retrieve thread ts from store if available
	var threadTs string
	if n.threadStore != nil {
		threadTs, err = n.threadStore.GetThreadTs(ctx, n.orgID, string(key))
		if err != nil {
			logger.WarnContext(ctx, "failed to get thread ts from store", errors.Attr(err))
		}
	}

	// Define function to post a JSON request payload to Slack and return the parsed response
	postToSlack := func(req *request) (slackResponse, bool, error) {
		var buf bytes.Buffer
		if err := json.NewEncoder(&buf).Encode(req); err != nil {
			return slackResponse{}, false, err
		}

		var u string
		if n.conf.APIURL != nil {
			u = n.conf.APIURL.String()
		} else {
			content, err := os.ReadFile(n.conf.APIURLFile)
			if err != nil {
				return slackResponse{}, false, err
			}
			u = strings.TrimSpace(string(content))
		}

		ctxPost := ctx
		if n.conf.Timeout > 0 {
			postCtx, cancel := context.WithTimeoutCause(ctx, n.conf.Timeout, errors.NewInternalf(errors.CodeTimeout, "configured slack timeout reached (%s)", n.conf.Timeout))
			defer cancel()
			ctxPost = postCtx
		}

		resp, err := n.postJSONFunc(ctxPost, n.client, u, &buf)
		if err != nil {
			if ctxPost.Err() != nil {
				err = errors.NewInternalf(errors.CodeInternal, "failed to post JSON to slack: %v", context.Cause(ctxPost))
			}
			return slackResponse{}, true, notify.RedactURL(err)
		}
		defer notify.Drain(resp)

		retry, err := n.retrier.Check(resp.StatusCode, resp.Body)
		if err != nil {
			err = errors.NewInternalf(errors.CodeInternal, "channel %q: %v", req.Channel, err)
			return slackResponse{}, retry, notify.NewErrorWithReason(notify.GetFailureReasonFromStatusCode(resp.StatusCode), err)
		}

		slackResp, retry, err := parseSlackResponse(resp)
		if err != nil {
			err = errors.NewInternalf(errors.CodeInternal, "channel %q: %v", req.Channel, err)
			return slackResponse{}, retry, notify.NewErrorWithReason(notify.ClientErrorReason, err)
		}

		return slackResp, false, nil
	}

	attachments, err := n.prepareContent(ctx, as, tmplText)
	if err != nil {
		n.logger.ErrorContext(ctx, "failed to prepare notification content", errors.Attr(err))
		return false, err
	}

	if len(attachments) > 0 {
		n.addFieldsAndActions(&attachments[0], tmplText)
	}

	title := ""
	if len(attachments) > 0 {
		title = attachments[0].Title
	}

	// 1. Threading case: We already have a thread TS
	if threadTs != "" {
		var threadAttachments []attachment
		if allResolved {
			// For resolved, post a simple resolve message into the thread
			threadAttachments = []attachment{
				{
					Title:     "Resolved: " + strings.TrimPrefix(strings.TrimPrefix(title, "[firing] "), "[resolved] "),
					TitleLink: tmplText(n.conf.TitleLink),
					Color:     colorGreen,
					MrkdwnIn:  []string{"title"},
				},
			}
		} else {
			// If it's an update to a firing alert, post the full updated attachments to the thread
			threadAttachments = attachments
		}

		req := &request{
			Channel:     tmplText(n.conf.Channel),
			Username:    tmplText(n.conf.Username),
			IconEmoji:   tmplText(n.conf.IconEmoji),
			IconURL:     tmplText(n.conf.IconURL),
			LinkNames:   n.conf.LinkNames,
			Attachments: threadAttachments,
			ThreadTs:    threadTs,
		}

		_, retry, err := postToSlack(req)
		if err != nil {
			return retry, err
		}

		// Delete the thread once fully resolved
		if allResolved && n.threadStore != nil {
			if err := n.threadStore.DeleteThread(ctx, n.orgID, string(key)); err != nil {
				logger.WarnContext(ctx, "failed to delete thread from store", errors.Attr(err))
			}
		}

		return false, nil
	}

	// 2. Firing alert starting a new thread (or fallback if allResolved but no thread existed)
	if allResolved {
		// Fallback: resolved alert but no thread exists (e.g. lost state or firing alert was skipped).
		// We just send the full detailed card to the main channel.
		req := &request{
			Channel:     tmplText(n.conf.Channel),
			Username:    tmplText(n.conf.Username),
			IconEmoji:   tmplText(n.conf.IconEmoji),
			IconURL:     tmplText(n.conf.IconURL),
			LinkNames:   n.conf.LinkNames,
			Text:        tmplText(n.conf.MessageText),
			Attachments: attachments,
		}
		_, retry, err := postToSlack(req)
		return retry, err
	}

	// Starting a thread: First post the compact title card to the main channel
	compactAttachment := attachment{
		Title:     title,
		TitleLink: tmplText(n.conf.TitleLink),
		Color:     colorRed,
	}

	req := &request{
		Channel:     tmplText(n.conf.Channel),
		Username:    tmplText(n.conf.Username),
		IconEmoji:   tmplText(n.conf.IconEmoji),
		IconURL:     tmplText(n.conf.IconURL),
		LinkNames:   n.conf.LinkNames,
		Attachments: []attachment{compactAttachment},
	}

	slackResp, retry, err := postToSlack(req)
	if err != nil {
		return retry, err
	}

	// If we got a TS back (indicating it was successfully sent using Web API)
	if slackResp.TS != "" {
		if n.threadStore != nil {
			if err := n.threadStore.SetThreadTs(ctx, n.orgID, string(key), slackResp.TS); err != nil {
				logger.WarnContext(ctx, "failed to save thread ts to store", errors.Attr(err))
			}
		}

		// Post the detailed attachments as a reply inside the newly created thread
		detailReq := &request{
			Channel:     tmplText(n.conf.Channel),
			Username:    tmplText(n.conf.Username),
			IconEmoji:   tmplText(n.conf.IconEmoji),
			IconURL:     tmplText(n.conf.IconURL),
			LinkNames:   n.conf.LinkNames,
			Attachments: attachments,
			ThreadTs:    slackResp.TS,
		}
		_, detailRetry, detailErr := postToSlack(detailReq)
		if detailErr != nil {
			logger.WarnContext(ctx, "failed to post detailed attachments in thread", errors.Attr(detailErr))
			return detailRetry, detailErr
		}
	} else {
		// Fallback: If we got no TS back (e.g. user is using standard incoming webhook),
		// we cannot do threading. We must post the full detailed card to the channel so the user sees the details.
		// Since we already posted the compact title, posting the details now completes the alert info.
		detailReq := &request{
			Channel:     tmplText(n.conf.Channel),
			Username:    tmplText(n.conf.Username),
			IconEmoji:   tmplText(n.conf.IconEmoji),
			IconURL:     tmplText(n.conf.IconURL),
			LinkNames:   n.conf.LinkNames,
			Attachments: attachments,
		}
		_, detailRetry, detailErr := postToSlack(detailReq)
		if detailErr != nil {
			return detailRetry, detailErr
		}
	}

	return false, nil
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

type slackResponse struct {
	OK    bool   `json:"ok"`
	Error string `json:"error"`
	TS    string `json:"ts"`
}

func parseSlackResponse(resp *http.Response) (slackResponse, bool, error) {
	var data slackResponse
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return data, true, errors.WrapInternalf(err, errors.CodeInternal, "could not read response body")
	}

	// Restore body in case it needs to be read again
	resp.Body = io.NopCloser(bytes.NewBuffer(body))

	if strings.HasPrefix(resp.Header.Get("Content-Type"), "application/json") {
		if err := json.Unmarshal(body, &data); err != nil {
			return data, true, errors.NewInternalf(errors.CodeInternal, "could not unmarshal JSON response %q: %v", string(body), err)
		}
		if !data.OK {
			return data, false, errors.NewInternalf(errors.CodeInternal, "error response from Slack: %s", data.Error)
		}
		return data, false, nil
	}

	if !bytes.Equal(body, []byte("ok")) {
		return data, false, errors.NewInternalf(errors.CodeInternal, "received an error response from Slack: %s", string(body))
	}
	data.OK = true
	return data, false, nil
}

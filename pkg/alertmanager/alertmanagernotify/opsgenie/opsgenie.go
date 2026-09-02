// Copyright (c) 2026 SigNoz, Inc.
// Copyright 2019 Prometheus Team
// SPDX-License-Identifier: Apache-2.0

package opsgenie

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"maps"
	"net/http"
	"os"
	"strings"
	"unicode/utf8"

	"github.com/SigNoz/signoz/pkg/alertmanager/alertmanagertemplate"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/templating/markdownrenderer"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	commoncfg "github.com/prometheus/common/config"
	"github.com/prometheus/common/model"

	"github.com/prometheus/alertmanager/config"
	"github.com/prometheus/alertmanager/notify"
	"github.com/prometheus/alertmanager/template"
	"github.com/prometheus/alertmanager/types"
)

const (
	Integration = "opsgenie"
)

// https://support.atlassian.com/opsgenie/docs/alert-fields/ - message 130,
// description 15000, note 25000 runes.
const (
	maxMessageLenRunes     = 130
	maxDescriptionLenRunes = 15000
	maxNoteLenRunes        = 25000
)

// Notifier implements a Notifier for OpsGenie notifications.
type Notifier struct {
	conf      *config.OpsGenieConfig
	tmpl      *template.Template
	logger    *slog.Logger
	client    *http.Client
	retrier   *notify.Retrier
	templater alertmanagertypes.Templater
	// advancedFeatures bundles the JSM Ops enrichments: render the default body as
	// HTML (markdown -> HTML), and post a note per fire and on resolve to build an
	// immutable timeline. Off for plain OpsGenie. The alert-refresh-on-refire part
	// rides on the upstream UpdateAlerts config flag, set alongside this.
	advancedFeatures bool
}

// New returns a new OpsGenie notifier. advancedFeatures enables the JSM Ops
// enrichments (HTML default body + a note timeline per fire and on resolve);
// pass false for plain OpsGenie.
func New(c *config.OpsGenieConfig, t *template.Template, l *slog.Logger, templater alertmanagertypes.Templater, advancedFeatures bool, httpOpts ...commoncfg.HTTPClientOption) (*Notifier, error) {
	client, err := notify.NewClientWithTracing(*c.HTTPConfig, Integration, httpOpts...)
	if err != nil {
		return nil, err
	}
	return &Notifier{
		conf:             c,
		tmpl:             t,
		logger:           l,
		client:           client,
		retrier:          &notify.Retrier{RetryCodes: []int{http.StatusTooManyRequests}},
		templater:        templater,
		advancedFeatures: advancedFeatures,
	}, nil
}

type opsGenieCreateMessage struct {
	Alias       string                           `json:"alias"`
	Message     string                           `json:"message"`
	Description string                           `json:"description,omitempty"`
	Details     map[string]string                `json:"details"`
	Source      string                           `json:"source"`
	Responders  []opsGenieCreateMessageResponder `json:"responders,omitempty"`
	Tags        []string                         `json:"tags,omitempty"`
	Note        string                           `json:"note,omitempty"`
	Priority    string                           `json:"priority,omitempty"`
	Entity      string                           `json:"entity,omitempty"`
	Actions     []string                         `json:"actions,omitempty"`
}

type opsGenieCreateMessageResponder struct {
	ID       string `json:"id,omitempty"`
	Name     string `json:"name,omitempty"`
	Username string `json:"username,omitempty"`
	Type     string `json:"type"` // team, user, escalation, schedule etc.
}

type opsGenieCloseMessage struct {
	Source string `json:"source"`
}

type opsGenieUpdateMessageMessage struct {
	Message string `json:"message,omitempty"`
}

type opsGenieUpdateDescriptionMessage struct {
	Description string `json:"description,omitempty"`
}

type opsGenieAddNoteMessage struct {
	Note   string `json:"note"`
	Source string `json:"source"`
}

// noteRequest builds a POST to the alert's notes endpoint (append-only timeline).
func (n *Notifier) noteRequest(ctx context.Context, alias, note, source string) (*http.Request, error) {
	noteEndpointURL := n.conf.APIURL.Copy()
	noteEndpointURL.Path += fmt.Sprintf("v2/alerts/%s/notes", alias)
	q := noteEndpointURL.Query()
	q.Set("identifierType", "alias")
	noteEndpointURL.RawQuery = q.Encode()

	var buf bytes.Buffer
	if err := json.NewEncoder(&buf).Encode(&opsGenieAddNoteMessage{Note: note, Source: source}); err != nil {
		return nil, err
	}
	req, err := http.NewRequest("POST", noteEndpointURL.String(), &buf)
	if err != nil {
		return nil, err
	}
	return req.WithContext(ctx), nil
}

// Notify implements the Notifier interface.
func (n *Notifier) Notify(ctx context.Context, as ...*types.Alert) (bool, error) {
	requests, retry, err := n.createRequests(ctx, as...)
	if err != nil {
		return retry, err
	}

	for _, req := range requests {
		req.Header.Set("User-Agent", notify.UserAgentHeader)
		resp, err := n.client.Do(req) //nolint:bodyclose
		if err != nil {
			return true, err
		}
		shouldRetry, err := n.retrier.Check(resp.StatusCode, resp.Body)
		notify.Drain(resp)
		if err != nil {
			// notes are enrichment; a permanently-failed note (e.g. the first-fire
			// note racing JSM's async alert create) must not fail the notification
			if !shouldRetry && isNoteRequest(req) {
				n.logger.WarnContext(ctx, "dropping failed note", slog.Int("status_code", resp.StatusCode), errors.Attr(err))
				continue
			}
			return shouldRetry, notify.NewErrorWithReason(notify.GetFailureReasonFromStatusCode(resp.StatusCode), err)
		}
	}
	return true, nil
}

// isNoteRequest reports whether req targets the notes endpoint, the only one
// built by noteRequest.
func isNoteRequest(req *http.Request) bool {
	return strings.HasSuffix(req.URL.Path, "/notes")
}

// Like Split but filter out empty strings.
func safeSplit(s, sep string) []string {
	a := strings.Split(strings.TrimSpace(s), sep)
	b := a[:0]
	for _, x := range a {
		if x != "" {
			b = append(b, x)
		}
	}
	return b
}

// prepareContent expands alert templates and returns the OpsGenie-ready title
// (truncated to the 130-rune limit) and HTML description. Custom bodies are
// rendered to HTML and stitched together with <hr> dividers; default bodies
// are joined with newlines (OpsGenie's legacy plain-text description).
func (n *Notifier) prepareContent(ctx context.Context, alerts []*types.Alert) (string, string, error) {
	customTitle, customBody := alertmanagertemplate.ExtractTemplatesFromAnnotations(alerts)
	result, err := n.templater.Expand(ctx, alertmanagertypes.ExpandRequest{
		TitleTemplate:        customTitle,
		BodyTemplate:         customBody,
		DefaultTitleTemplate: n.conf.Message,
		DefaultBodyTemplate:  n.conf.Description,
	}, alerts)
	if err != nil {
		return "", "", err
	}

	var description string
	if result.IsDefaultBody && !n.advancedFeatures {
		description = strings.Join(result.Body, "\n")
	} else {
		description, err = buildHTMLDescription(result.Body, maxDescriptionLenRunes)
		if err != nil {
			return "", "", err
		}
	}

	title, truncated := notify.TruncateInRunes(result.Title, maxMessageLenRunes)
	if truncated {
		n.logger.WarnContext(ctx, "Truncated message", slog.Int("max_runes", maxMessageLenRunes))
	}

	// The API silently truncates over-limit descriptions, which would drop the
	// trailing SigNoz link; cap here with an ellipsis instead. The HTML path is
	// pre-fitted above, so this only ever cuts the plain-text default body.
	description, descTruncated := notify.TruncateInRunes(description, maxDescriptionLenRunes)
	if descTruncated {
		n.logger.WarnContext(ctx, "Truncated description", slog.Int("max_runes", maxDescriptionLenRunes))
	}

	return title, description, nil
}

const (
	// room reserved for the "+N more" trailer appended when parts are dropped.
	descriptionTrailerReserveRunes = 80
	// below this rendering budget a shrunk part carries no signal; drop it instead.
	minShrinkBudgetRunes = 64
)

// buildHTMLDescription renders each markdown part to HTML (<div>-wrapped,
// <hr>-joined) while keeping the total within budget runes. An over-budget part
// is shrunk at the markdown level and re-rendered so the HTML stays well-formed;
// fully dropped parts are summarized by a "+N more" trailer.
func buildHTMLDescription(parts []string, budget int) (string, error) {
	rendering := make([]string, 0, len(parts))
	for _, part := range parts {
		if part != "" {
			rendering = append(rendering, part)
		}
	}

	budget -= descriptionTrailerReserveRunes
	var b strings.Builder
	used, included := 0, 0
	for _, part := range rendering {
		rendered, err := markdownrenderer.RenderHTML(part)
		if err != nil {
			return "", err
		}
		overhead := len("<div></div>")
		if included > 0 {
			overhead += len("<hr>")
		}
		if used+overhead+utf8.RuneCountInString(rendered) > budget {
			rendered, err = shrinkMarkdownToFit(part, budget-used-overhead)
			if err != nil {
				return "", err
			}
			if rendered == "" {
				break
			}
		}
		if included > 0 {
			b.WriteString("<hr>")
		}
		b.WriteString("<div>")
		b.WriteString(rendered)
		b.WriteString("</div>")
		used += overhead + utf8.RuneCountInString(rendered)
		included++
	}
	if dropped := len(rendering) - included; dropped > 0 {
		fmt.Fprintf(&b, "<hr><div><i>…and %d more alerts. Open in SigNoz for the full list.</i></div>", dropped)
	}
	return b.String(), nil
}

// shrinkMarkdownToFit cuts markdown until its rendered HTML fits within budget
// runes, returning "" when the budget is too small to carry anything useful.
// Only the markdown is ever cut, never the rendered HTML, so goldmark always
// emits balanced markup.
func shrinkMarkdownToFit(md string, budget int) (string, error) {
	if budget < minShrinkBudgetRunes {
		return "", nil
	}
	for range 4 {
		rendered, err := markdownrenderer.RenderHTML(md)
		if err != nil {
			return "", err
		}
		renderedLen := utf8.RuneCountInString(rendered)
		if renderedLen <= budget {
			return rendered, nil
		}
		runes := []rune(md)
		keep := len(runes) * budget / renderedLen * 9 / 10
		if keep >= len(runes) {
			keep = len(runes) - 1
		}
		if keep < minShrinkBudgetRunes {
			return "", nil
		}
		md = string(runes[:keep]) + "…"
	}
	return "", nil
}

// prepareNote renders the same body template as plain text for a timeline note.
// JSM Ops notes render neither HTML nor markdown, so links flatten to
// "text (url)" and all markers are stripped.
func (n *Notifier) prepareNote(ctx context.Context, alerts []*types.Alert) (string, error) {
	customTitle, customBody := alertmanagertemplate.ExtractTemplatesFromAnnotations(alerts)
	result, err := n.templater.Expand(ctx, alertmanagertypes.ExpandRequest{
		TitleTemplate:        customTitle,
		BodyTemplate:         customBody,
		DefaultTitleTemplate: n.conf.Message,
		DefaultBodyTemplate:  n.conf.Description,
	}, alerts)
	if err != nil {
		return "", err
	}

	var b strings.Builder
	first := true
	for _, part := range result.Body {
		text, renderErr := markdownrenderer.RenderPlainText(part)
		if renderErr != nil {
			return "", renderErr
		}
		if text = strings.TrimSpace(text); text == "" {
			continue
		}
		if !first {
			b.WriteString("\n\n")
		}
		b.WriteString(text)
		first = false
	}

	note, truncated := notify.TruncateInRunes(b.String(), maxNoteLenRunes)
	if truncated {
		n.logger.WarnContext(ctx, "Truncated note", slog.Int("max_runes", maxNoteLenRunes))
	}
	return note, nil
}

// Create requests for a list of alerts.
func (n *Notifier) createRequests(ctx context.Context, as ...*types.Alert) ([]*http.Request, bool, error) {
	key, err := notify.ExtractGroupKey(ctx)
	if err != nil {
		return nil, false, err
	}
	logger := n.logger.With(slog.Any("group_key", key))
	logger.DebugContext(ctx, "extracted group key")

	data := notify.GetTemplateData(ctx, n.tmpl, as, logger)

	tmpl := notify.TmplText(n.tmpl, data, &err)

	details := make(map[string]string)

	maps.Copy(details, data.CommonLabels)

	for k, v := range n.conf.Details {
		details[k] = tmpl(v)
	}

	requests := []*http.Request{}

	var (
		alias  = key.Hash()
		alerts = types.Alerts(as...)
	)
	switch alerts.Status() {
	case model.AlertResolved:
		// Post the resolved snapshot to the timeline before closing (closed alerts
		// reject notes), so the note lands first.
		if n.advancedFeatures {
			note, err := n.prepareNote(ctx, as)
			if err != nil {
				n.logger.ErrorContext(ctx, "failed to prepare notification content", errors.Attr(err))
				return nil, false, err
			}
			noteReq, err := n.noteRequest(ctx, alias, note, tmpl(n.conf.Source))
			if err != nil {
				return nil, true, err
			}
			requests = append(requests, noteReq)
		}

		resolvedEndpointURL := n.conf.APIURL.Copy()
		resolvedEndpointURL.Path += fmt.Sprintf("v2/alerts/%s/close", alias)
		q := resolvedEndpointURL.Query()
		q.Set("identifierType", "alias")
		resolvedEndpointURL.RawQuery = q.Encode()
		msg := &opsGenieCloseMessage{Source: tmpl(n.conf.Source)}
		var buf bytes.Buffer
		if err := json.NewEncoder(&buf).Encode(msg); err != nil {
			return nil, false, err
		}
		req, err := http.NewRequest("POST", resolvedEndpointURL.String(), &buf)
		if err != nil {
			return nil, true, err
		}
		requests = append(requests, req.WithContext(ctx))
	default:
		message, description, err := n.prepareContent(ctx, as)
		if err != nil {
			n.logger.ErrorContext(ctx, "failed to prepare notification content", errors.Attr(err))
			return nil, false, err
		}

		createEndpointURL := n.conf.APIURL.Copy()
		createEndpointURL.Path += "v2/alerts"

		var responders []opsGenieCreateMessageResponder
		for _, r := range n.conf.Responders {
			responder := opsGenieCreateMessageResponder{
				ID:       tmpl(r.ID),
				Name:     tmpl(r.Name),
				Username: tmpl(r.Username),
				Type:     tmpl(r.Type),
			}

			if responder == (opsGenieCreateMessageResponder{}) {
				// Filter out empty responders. This is useful if you want to fill
				// responders dynamically from alert's common labels.
				continue
			}

			if responder.Type == "teams" {
				teams := safeSplit(responder.Name, ",")
				for _, team := range teams {
					newResponder := opsGenieCreateMessageResponder{
						Name: tmpl(team),
						Type: tmpl("team"),
					}
					responders = append(responders, newResponder)
				}
				continue
			}

			responders = append(responders, responder)
		}

		msg := &opsGenieCreateMessage{
			Alias:       alias,
			Message:     message,
			Description: description,
			Details:     details,
			Source:      tmpl(n.conf.Source),
			Responders:  responders,
			Tags:        safeSplit(tmpl(n.conf.Tags), ","),
			Note:        tmpl(n.conf.Note),
			Priority:    tmpl(n.conf.Priority),
			Entity:      tmpl(n.conf.Entity),
			Actions:     safeSplit(tmpl(n.conf.Actions), ","),
		}
		var buf bytes.Buffer
		if err := json.NewEncoder(&buf).Encode(msg); err != nil {
			return nil, false, err
		}
		req, err := http.NewRequest("POST", createEndpointURL.String(), &buf)
		if err != nil {
			return nil, true, err
		}
		requests = append(requests, req.WithContext(ctx))

		if n.conf.UpdateAlerts {
			updateMessageEndpointURL := n.conf.APIURL.Copy()
			updateMessageEndpointURL.Path += fmt.Sprintf("v2/alerts/%s/message", alias)
			q := updateMessageEndpointURL.Query()
			q.Set("identifierType", "alias")
			updateMessageEndpointURL.RawQuery = q.Encode()
			updateMsgMsg := &opsGenieUpdateMessageMessage{
				Message: msg.Message,
			}
			var updateMessageBuf bytes.Buffer
			if err := json.NewEncoder(&updateMessageBuf).Encode(updateMsgMsg); err != nil {
				return nil, false, err
			}
			req, err := http.NewRequest("PUT", updateMessageEndpointURL.String(), &updateMessageBuf)
			if err != nil {
				return nil, true, err
			}
			requests = append(requests, req)

			updateDescriptionEndpointURL := n.conf.APIURL.Copy()
			updateDescriptionEndpointURL.Path += fmt.Sprintf("v2/alerts/%s/description", alias)
			q = updateDescriptionEndpointURL.Query()
			q.Set("identifierType", "alias")
			updateDescriptionEndpointURL.RawQuery = q.Encode()
			updateDescMsg := &opsGenieUpdateDescriptionMessage{
				Description: msg.Description,
			}

			var updateDescriptionBuf bytes.Buffer
			if err := json.NewEncoder(&updateDescriptionBuf).Encode(updateDescMsg); err != nil {
				return nil, false, err
			}
			req, err = http.NewRequest("PUT", updateDescriptionEndpointURL.String(), &updateDescriptionBuf)
			if err != nil {
				return nil, true, err
			}
			requests = append(requests, req.WithContext(ctx))
		}

		// Append this fire's snapshot to the timeline (every fire, including the
		// first, so no datapoint is lost when the description is overwritten).
		// Notes are plain text, so this uses the plain-text render, not the HTML body.
		if n.advancedFeatures {
			note, err := n.prepareNote(ctx, as)
			if err != nil {
				return nil, false, err
			}
			noteReq, err := n.noteRequest(ctx, alias, note, tmpl(n.conf.Source))
			if err != nil {
				return nil, true, err
			}
			requests = append(requests, noteReq)
		}
	}

	var apiKey string
	if n.conf.APIKey != "" {
		apiKey = tmpl(string(n.conf.APIKey))
	} else {
		content, err := os.ReadFile(n.conf.APIKeyFile)
		if err != nil {
			return nil, false, errors.WrapInternalf(err, errors.CodeInternal, "read key_file error")
		}
		apiKey = tmpl(string(content))
		apiKey = strings.TrimSpace(string(apiKey))
	}

	if err != nil {
		return nil, false, errors.WrapInternalf(err, errors.CodeInternal, "templating error")
	}

	for _, req := range requests {
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", fmt.Sprintf("GenieKey %s", apiKey))
	}

	return requests, true, nil
}

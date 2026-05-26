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

// https://docs.opsgenie.com/docs/alert-api - 130 characters meaning runes.
const maxMessageLenRunes = 130

// Notifier implements a Notifier for OpsGenie notifications.
type Notifier struct {
	conf      *config.OpsGenieConfig
	tmpl      *template.Template
	logger    *slog.Logger
	client    *http.Client
	retrier   *notify.Retrier
	templater alertmanagertypes.Templater
}

// New returns a new OpsGenie notifier.
func New(c *config.OpsGenieConfig, t *template.Template, l *slog.Logger, templater alertmanagertypes.Templater, httpOpts ...commoncfg.HTTPClientOption) (*Notifier, error) {
	client, err := notify.NewClientWithTracing(*c.HTTPConfig, Integration, httpOpts...)
	if err != nil {
		return nil, err
	}
	return &Notifier{
		conf:      c,
		tmpl:      t,
		logger:    l,
		client:    client,
		retrier:   &notify.Retrier{RetryCodes: []int{http.StatusTooManyRequests}},
		templater: templater,
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
			return shouldRetry, notify.NewErrorWithReason(notify.GetFailureReasonFromStatusCode(resp.StatusCode), err)
		}
	}
	return true, nil
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
	if result.IsDefaultBody {
		description = strings.Join(result.Body, "\n")
	} else {
		var b strings.Builder
		first := true
		for _, part := range result.Body {
			if part == "" {
				continue
			}
			rendered, renderErr := markdownrenderer.RenderHTML(part)
			if renderErr != nil {
				return "", "", renderErr
			}
			if !first {
				b.WriteString("<hr>")
			}
			b.WriteString("<div>")
			b.WriteString(rendered)
			b.WriteString("</div>")
			first = false
		}
		description = b.String()
	}

	title, truncated := notify.TruncateInRunes(result.Title, maxMessageLenRunes)
	if truncated {
		n.logger.WarnContext(ctx, "Truncated message", slog.Int("max_runes", maxMessageLenRunes))
	}

	return title, description, nil
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

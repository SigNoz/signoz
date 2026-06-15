// Copyright (c) 2026 SigNoz, Inc.
// Copyright 2019 Prometheus Team
// SPDX-License-Identifier: Apache-2.0

package pagerduty

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"strings"

	"github.com/SigNoz/signoz/pkg/alertmanager/alertmanagertemplate"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/alecthomas/units"
	commoncfg "github.com/prometheus/common/config"
	"github.com/prometheus/common/model"

	"github.com/prometheus/alertmanager/config"
	"github.com/prometheus/alertmanager/notify"
	"github.com/prometheus/alertmanager/template"
	"github.com/prometheus/alertmanager/types"
)

const (
	Integration = "pagerduty"
)

const (
	maxEventSize int = 512000
	// https://developer.pagerduty.com/docs/ZG9jOjExMDI5NTc4-send-a-v1-event - 1024 characters or runes.
	maxV1DescriptionLenRunes = 1024
	// https://developer.pagerduty.com/docs/ZG9jOjExMDI5NTgx-send-an-alert-event - 1024 characters or runes.
	maxV2SummaryLenRunes = 1024
)

// Notifier implements a Notifier for PagerDuty notifications.
type Notifier struct {
	conf      *config.PagerdutyConfig
	tmpl      *template.Template
	logger    *slog.Logger
	apiV1     string // for tests.
	client    *http.Client
	retrier   *notify.Retrier
	templater alertmanagertypes.Templater
}

// New returns a new PagerDuty notifier.
func New(c *config.PagerdutyConfig, t *template.Template, l *slog.Logger, templater alertmanagertypes.Templater, httpOpts ...commoncfg.HTTPClientOption) (*Notifier, error) {
	client, err := notify.NewClientWithTracing(*c.HTTPConfig, Integration, httpOpts...)
	if err != nil {
		return nil, err
	}
	n := &Notifier{conf: c, tmpl: t, logger: l, client: client, templater: templater}
	if c.ServiceKey != "" || c.ServiceKeyFile != "" {
		n.apiV1 = "https://events.pagerduty.com/generic/2010-04-15/create_event.json"
		// Retrying can solve the issue on 403 (rate limiting) and 5xx response codes.
		// https://developer.pagerduty.com/docs/events-api-v1-overview#api-response-codes--retry-logic
		n.retrier = &notify.Retrier{RetryCodes: []int{http.StatusForbidden}, CustomDetailsFunc: errDetails}
	} else {
		// Retrying can solve the issue on 429 (rate limiting) and 5xx response codes.
		// https://developer.pagerduty.com/docs/events-api-v2-overview#response-codes--retry-logic
		n.retrier = &notify.Retrier{RetryCodes: []int{http.StatusTooManyRequests}, CustomDetailsFunc: errDetails}
	}
	return n, nil
}

const (
	pagerDutyEventTrigger = "trigger"
	pagerDutyEventResolve = "resolve"
)

type pagerDutyMessage struct {
	RoutingKey  string            `json:"routing_key,omitempty"`
	ServiceKey  string            `json:"service_key,omitempty"`
	DedupKey    string            `json:"dedup_key,omitempty"`
	IncidentKey string            `json:"incident_key,omitempty"`
	EventType   string            `json:"event_type,omitempty"`
	Description string            `json:"description,omitempty"`
	EventAction string            `json:"event_action"`
	Payload     *pagerDutyPayload `json:"payload"`
	Client      string            `json:"client,omitempty"`
	ClientURL   string            `json:"client_url,omitempty"`
	Details     map[string]any    `json:"details,omitempty"`
	Images      []pagerDutyImage  `json:"images,omitempty"`
	Links       []pagerDutyLink   `json:"links,omitempty"`
}

type pagerDutyLink struct {
	HRef string `json:"href"`
	Text string `json:"text"`
}

type pagerDutyImage struct {
	Src  string `json:"src"`
	Alt  string `json:"alt"`
	Href string `json:"href"`
}

type pagerDutyPayload struct {
	Summary       string         `json:"summary"`
	Source        string         `json:"source"`
	Severity      string         `json:"severity"`
	Timestamp     string         `json:"timestamp,omitempty"`
	Class         string         `json:"class,omitempty"`
	Component     string         `json:"component,omitempty"`
	Group         string         `json:"group,omitempty"`
	CustomDetails map[string]any `json:"custom_details,omitempty"`
}

func (n *Notifier) encodeMessage(ctx context.Context, msg *pagerDutyMessage) (bytes.Buffer, error) {
	var buf bytes.Buffer
	if err := json.NewEncoder(&buf).Encode(msg); err != nil {
		return buf, errors.WrapInternalf(err, errors.CodeInternal, "failed to encode PagerDuty message")
	}

	if buf.Len() > maxEventSize {
		truncatedMsg := fmt.Sprintf("Custom details have been removed because the original event exceeds the maximum size of %s", units.MetricBytes(maxEventSize).String())

		if n.apiV1 != "" {
			msg.Details = map[string]any{"error": truncatedMsg}
		} else {
			msg.Payload.CustomDetails = map[string]any{"error": truncatedMsg}
		}

		n.logger.WarnContext(ctx, "Truncated Details because message of size exceeds limit", slog.String("message_size", units.MetricBytes(buf.Len()).String()), slog.String("max_size", units.MetricBytes(maxEventSize).String()))

		buf.Reset()
		if err := json.NewEncoder(&buf).Encode(msg); err != nil {
			return buf, errors.WrapInternalf(err, errors.CodeInternal, "failed to encode PagerDuty message")
		}
	}

	return buf, nil
}

func (n *Notifier) notifyV1(
	ctx context.Context,
	eventType string,
	key notify.Key,
	data *template.Data,
	details map[string]any,
	title string,
) (bool, error) {
	var tmplErr error
	tmpl := notify.TmplText(n.tmpl, data, &tmplErr)

	description, truncated := notify.TruncateInRunes(title, maxV1DescriptionLenRunes)
	if truncated {
		n.logger.WarnContext(ctx, "Truncated description", slog.Any("key", key), slog.Int("max_runes", maxV1DescriptionLenRunes))
	}

	serviceKey := string(n.conf.ServiceKey)
	if serviceKey == "" {
		content, fileErr := os.ReadFile(n.conf.ServiceKeyFile)
		if fileErr != nil {
			return false, errors.WrapInternalf(fileErr, errors.CodeInternal, "failed to read service key from file")
		}
		serviceKey = strings.TrimSpace(string(content))
	}

	msg := &pagerDutyMessage{
		ServiceKey:  tmpl(serviceKey),
		EventType:   eventType,
		IncidentKey: key.Hash(),
		Description: description,
		Details:     details,
	}

	if eventType == pagerDutyEventTrigger {
		msg.Client = tmpl(n.conf.Client)
		msg.ClientURL = tmpl(n.conf.ClientURL)
	}

	if tmplErr != nil {
		return false, errors.WrapInternalf(tmplErr, errors.CodeInternal, "failed to template PagerDuty v1 message")
	}

	// Ensure that the service key isn't empty after templating.
	if msg.ServiceKey == "" {
		return false, errors.NewInternalf(errors.CodeInternal, "service key cannot be empty")
	}

	encodedMsg, err := n.encodeMessage(ctx, msg)
	if err != nil {
		return false, err
	}

	resp, err := notify.PostJSON(ctx, n.client, n.apiV1, &encodedMsg) //nolint:bodyclose
	if err != nil {
		return true, errors.WrapInternalf(err, errors.CodeInternal, "failed to post message to PagerDuty v1")
	}
	defer notify.Drain(resp)

	return n.retrier.Check(resp.StatusCode, resp.Body)
}

func (n *Notifier) notifyV2(
	ctx context.Context,
	eventType string,
	key notify.Key,
	data *template.Data,
	details map[string]any,
	title string,
) (bool, error) {
	var tmplErr error
	tmpl := notify.TmplText(n.tmpl, data, &tmplErr)

	if n.conf.Severity == "" {
		n.conf.Severity = "error"
	}

	summary, truncated := notify.TruncateInRunes(title, maxV2SummaryLenRunes)
	if truncated {
		n.logger.WarnContext(ctx, "Truncated summary", slog.Any("key", key), slog.Int("max_runes", maxV2SummaryLenRunes))
	}

	routingKey := string(n.conf.RoutingKey)
	if routingKey == "" {
		content, fileErr := os.ReadFile(n.conf.RoutingKeyFile)
		if fileErr != nil {
			return false, errors.WrapInternalf(fileErr, errors.CodeInternal, "failed to read routing key from file")
		}
		routingKey = strings.TrimSpace(string(content))
	}

	msg := &pagerDutyMessage{
		Client:      tmpl(n.conf.Client),
		ClientURL:   tmpl(n.conf.ClientURL),
		RoutingKey:  tmpl(routingKey),
		EventAction: eventType,
		DedupKey:    key.Hash(),
		Images:      make([]pagerDutyImage, 0, len(n.conf.Images)),
		Links:       make([]pagerDutyLink, 0, len(n.conf.Links)),
		Payload: &pagerDutyPayload{
			Summary:       summary,
			Source:        tmpl(n.conf.Source),
			Severity:      tmpl(n.conf.Severity),
			CustomDetails: details,
			Class:         tmpl(n.conf.Class),
			Component:     tmpl(n.conf.Component),
			Group:         tmpl(n.conf.Group),
		},
	}

	for _, item := range n.conf.Images {
		image := pagerDutyImage{
			Src:  tmpl(item.Src),
			Alt:  tmpl(item.Alt),
			Href: tmpl(item.Href),
		}

		if image.Src != "" {
			msg.Images = append(msg.Images, image)
		}
	}

	for _, item := range n.conf.Links {
		link := pagerDutyLink{
			HRef: tmpl(item.Href),
			Text: tmpl(item.Text),
		}

		if link.HRef != "" {
			msg.Links = append(msg.Links, link)
		}
	}

	if tmplErr != nil {
		return false, errors.WrapInternalf(tmplErr, errors.CodeInternal, "failed to template PagerDuty v2 message")
	}

	// Ensure that the routing key isn't empty after templating.
	if msg.RoutingKey == "" {
		return false, errors.NewInternalf(errors.CodeInternal, "routing key cannot be empty")
	}

	encodedMsg, err := n.encodeMessage(ctx, msg)
	if err != nil {
		return false, err
	}

	resp, err := notify.PostJSON(ctx, n.client, n.conf.URL.String(), &encodedMsg) //nolint:bodyclose
	if err != nil {
		return true, errors.WrapInternalf(err, errors.CodeInternal, "failed to post message to PagerDuty")
	}
	defer notify.Drain(resp)

	retry, err := n.retrier.Check(resp.StatusCode, resp.Body)
	if err != nil {
		return retry, notify.NewErrorWithReason(notify.GetFailureReasonFromStatusCode(resp.StatusCode), err)
	}
	return retry, err
}

// prepareTitle expands the notification title. PagerDuty has no body surface
// we care about — the description/summary field is what users see as the
// incident headline, so we feed the configured Description as the default
// title template and ignore any custom body_template entirely.
func (n *Notifier) prepareTitle(ctx context.Context, alerts []*types.Alert) (string, error) {
	customTitle, _ := alertmanagertemplate.ExtractTemplatesFromAnnotations(alerts)
	result, err := n.templater.Expand(ctx, alertmanagertypes.ExpandRequest{
		TitleTemplate:        customTitle,
		DefaultTitleTemplate: n.conf.Description,
	}, alerts)
	if err != nil {
		return "", err
	}
	return result.Title, nil
}

// Notify implements the Notifier interface.
func (n *Notifier) Notify(ctx context.Context, as ...*types.Alert) (bool, error) {
	key, err := notify.ExtractGroupKey(ctx)
	if err != nil {
		return false, err
	}
	logger := n.logger.With(slog.Any("group_key", key))

	title, err := n.prepareTitle(ctx, as)
	if err != nil {
		n.logger.ErrorContext(ctx, "failed to prepare notification content", errors.Attr(err))
		return false, err
	}

	var (
		alerts    = types.Alerts(as...)
		data      = notify.GetTemplateData(ctx, n.tmpl, as, logger)
		eventType = pagerDutyEventTrigger
	)

	if alerts.Status() == model.AlertResolved {
		eventType = pagerDutyEventResolve
	}

	logger.DebugContext(ctx, "extracted group key", slog.String("event_type", eventType))

	details, err := n.renderDetails(data)
	if err != nil {
		return false, errors.WrapInternalf(err, errors.CodeInternal, "failed to render details: %v", err)
	}

	if n.conf.Timeout > 0 {
		nfCtx, cancel := context.WithTimeoutCause(ctx, n.conf.Timeout, errors.NewInternalf(errors.CodeTimeout, "configured pagerduty timeout reached (%s)", n.conf.Timeout))
		defer cancel()
		ctx = nfCtx
	}

	nf := n.notifyV2
	if n.apiV1 != "" {
		nf = n.notifyV1
	}
	retry, err := nf(ctx, eventType, key, data, details, title)
	if err != nil {
		if ctx.Err() != nil {
			err = errors.WrapInternalf(err, errors.CodeInternal, "failed to notify PagerDuty: %v", context.Cause(ctx))
		}
		return retry, err
	}
	return retry, nil
}

func errDetails(status int, body io.Reader) string {
	// See https://v2.developer.pagerduty.com/docs/trigger-events for the v1 events API.
	// See https://v2.developer.pagerduty.com/docs/send-an-event-events-api-v2 for the v2 events API.
	if status != http.StatusBadRequest || body == nil {
		return ""
	}
	var pgr struct {
		Status  string   `json:"status"`
		Message string   `json:"message"`
		Errors  []string `json:"errors"`
	}
	if err := json.NewDecoder(body).Decode(&pgr); err != nil {
		return ""
	}
	return fmt.Sprintf("%s: %s", pgr.Message, strings.Join(pgr.Errors, ","))
}

func (n *Notifier) renderDetails(
	data *template.Data,
) (map[string]any, error) {
	var (
		tmplTextErr  error
		tmplText     = notify.TmplText(n.tmpl, data, &tmplTextErr)
		tmplTextFunc = func(tmpl string) (string, error) {
			return tmplText(tmpl), tmplTextErr
		}
	)
	var err error
	rendered := make(map[string]any, len(n.conf.Details))
	for k, v := range n.conf.Details {
		rendered[k], err = template.DeepCopyWithTemplate(v, tmplTextFunc)
		if err != nil {
			return nil, err
		}
	}
	return rendered, nil
}

// Copyright (c) 2026 SigNoz, Inc.
// Copyright 2019 Prometheus Team
// SPDX-License-Identifier: Apache-2.0

package webhook

import (
	"bytes"
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"os"
	"strings"
	texttemplate "text/template"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	commoncfg "github.com/prometheus/common/config"

	"github.com/prometheus/alertmanager/config"
	"github.com/prometheus/alertmanager/notify"
	"github.com/prometheus/alertmanager/template"
	"github.com/prometheus/alertmanager/types"
)

const (
	Integration = "webhook"
)

// Notifier implements a Notifier for generic webhooks.
type Notifier struct {
	conf      *config.WebhookConfig
	tmpl      *template.Template
	logger    *slog.Logger
	client    *http.Client
	retrier   *notify.Retrier
	templater alertmanagertypes.Templater
	// bodyTemplate, when set, replaces the default Alertmanager-style JSON
	// payload: it is rendered against the alert template data to produce
	// the request body. This lets webhook consumers that require a
	// specific schema (e.g. Rocket.Chat incoming webhooks, which render
	// the "text" field) receive a usable payload.
	bodyTemplate *texttemplate.Template
}

// New returns a new Webhook.
func New(conf *config.WebhookConfig, t *template.Template, l *slog.Logger, templater alertmanagertypes.Templater, httpOpts ...commoncfg.HTTPClientOption) (*Notifier, error) {
	client, err := notify.NewClientWithTracing(*conf.HTTPConfig, Integration, httpOpts...)
	if err != nil {
		return nil, err
	}
	return &Notifier{
		conf:   conf,
		tmpl:   t,
		logger: l,
		client: client,
		// Webhooks are assumed to respond with 2xx response codes on a successful
		// request and 5xx response codes are assumed to be recoverable.
		retrier:   &notify.Retrier{},
		templater: templater,
	}, nil
}

// SetBodyTemplate installs an optional Go text/template used to render the
// request body from the alert template data (*template.Data). An empty
// string clears it, restoring the default Alertmanager-style JSON payload.
// The template is validated eagerly so a bad template fails at setup time,
// not when the first alert fires.
func (n *Notifier) SetBodyTemplate(bodyTemplate string) error {
	if bodyTemplate == "" {
		n.bodyTemplate = nil
		return nil
	}
	tmpl, err := texttemplate.New("webhook_body").Parse(bodyTemplate)
	if err != nil {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid webhook body template: %v", err)
	}
	n.bodyTemplate = tmpl
	return nil
}

// Message defines the JSON object send to webhook endpoints.
type Message struct {
	*template.Data

	// The protocol version.
	Version         string `json:"version"`
	GroupKey        string `json:"groupKey"`
	TruncatedAlerts uint64 `json:"truncatedAlerts"`
}

func truncateAlerts(maxAlerts uint64, alerts []*types.Alert) ([]*types.Alert, uint64) {
	if maxAlerts != 0 && uint64(len(alerts)) > maxAlerts {
		return alerts[:maxAlerts], uint64(len(alerts)) - maxAlerts
	}

	return alerts, 0
}

// Notify implements the Notifier interface.
func (n *Notifier) Notify(ctx context.Context, alerts ...*types.Alert) (bool, error) {
	alerts, numTruncated := truncateAlerts(n.conf.MaxAlerts, alerts)
	data := notify.GetTemplateData(ctx, n.tmpl, alerts, n.logger)

	groupKey, err := notify.ExtractGroupKey(ctx)
	if err != nil {
		return false, err
	}

	logger := n.logger.With(slog.Any("group_key", groupKey))
	logger.DebugContext(ctx, "extracted group key")

	msg := &Message{
		Version:         "4",
		Data:            data,
		GroupKey:        groupKey.String(),
		TruncatedAlerts: numTruncated,
	}

	var buf bytes.Buffer
	if n.bodyTemplate != nil {
		// A custom body template replaces the default payload entirely;
		// the template author controls the output format.
		if err := n.bodyTemplate.Execute(&buf, data); err != nil {
			return false, errors.NewInternalf(errors.CodeInternal, "failed to execute webhook body template: %v", err)
		}
	} else if err := json.NewEncoder(&buf).Encode(msg); err != nil {
		return false, err
	}

	var url string
	var tmplErr error
	tmpl := notify.TmplText(n.tmpl, data, &tmplErr)

	if n.conf.URL != "" {
		url = tmpl(string(n.conf.URL))
	} else {
		content, err := os.ReadFile(n.conf.URLFile)
		if err != nil {
			return false, errors.WrapInternalf(err, errors.CodeInternal, "read url_file")
		}
		url = tmpl(strings.TrimSpace(string(content)))
	}

	if tmplErr != nil {
		return false, errors.NewInternalf(errors.CodeInternal, "failed to template webhook URL: %v", tmplErr)
	}

	if url == "" {
		return false, errors.NewInternalf(errors.CodeInternal, "webhook URL is empty after templating")
	}

	if n.conf.Timeout > 0 {
		postCtx, cancel := context.WithTimeoutCause(ctx, n.conf.Timeout, errors.NewInternalf(errors.CodeTimeout, "configured webhook timeout reached (%s)", n.conf.Timeout))
		defer cancel()
		ctx = postCtx
	}

	resp, err := notify.PostJSON(ctx, n.client, url, &buf) //nolint:bodyclose
	if err != nil {
		if ctx.Err() != nil {
			err = errors.NewInternalf(errors.CodeInternal, "failed to post JSON to webhook: %v", context.Cause(ctx))
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

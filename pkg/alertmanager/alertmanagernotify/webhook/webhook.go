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
	Integration    = "webhook"
	templatedTitle = "templated_title"
	templatedBody  = "templated_body"
)

// Notifier implements a Notifier for generic webhooks.
type Notifier struct {
	conf      *config.WebhookConfig
	tmpl      *template.Template
	logger    *slog.Logger
	client    *http.Client
	retrier   *notify.Retrier
	templater alertmanagertypes.Templater
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

// templateTitleBody extracts custom templates from alert annotations, expands them and
// replaces the private annotations with the rendered title and body.
func (n *Notifier) templateTitleBody(ctx context.Context, alerts []*types.Alert) error {
	customTitle, customBody := alertmanagertemplate.ExtractTemplatesFromAnnotations(alerts)
	result, err := n.templater.Expand(ctx, alertmanagertypes.ExpandRequest{
		TitleTemplate: customTitle,
		BodyTemplate:  customBody,
	}, alerts)
	if err != nil {
		return err
	}

	for i, alert := range alerts {
		if alert.Annotations == nil {
			continue
		}
		// Update templated_title annotation with rendered title, only if key exists and result is non-blank
		if _, ok := alert.Annotations[ruletypes.AnnotationTitleTemplate]; ok {
			delete(alert.Annotations, ruletypes.AnnotationTitleTemplate)
			if result.Title != "" {
				alert.Annotations[templatedTitle] = model.LabelValue(result.Title)
			}
		}
		// Update templated_body annotation with rendered body, only if key exists and result is non-blank
		if _, ok := alert.Annotations[ruletypes.AnnotationBodyTemplate]; ok {
			delete(alert.Annotations, ruletypes.AnnotationBodyTemplate)
			if i < len(result.Body) && result.Body[i] != "" {
				alert.Annotations[templatedBody] = model.LabelValue(result.Body[i])
			}
		}
	}

	return nil
}

// Notify implements the Notifier interface.
func (n *Notifier) Notify(ctx context.Context, alerts ...*types.Alert) (bool, error) {
	alerts, numTruncated := truncateAlerts(n.conf.MaxAlerts, alerts)
	// expand custom templating annotations
	if err := n.templateTitleBody(ctx, alerts); err != nil {
		n.logger.ErrorContext(ctx, "failed to prepare notification content", errors.Attr(err))
	}
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
	if err := json.NewEncoder(&buf).Encode(msg); err != nil {
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

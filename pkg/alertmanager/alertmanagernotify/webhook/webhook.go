package webhook

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"strings"

	commoncfg "github.com/prometheus/common/config"

	"github.com/prometheus/alertmanager/config"
	"github.com/prometheus/alertmanager/notify"
	"github.com/prometheus/alertmanager/template"
	"github.com/prometheus/alertmanager/types"
)

// Notifier implements a Notifier for generic webhooks.
type Notifier struct {
	conf    *config.WebhookConfig
	tmpl    *template.Template
	logger  *slog.Logger
	client  *http.Client
	retrier *notify.Retrier
}

// New returns a new Webhook.
func New(conf *config.WebhookConfig, t *template.Template, l *slog.Logger, httpOpts ...commoncfg.HTTPClientOption) (*Notifier, error) {
	client, err := notify.NewClientWithTracing(*conf.HTTPConfig, "webhook", httpOpts...)
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
		retrier: &notify.Retrier{},
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

// Notify implements the Notifier interface.
func (n *Notifier) Notify(ctx context.Context, alerts ...*types.Alert) (bool, error) {
	alerts, numTruncated := truncateAlerts(n.conf.MaxAlerts, alerts)
	data := notify.GetTemplateData(ctx, n.tmpl, alerts, n.logger)

	groupKey, err := notify.ExtractGroupKey(ctx)
	if err != nil {
		return false, err
	}

	logger := n.logger.With("group_key", groupKey)
	logger.Debug("extracted group key")

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
			return false, fmt.Errorf("read url_file: %w", err)
		}
		url = tmpl(strings.TrimSpace(string(content)))
	}

	if tmplErr != nil {
		return false, fmt.Errorf("failed to template webhook URL: %w", tmplErr)
	}

	if url == "" {
		return false, errors.New("webhook URL is empty after templating")
	}

	if n.conf.Timeout > 0 {
		postCtx, cancel := context.WithTimeoutCause(ctx, n.conf.Timeout, fmt.Errorf("configured webhook timeout reached (%s)", n.conf.Timeout))
		defer cancel()
		ctx = postCtx
	}

	resp, err := notify.PostJSON(ctx, n.client, url, &buf)
	if err != nil {
		if ctx.Err() != nil {
			err = fmt.Errorf("%w: %w", err, context.Cause(ctx))
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

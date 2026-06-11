// Copyright (c) 2026 SigNoz, Inc.
// SPDX-License-Identifier: Apache-2.0

package jsmops

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	commoncfg "github.com/prometheus/common/config"

	"github.com/prometheus/alertmanager/notify"
	"github.com/prometheus/alertmanager/template"
	"github.com/prometheus/alertmanager/types"
	"github.com/prometheus/common/model"
)

const (
	Integration    = "jsmops"
	defaultBaseURL = "https://api.atlassian.com/jsm/ops/api"
	sourceName     = "SigNoz Alert Manager"
)

// Notifier implements a Notifier for JSM Ops notifications.
type Notifier struct {
	config  *alertmanagertypes.JsmOpsReceiverConfig
	tmpl    *template.Template
	logger  *slog.Logger
	client  *http.Client
	retrier *notify.Retrier
	baseURL string
}

// New returns a new JSM Ops notifier.
func New(cfg *alertmanagertypes.JsmOpsReceiverConfig, t *template.Template, l *slog.Logger, templater alertmanagertypes.Templater, httpOpts ...commoncfg.HTTPClientOption) (*Notifier, error) {
	if cfg == nil {
		return nil, errors.NewInternalf(errors.CodeInternal, "jsm ops config is required")
	}
	if cfg.Email == "" {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "jsm ops email is required")
	}
	if cfg.APIToken == "" {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "jsm ops api_token is required")
	}
	if cfg.CloudID == "" {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "jsm ops cloud_id is required")
	}
	if strings.TrimSpace(cfg.Message) == "" {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "jsm ops message is required")
	}

	client, err := notify.NewClientWithTracing(commoncfg.DefaultHTTPClientConfig, Integration, httpOpts...)
	if err != nil {
		return nil, err
	}

	return &Notifier{
		config:  cfg,
		tmpl:    t,
		logger:  l,
		client:  client,
		retrier: &notify.Retrier{},
	}, nil
}

type responder struct {
	ID   string `json:"id"`
	Type string `json:"type"`
}

type createAlertRequest struct {
	Message     string      `json:"message"`
	Responders  []responder `json:"responders,omitempty"`
	Description string      `json:"description,omitempty"`
	Tags        []string    `json:"tags,omitempty"`
	Priority    string      `json:"priority,omitempty"`
	Alias       string      `json:"alias,omitempty"`
	Source      string      `json:"source,omitempty"`
}

type alertResponse struct {
	ID string `json:"id"`
}

// Notify implements the Notifier interface.
func (n *Notifier) Notify(ctx context.Context, alerts ...*types.Alert) (bool, error) {
	key, err := notify.ExtractGroupKey(ctx)
	if err != nil {
		return false, err
	}
	logger := n.logger.With(slog.Any("group_key", key))
	logger.DebugContext(ctx, "extracted group key")

	alertsGroup := types.Alerts(alerts...)
	data := notify.GetTemplateData(ctx, n.tmpl, alerts, logger)
	var tmplErr error
	tmplText := notify.TmplText(n.tmpl, data, &tmplErr)
	if tmplErr != nil {
		return false, errors.NewInternalf(errors.CodeInternal, "failed to render templates: %v", tmplErr)
	}

	message := strings.TrimSpace(tmplText(n.config.Message))
	description := strings.TrimSpace(tmplText(n.config.Description))
	alias := key.Hash()

	if alertsGroup.Status() == model.AlertResolved {
		if !n.config.SendResolved() {
			return false, nil
		}
		return n.closeAlert(ctx, alias)
	}

	request := createAlertRequest{
		Message:     message,
		Responders: n.buildResponders(),
		Description: description,
		Tags:        n.buildTags(tmplText),
		Priority:    strings.TrimSpace(tmplText(n.config.Priority)),
		Alias:       alias,
		Source:      sourceName,
	}

	return n.postAlert(ctx, request)
}

func (n *Notifier) buildResponders() []responder {
	if len(n.config.Responders) == 0 {
		return nil
	}

	responders := make([]responder, 0, len(n.config.Responders))
	for _, id := range n.config.Responders {
		id = strings.TrimSpace(id)
		if id == "" {
			continue
		}
		responders = append(responders, responder{ID: id, Type: "team"})
	}
	return responders
}

func (n *Notifier) buildTags(tmpl func(string) string) []string {
	if len(n.config.Tags) == 0 {
		return nil
	}
	tags := make([]string, 0, len(n.config.Tags))
	for _, tag := range n.config.Tags {
		rendered := strings.TrimSpace(tmpl(tag))
		if rendered == "" {
			continue
		}
		tags = append(tags, rendered)
	}
	return tags
}

func (n *Notifier) postAlert(ctx context.Context, req createAlertRequest) (bool, error) {
	var buf bytes.Buffer
	if err := json.NewEncoder(&buf).Encode(req); err != nil {
		return false, err
	}

	resp, err := n.doRequest(ctx, http.MethodPost, n.alertsURL(), &buf)
	if err != nil {
		return true, err
	}
	defer notify.Drain(resp)

	shouldRetry, err := n.retrier.Check(resp.StatusCode, resp.Body)
	if err != nil {
		return shouldRetry, notify.NewErrorWithReason(notify.GetFailureReasonFromStatusCode(resp.StatusCode), err)
	}

	return shouldRetry, err
}

func (n *Notifier) closeAlert(ctx context.Context, alias string) (bool, error) {
	alertID, shouldRetry, err := n.fetchAlertID(ctx, alias)
	if err != nil || shouldRetry {
		return shouldRetry, err
	}
	if alertID == "" {
		return false, nil
	}

	resp, err := n.doRequest(ctx, http.MethodPost, n.closeURL(alertID), nil)
	if err != nil {
		return true, err
	}
	defer notify.Drain(resp)

	shouldRetry, err = n.retrier.Check(resp.StatusCode, resp.Body)
	if err != nil {
		return shouldRetry, notify.NewErrorWithReason(notify.GetFailureReasonFromStatusCode(resp.StatusCode), err)
	}
	return shouldRetry, err
}

func (n *Notifier) fetchAlertID(ctx context.Context, alias string) (string, bool, error) {
	u, err := url.Parse(n.aliasURL())
	if err != nil {
		return "", false, errors.NewInternalf(errors.CodeInternal, "failed to parse jsmops alias url: %v", err)
	}
	q := u.Query()
	q.Set("alias", alias)
	u.RawQuery = q.Encode()

	resp, err := n.doRequest(ctx, http.MethodGet, u.String(), nil)
	if err != nil {
		return "", true, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", false, err
	}

	if resp.StatusCode == http.StatusNotFound {
		return "", false, nil
	}

	shouldRetry, checkErr := n.retrier.Check(resp.StatusCode, bytes.NewReader(body))
	if checkErr != nil {
		return "", shouldRetry, notify.NewErrorWithReason(notify.GetFailureReasonFromStatusCode(resp.StatusCode), checkErr)
	}
	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		return "", shouldRetry, errors.NewInternalf(errors.CodeInternal, "jsm ops alias lookup failed with status %d", resp.StatusCode)
	}

	var parsed alertResponse
	if err := json.Unmarshal(body, &parsed); err != nil {
		return "", false, err
	}
	if parsed.ID == "" {
		return "", false, errors.NewInternalf(errors.CodeInternal, "jsm ops alias lookup returned empty alert id")
	}

	return parsed.ID, false, nil
}

func (n *Notifier) doRequest(ctx context.Context, method, url string, body io.Reader) (*http.Response, error) {
	req, err := http.NewRequestWithContext(ctx, method, url, body)
	if err != nil {
		return nil, err
	}
	req.SetBasicAuth(n.config.Email, n.config.APIToken)
	req.Header.Set("Accept", "application/json")
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	return n.client.Do(req) //nolint:bodyclose
}

func (n *Notifier) alertsURL() string {
	return n.buildURL("alerts")
}

func (n *Notifier) aliasURL() string {
	return n.buildURL("alerts/alias")
}

func (n *Notifier) closeURL(alertID string) string {
	return n.buildURL(fmt.Sprintf("alerts/%s/close", alertID))
}

func (n *Notifier) buildURL(path string) string {
	base := n.baseURL
	if base == "" {
		base = defaultBaseURL
	}
	base = strings.TrimRight(base, "/")
	path = strings.TrimLeft(path, "/")
	return fmt.Sprintf("%s/%s/v1/%s", base, n.config.CloudID, path)
}

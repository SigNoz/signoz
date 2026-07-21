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
	defaultBaseURL = "https://api.atlassian.com/ex/jira"
	sourceName     = "SigNoz Alert Manager"

	maxMessageLenRunes     = 130
	maxDescriptionLenRunes = 15000
)

type ConnectionResolver interface {
	Resolve(ctx context.Context, orgID, connectionID string) (*alertmanagertypes.AtlassianConnection, error)
	Refresh(ctx context.Context, orgID, connectionID string) (*alertmanagertypes.AtlassianConnection, error)
}

type Notifier struct {
	config   *alertmanagertypes.JsmOpsReceiverConfig
	resolver ConnectionResolver
	tmpl     *template.Template
	logger   *slog.Logger
	client   *http.Client
	retrier  *notify.Retrier
	baseURL  string
}

func New(cfg *alertmanagertypes.JsmOpsReceiverConfig, t *template.Template, l *slog.Logger, templater alertmanagertypes.Templater, resolver ConnectionResolver, httpOpts ...commoncfg.HTTPClientOption) (*Notifier, error) {
	if cfg == nil {
		return nil, errors.NewInternalf(errors.CodeInternal, "jsm ops config is required")
	}
	if resolver == nil {
		return nil, errors.NewInternalf(errors.CodeInternal, "jsm ops connection resolver is required")
	}
	if cfg.ConnectionID == "" {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "jsm ops connection_id is required")
	}
	if cfg.OrgID == "" {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "jsm ops org_id is required")
	}
	if strings.TrimSpace(cfg.Message) == "" {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "jsm ops message is required")
	}

	client, err := notify.NewClientWithTracing(commoncfg.DefaultHTTPClientConfig, Integration, httpOpts...)
	if err != nil {
		return nil, err
	}

	return &Notifier{
		config:   cfg,
		resolver: resolver,
		tmpl:     t,
		logger:   l,
		client:   client,
		retrier:  &notify.Retrier{RetryCodes: []int{http.StatusTooManyRequests}},
		baseURL:  defaultBaseURL,
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

func (n *Notifier) Notify(ctx context.Context, alerts ...*types.Alert) (bool, error) {
	key, err := notify.ExtractGroupKey(ctx)
	if err != nil {
		return false, err
	}
	logger := n.logger.With(slog.Any("group_key", key))
	logger.DebugContext(ctx, "extracted group key")

	conn, err := n.resolver.Resolve(ctx, n.config.OrgID, n.config.ConnectionID)
	if err != nil {
		return false, errors.NewInternalf(errors.CodeInternal, "failed to resolve jsm ops connection: %v", err)
	}

	alias := key.Hash()

	if types.Alerts(alerts...).Status() == model.AlertResolved {
		if !n.config.SendResolved() {
			return false, nil
		}
		return n.closeAlert(ctx, alias, conn)
	}

	data := notify.GetTemplateData(ctx, n.tmpl, alerts, logger)
	var tmplErr error
	tmplText := notify.TmplText(n.tmpl, data, &tmplErr)

	message, msgTruncated := notify.TruncateInRunes(strings.TrimSpace(tmplText(n.config.Message)), maxMessageLenRunes)
	if msgTruncated {
		logger.WarnContext(ctx, "truncated jsm ops message to fit the field limit", slog.Int("max_runes", maxMessageLenRunes))
	}
	description, descTruncated := notify.TruncateInRunes(strings.TrimSpace(tmplText(n.config.Description)), maxDescriptionLenRunes)
	if descTruncated {
		logger.WarnContext(ctx, "truncated jsm ops description to fit the field limit", slog.Int("max_runes", maxDescriptionLenRunes))
	}

	request := createAlertRequest{
		Message:     message,
		Responders:  n.buildResponders(),
		Description: description,
		Tags:        n.buildTags(tmplText),
		Priority:    strings.TrimSpace(tmplText(n.config.Priority)),
		Alias:       alias,
		Source:      sourceName,
	}

	if tmplErr != nil {
		return false, errors.WrapInternalf(tmplErr, errors.CodeInternal, "failed to template JSM Ops alert")
	}

	if shouldRetry, err := n.postAlert(ctx, request, conn); err != nil || shouldRetry {
		return shouldRetry, err
	}

	if n.config.UpdateAlerts {
		n.updateAlert(ctx, alias, request, conn, logger)
	}
	return false, nil
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

func (n *Notifier) postAlert(ctx context.Context, req createAlertRequest, conn *alertmanagertypes.AtlassianConnection) (bool, error) {
	var buf bytes.Buffer
	if err := json.NewEncoder(&buf).Encode(req); err != nil {
		return false, err
	}

	resp, err := n.doRequest(ctx, http.MethodPost, n.alertsURL(conn.CloudID), &buf, conn)
	if err != nil {
		return true, err
	}
	defer notify.Drain(resp)

	shouldRetry, err := n.retrier.Check(resp.StatusCode, resp.Body)
	if err != nil {
		return shouldRetry, notify.NewErrorWithReason(notify.GetFailureReasonFromStatusCode(resp.StatusCode), err)
	}

	return shouldRetry, nil
}

func (n *Notifier) updateAlert(ctx context.Context, alias string, req createAlertRequest, conn *alertmanagertypes.AtlassianConnection, logger *slog.Logger) {
	alertID, _, err := n.fetchAlertID(ctx, alias, conn)
	if err != nil {
		logger.WarnContext(ctx, "jsm ops alert created but alias lookup for field update failed", slog.Any("err", err))
		return
	}
	if alertID == "" {
		return
	}

	if err := n.updateField(ctx, n.messageURL(alertID, conn.CloudID), map[string]string{"message": req.Message}, conn); err != nil {
		logger.WarnContext(ctx, "jsm ops message update failed", slog.Any("err", err))
	}
	if req.Description != "" {
		if err := n.updateField(ctx, n.descriptionURL(alertID, conn.CloudID), map[string]string{"description": req.Description}, conn); err != nil {
			logger.WarnContext(ctx, "jsm ops description update failed", slog.Any("err", err))
		}
	}
}

func (n *Notifier) updateField(ctx context.Context, reqURL string, payload map[string]string, conn *alertmanagertypes.AtlassianConnection) error {
	var buf bytes.Buffer
	if err := json.NewEncoder(&buf).Encode(payload); err != nil {
		return err
	}

	resp, err := n.doRequest(ctx, http.MethodPatch, reqURL, &buf, conn)
	if err != nil {
		return err
	}
	defer notify.Drain(resp)

	if _, err := n.retrier.Check(resp.StatusCode, resp.Body); err != nil {
		return notify.NewErrorWithReason(notify.GetFailureReasonFromStatusCode(resp.StatusCode), err)
	}
	return nil
}

func (n *Notifier) closeAlert(ctx context.Context, alias string, conn *alertmanagertypes.AtlassianConnection) (bool, error) {
	alertID, shouldRetry, err := n.fetchAlertID(ctx, alias, conn)
	if err != nil || shouldRetry {
		return shouldRetry, err
	}
	if alertID == "" {
		return false, nil
	}

	resp, err := n.doRequest(ctx, http.MethodPost, n.closeURL(alertID, conn.CloudID), nil, conn)
	if err != nil {
		return true, err
	}
	defer notify.Drain(resp)

	shouldRetry, err = n.retrier.Check(resp.StatusCode, resp.Body)
	if err != nil {
		return shouldRetry, notify.NewErrorWithReason(notify.GetFailureReasonFromStatusCode(resp.StatusCode), err)
	}
	return shouldRetry, nil
}

func (n *Notifier) fetchAlertID(ctx context.Context, alias string, conn *alertmanagertypes.AtlassianConnection) (string, bool, error) {
	u, err := url.Parse(n.aliasURL(conn.CloudID))
	if err != nil {
		return "", false, errors.NewInternalf(errors.CodeInternal, "failed to parse jsmops alias url: %v", err)
	}
	q := u.Query()
	q.Set("alias", alias)
	u.RawQuery = q.Encode()

	resp, err := n.doRequest(ctx, http.MethodGet, u.String(), nil, conn)
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

func (n *Notifier) doRequest(ctx context.Context, method, reqURL string, body io.Reader, conn *alertmanagertypes.AtlassianConnection) (*http.Response, error) {
	var bodyBytes []byte
	if body != nil {
		var err error
		bodyBytes, err = io.ReadAll(body)
		if err != nil {
			return nil, err
		}
	}

	resp, err := n.sendRequest(ctx, method, reqURL, bodyBytes, conn.AccessToken)
	if err != nil {
		return resp, err
	}

	if resp.StatusCode == http.StatusUnauthorized && conn.RefreshToken != "" {
		refreshed, refreshErr := n.resolver.Refresh(ctx, conn.OrgID, conn.ID.StringValue())
		if refreshErr != nil {
			n.logger.WarnContext(ctx, "failed to refresh jsm ops access token; reconnect the integration", slog.Any("err", refreshErr))
		} else {
			conn.AccessToken = refreshed.AccessToken
			conn.RefreshToken = refreshed.RefreshToken
			notify.Drain(resp)
			return n.sendRequest(ctx, method, reqURL, bodyBytes, refreshed.AccessToken)
		}
	}

	return resp, err
}

func (n *Notifier) sendRequest(ctx context.Context, method, reqURL string, body []byte, accessToken string) (*http.Response, error) {
	var reader io.Reader
	if body != nil {
		reader = bytes.NewReader(body)
	}

	req, err := http.NewRequestWithContext(ctx, method, reqURL, reader)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Accept", "application/json")
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	return n.client.Do(req) //nolint:bodyclose
}

func (n *Notifier) alertsURL(cloudID string) string {
	return n.buildURL(cloudID, "alerts")
}

func (n *Notifier) aliasURL(cloudID string) string {
	return n.buildURL(cloudID, "alerts/alias")
}

func (n *Notifier) closeURL(alertID, cloudID string) string {
	return n.buildURL(cloudID, fmt.Sprintf("alerts/%s/close", alertID))
}

func (n *Notifier) messageURL(alertID, cloudID string) string {
	return n.buildURL(cloudID, fmt.Sprintf("alerts/%s/message", alertID))
}

func (n *Notifier) descriptionURL(alertID, cloudID string) string {
	return n.buildURL(cloudID, fmt.Sprintf("alerts/%s/description", alertID))
}

func (n *Notifier) buildURL(cloudID, path string) string {
	base := strings.TrimRight(n.baseURL, "/")
	path = strings.TrimLeft(path, "/")
	return fmt.Sprintf("%s/%s/jsm/ops/api/v1/%s", base, cloudID, path)
}

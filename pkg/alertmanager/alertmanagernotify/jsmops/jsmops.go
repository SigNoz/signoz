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
	"sync/atomic"

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
)

// ConnectionStore resolves live OAuth credentials for a JSM Ops connection and
// can exchange a stale refresh token for a fresh pair.
type ConnectionStore interface {
	GetTokens(ctx context.Context, orgID, connectionID string) (accessToken, refreshToken, cloudID string, err error)
	Refresh(ctx context.Context, staleRefreshToken string) (newAccessToken, newRefreshToken string, err error)
}

var globalConnectionStore atomic.Pointer[ConnectionStore]

func RegisterConnectionStore(s ConnectionStore) {
	if s == nil {
		globalConnectionStore.Store(nil)
		return
	}
	globalConnectionStore.Store(&s)
}

func loadConnectionStore() ConnectionStore {
	if p := globalConnectionStore.Load(); p != nil {
		return *p
	}
	return nil
}

type Notifier struct {
	config  *alertmanagertypes.JsmOpsReceiverConfig
	tmpl    *template.Template
	logger  *slog.Logger
	client  *http.Client
	retrier *notify.Retrier
	baseURL string
}

func New(cfg *alertmanagertypes.JsmOpsReceiverConfig, t *template.Template, l *slog.Logger, templater alertmanagertypes.Templater, httpOpts ...commoncfg.HTTPClientOption) (*Notifier, error) {
	if cfg == nil {
		return nil, errors.NewInternalf(errors.CodeInternal, "jsm ops config is required")
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

func (n *Notifier) Notify(ctx context.Context, alerts ...*types.Alert) (bool, error) {
	key, err := notify.ExtractGroupKey(ctx)
	if err != nil {
		return false, err
	}
	logger := n.logger.With(slog.Any("group_key", key))
	logger.DebugContext(ctx, "extracted group key")

	store := loadConnectionStore()
	if store == nil {
		return false, errors.NewInternalf(errors.CodeInternal, "jsm ops connection store is not registered")
	}
	accessToken, refreshToken, cloudID, err := store.GetTokens(ctx, n.config.OrgID, n.config.ConnectionID)
	if err != nil {
		return false, errors.NewInternalf(errors.CodeInternal, "failed to resolve jsm ops connection: %v", err)
	}

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
		return n.closeAlert(ctx, alias, accessToken, refreshToken, cloudID)
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

	return n.postAlert(ctx, request, accessToken, refreshToken, cloudID)
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

func (n *Notifier) postAlert(ctx context.Context, req createAlertRequest, accessToken, refreshToken, cloudID string) (bool, error) {
	var buf bytes.Buffer
	if err := json.NewEncoder(&buf).Encode(req); err != nil {
		return false, err
	}

	resp, err := n.doRequest(ctx, http.MethodPost, n.alertsURL(cloudID), &buf, accessToken, refreshToken)
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

func (n *Notifier) closeAlert(ctx context.Context, alias, accessToken, refreshToken, cloudID string) (bool, error) {
	alertID, shouldRetry, err := n.fetchAlertID(ctx, alias, accessToken, refreshToken, cloudID)
	if err != nil || shouldRetry {
		return shouldRetry, err
	}
	if alertID == "" {
		return false, nil
	}

	resp, err := n.doRequest(ctx, http.MethodPost, n.closeURL(alertID, cloudID), nil, accessToken, refreshToken)
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

func (n *Notifier) fetchAlertID(ctx context.Context, alias, accessToken, refreshToken, cloudID string) (string, bool, error) {
	u, err := url.Parse(n.aliasURL(cloudID))
	if err != nil {
		return "", false, errors.NewInternalf(errors.CodeInternal, "failed to parse jsmops alias url: %v", err)
	}
	q := u.Query()
	q.Set("alias", alias)
	u.RawQuery = q.Encode()

	resp, err := n.doRequest(ctx, http.MethodGet, u.String(), nil, accessToken, refreshToken)
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

func (n *Notifier) doRequest(ctx context.Context, method, reqURL string, body io.Reader, accessToken, refreshToken string) (*http.Response, error) {
	var bodyBytes []byte
	if body != nil {
		var err error
		bodyBytes, err = io.ReadAll(body)
		if err != nil {
			return nil, err
		}
	}

	resp, err := n.sendRequest(ctx, method, reqURL, bodyBytes, accessToken)
	if err != nil {
		return resp, err
	}

	if resp.StatusCode == http.StatusUnauthorized {
		if store := loadConnectionStore(); store != nil && refreshToken != "" {
			newAccess, _, refreshErr := store.Refresh(ctx, refreshToken)
			if refreshErr != nil {
				n.logger.WarnContext(ctx, "failed to refresh jsm ops access token; reconnect the integration", slog.Any("err", refreshErr))
			} else if newAccess != "" {
				notify.Drain(resp)
				return n.sendRequest(ctx, method, reqURL, bodyBytes, newAccess)
			}
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

func (n *Notifier) buildURL(cloudID, path string) string {
	base := n.baseURL
	if base == "" {
		base = defaultBaseURL
	}
	base = strings.TrimRight(base, "/")
	path = strings.TrimLeft(path, "/")
	return fmt.Sprintf("%s/%s/jsm/ops/api/v1/%s", base, cloudID, path)
}

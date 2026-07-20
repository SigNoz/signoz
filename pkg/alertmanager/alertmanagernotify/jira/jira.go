// Copyright (c) 2026 SigNoz, Inc.
// Copyright 2023 Prometheus Team
// SPDX-License-Identifier: Apache-2.0

package jira

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"maps"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/alertmanager/alertmanagertemplate"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	commoncfg "github.com/prometheus/common/config"
	"github.com/prometheus/common/model"

	"github.com/prometheus/alertmanager/notify"
	"github.com/prometheus/alertmanager/template"
	"github.com/prometheus/alertmanager/types"
)

const Integration = "jira"

const (
	// maxSummaryLenRunes is the maximum length in runes for Jira issue summary field.
	maxSummaryLenRunes = 255
	// maxDescriptionLenRunes is the maximum length in runes for Jira issue description field.
	maxDescriptionLenRunes = 32767
)

type ConnectionResolver interface {
	Resolve(ctx context.Context, orgID, connectionID string) (*alertmanagertypes.AtlassianConnection, error)
	Refresh(ctx context.Context, orgID, connectionID string) (*alertmanagertypes.AtlassianConnection, error)
}

// jiraUpdateVerbs are the operation verbs Jira accepts inside the "update" block of an edit-issue request.
// https://developer.atlassian.com/server/jira/platform/jira-rest-api-example-edit-issues-6291632/
var jiraUpdateVerbs = map[string]struct{}{
	"add":    {},
	"set":    {},
	"remove": {},
	"edit":   {},
	"copy":   {},
}

// isUpdateOperationValue reports whether v is shaped as a Jira "update" block.
func isUpdateOperationValue(v any) bool {
	arr, ok := v.([]any)
	if !ok || len(arr) == 0 {
		return false
	}
	for _, elem := range arr {
		obj, ok := elem.(map[string]any)
		if !ok || len(obj) == 0 {
			return false
		}
		for key := range obj {
			if _, ok := jiraUpdateVerbs[key]; !ok {
				return false
			}
		}
	}
	return true
}

// Jira API types

type issue struct {
	Key        string         `json:"key,omitempty"`
	Fields     *issueFields   `json:"fields,omitempty"`
	Update     map[string]any `json:"update,omitempty"`
	Transition *idNameValue   `json:"transition,omitempty"`
}

type issueFields struct {
	Description any           `json:"description,omitempty"`
	Issuetype   *idNameValue  `json:"issuetype,omitempty"`
	Labels      []string      `json:"labels,omitempty"`
	Priority    *idNameValue  `json:"priority,omitempty"`
	Project     *issueProject `json:"project,omitempty"`
	Resolution  *idNameValue  `json:"resolution,omitempty"`
	Summary     *string       `json:"summary,omitempty"`
	Status      *issueStatus  `json:"status,omitempty"`

	Fields map[string]any `json:"-"`
}

type idNameValue struct {
	ID   string `json:"id,omitempty"`
	Name string `json:"name,omitempty"`
}

type issueProject struct {
	Key string `json:"key"`
}

type issueStatus struct {
	Name           string `json:"name"`
	StatusCategory struct {
		Key string `json:"key"`
	} `json:"statusCategory"`
}

type issueSearch struct {
	Fields     []string `json:"fields"`
	JQL        string   `json:"jql"`
	MaxResults int      `json:"maxResults"`
}

type issueSearchResult struct {
	Issues []issue `json:"issues"`
}

type issueTransitions struct {
	Transitions []idNameValue `json:"transitions"`
}

func (i issueFields) MarshalJSON() ([]byte, error) {
	jsonFields := map[string]any{}

	if i.Summary != nil {
		jsonFields["summary"] = *i.Summary
	}
	if i.Description != nil {
		jsonFields["description"] = i.Description
	}
	if i.Issuetype != nil {
		jsonFields["issuetype"] = i.Issuetype
	}
	if i.Labels != nil {
		jsonFields["labels"] = i.Labels
	}
	if i.Priority != nil {
		jsonFields["priority"] = i.Priority
	}
	if i.Project != nil {
		jsonFields["project"] = i.Project
	}
	if i.Resolution != nil {
		jsonFields["resolution"] = i.Resolution
	}
	if i.Status != nil {
		jsonFields["status"] = i.Status
	}

	if i.Fields != nil {
		maps.Copy(jsonFields, i.Fields)
	}

	return json.Marshal(jsonFields)
}

// Notifier implements a Notifier for Jira notifications over Jira Cloud OAuth 2.0 (3LO).
type Notifier struct {
	config       *alertmanagertypes.JiraReceiverConfig
	resolver     ConnectionResolver
	tmpl         *template.Template
	logger       *slog.Logger
	client       *http.Client
	retrier      *notify.Retrier
	templater    alertmanagertypes.Templater
	cloudGateway string
}

func New(cfg *alertmanagertypes.JiraReceiverConfig, t *template.Template, l *slog.Logger, templater alertmanagertypes.Templater, resolver ConnectionResolver, httpOpts ...commoncfg.HTTPClientOption) (*Notifier, error) {
	if cfg == nil {
		return nil, errors.NewInternalf(errors.CodeInternal, "jira config is required")
	}
	if resolver == nil {
		return nil, errors.NewInternalf(errors.CodeInternal, "jira connection resolver is required")
	}
	if cfg.ConnectionID == "" {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "jira connection_id is required")
	}
	if cfg.OrgID == "" {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "jira org_id is required")
	}

	client, err := notify.NewClientWithTracing(commoncfg.DefaultHTTPClientConfig, Integration, httpOpts...)
	if err != nil {
		return nil, err
	}

	return &Notifier{
		config:       cfg,
		resolver:     resolver,
		tmpl:         t,
		logger:       l,
		client:       client,
		retrier:      &notify.Retrier{RetryCodes: []int{http.StatusTooManyRequests}},
		templater:    templater,
		cloudGateway: alertmanagertypes.CloudAPIGatewayURL,
	}, nil
}

type session struct {
	n    *Notifier
	conn *alertmanagertypes.AtlassianConnection
}

func (n *Notifier) Notify(ctx context.Context, as ...*types.Alert) (bool, error) {
	key, err := notify.ExtractGroupKey(ctx)
	if err != nil {
		return false, err
	}
	logger := n.logger.With(slog.String("group_key", key.String()))
	logger.DebugContext(ctx, "extracted group key")

	conn, err := n.resolver.Resolve(ctx, n.config.OrgID, n.config.ConnectionID)
	if err != nil {
		return false, errors.WrapInternalf(err, errors.CodeInternal, "failed to resolve jira connection %s", n.config.ConnectionID)
	}

	s := &session{n: n, conn: conn}
	return s.run(ctx, logger, key.Hash(), as)
}

func (s *session) run(ctx context.Context, logger *slog.Logger, groupID string, as []*types.Alert) (bool, error) {
	n := s.n

	alerts := types.Alerts(as...)
	data := notify.GetTemplateData(ctx, n.tmpl, as, logger)
	var tmplTextErr error
	tmplText := notify.TmplText(n.tmpl, data, &tmplTextErr)
	tmplTextFunc := func(tmpl string) (string, error) {
		return tmplText(tmpl), tmplTextErr
	}

	existingIssue, shouldRetry, err := s.searchExistingIssue(ctx, logger, groupID, alerts.HasFiring(), tmplTextFunc)
	if err != nil {
		return shouldRetry, errors.WrapInternalf(err, errors.CodeInternal, "failed to look up existing issues")
	}

	// Do not create fresh issues for resolved-only notifications.
	if existingIssue == nil && alerts.Status() == model.AlertResolved {
		return false, nil
	}

	path := "issue"
	method := http.MethodPost
	if existingIssue != nil {
		path = "issue/" + existingIssue.Key
		method = http.MethodPut
	}

	summary, descriptionText, err := n.expandSummaryAndDescription(ctx, logger, as)
	if err != nil {
		n.logger.ErrorContext(ctx, "failed to prepare notification content", errors.Attr(err))
		return false, err
	}

	requestBody, err := s.prepareIssueRequestBody(groupID, summary, descriptionText, tmplTextFunc)
	if err != nil {
		return false, err
	}

	if method == http.MethodPut && requestBody.Fields != nil {
		if !n.config.Description.EnableUpdateValue() {
			requestBody.Fields.Description = nil
		}
		if !n.config.Summary.EnableUpdateValue() {
			requestBody.Fields.Summary = nil
		}
	}

	if _, shouldRetry, err := s.doAPIRequest(ctx, method, path, requestBody); err != nil {
		return shouldRetry, errors.WrapInternalf(err, errors.CodeInternal, "failed to %s Jira issue: %v", method, err)
	}

	return s.transitionIssue(ctx, existingIssue, alerts.HasFiring())
}

// adfDocument wraps plain text into a minimal Atlassian Document Format document.
func adfDocument(text string) map[string]any {
	content := make([]any, 0)
	for line := range strings.SplitSeq(text, "\n") {
		paragraph := map[string]any{"type": "paragraph"}
		if line != "" {
			paragraph["content"] = []any{
				map[string]any{"type": "text", "text": line},
			}
		}
		content = append(content, paragraph)
	}

	return map[string]any{
		"type":    "doc",
		"version": 1,
		"content": content,
	}
}

// expandSummaryAndDescription renders the issue summary and description.
func (n *Notifier) expandSummaryAndDescription(ctx context.Context, logger *slog.Logger, alerts []*types.Alert) (string, string, error) {
	customTitle, customBody := alertmanagertemplate.ExtractTemplatesFromAnnotations(alerts)
	result, err := n.templater.Expand(ctx, alertmanagertypes.ExpandRequest{
		TitleTemplate:        customTitle,
		BodyTemplate:         customBody,
		DefaultTitleTemplate: n.config.Summary.Template,
		DefaultBodyTemplate:  n.config.Description.Template,
	}, alerts)
	if err != nil {
		return "", "", err
	}

	summary, truncated := notify.TruncateInRunes(result.Title, maxSummaryLenRunes)
	if truncated {
		logger.WarnContext(ctx, "truncated summary", slog.Int("max_runes", maxSummaryLenRunes))
	}

	var descriptionText string
	if result.IsDefaultBody {
		descriptionText = result.Body[0]
	} else {
		parts := make([]string, 0, len(result.Body))
		for _, part := range result.Body {
			if part != "" {
				parts = append(parts, part)
			}
		}
		descriptionText = strings.Join(parts, "\n\n")
	}
	descriptionText, truncated = notify.TruncateInRunes(descriptionText, maxDescriptionLenRunes)
	if truncated {
		logger.WarnContext(ctx, "truncated description", slog.Int("max_runes", maxDescriptionLenRunes))
	}

	return summary, descriptionText, nil
}

func (s *session) prepareIssueRequestBody(groupID string, summary string, descriptionText string, tmplTextFunc template.TemplateFunc) (issue, error) {
	n := s.n
	project, err := tmplTextFunc(n.config.Project)
	if err != nil {
		return issue{}, errors.WrapInternalf(err, errors.CodeInternal, "project template")
	}
	issueType, err := tmplTextFunc(n.config.IssueType)
	if err != nil {
		return issue{}, errors.WrapInternalf(err, errors.CodeInternal, "issue_type template")
	}

	fieldsWithStringKeys := make(map[string]any, len(n.config.Fields))
	updateFields := make(map[string]any)
	for k, v := range n.config.Fields {
		// Skip fields saved with empty values — they carry no intent and
		// would be rejected or misinterpreted by the Jira API.
		if s, ok := v.(string); ok && s == "" {
			continue
		}
		copied, err := template.DeepCopyWithTemplate(v, tmplTextFunc)
		if err != nil {
			return issue{}, errors.WrapInternalf(err, errors.CodeInternal, "fields template")
		}
		if isUpdateOperationValue(copied) {
			updateFields[k] = copied
			continue
		}
		fieldsWithStringKeys[k] = copied
	}

	requestBody := issue{Fields: &issueFields{
		Project:   &issueProject{Key: project},
		Issuetype: &idNameValue{Name: issueType},
		Summary:   &summary,
		Labels:    make([]string, 0, len(n.config.Labels)+1),
		Fields:    fieldsWithStringKeys,
	}}
	if len(updateFields) > 0 {
		requestBody.Update = updateFields
	}

	if descriptionText != "" {
		// The Cloud v3 API expects Atlassian Document Format.
		requestBody.Fields.Description = adfDocument(descriptionText)
	}

	for i, label := range n.config.Labels {
		label, err = tmplTextFunc(label)
		if err != nil {
			return issue{}, errors.WrapInternalf(err, errors.CodeInternal, "labels[%d] template", i)
		}
		requestBody.Fields.Labels = append(requestBody.Fields.Labels, label)
	}
	requestBody.Fields.Labels = append(requestBody.Fields.Labels, fmt.Sprintf("ALERT{%s}", groupID))
	sort.Strings(requestBody.Fields.Labels)

	priority, err := tmplTextFunc(n.config.Priority)
	if err != nil {
		return issue{}, errors.WrapInternalf(err, errors.CodeInternal, "priority template")
	}
	if priority != "" {
		requestBody.Fields.Priority = &idNameValue{Name: priority}
	}

	return requestBody, nil
}

func (s *session) searchExistingIssue(ctx context.Context, logger *slog.Logger, groupID string, firing bool, tmplTextFunc template.TemplateFunc) (*issue, bool, error) {
	n := s.n
	jql := strings.Builder{}

	if n.config.WontFixResolution != "" {
		// JQL's != on resolution silently excludes issues whose resolution is EMPTY
		// (unresolved). Use (resolution is EMPTY or resolution != X) so open issues
		// remain in the candidate set and only won't-fix resolved ones are filtered out.
		fmt.Fprintf(&jql, `(resolution is EMPTY or resolution != %q) and `, n.config.WontFixResolution)
	}

	if firing {
		reopenDuration := int64(time.Duration(n.config.ReopenDuration).Minutes())
		if n.config.ReopenTransition != "" && reopenDuration > 0 {
			fmt.Fprintf(&jql, `(resolutiondate is EMPTY OR resolutiondate >= -%dm) and `, reopenDuration)
		} else {
			jql.WriteString(`statusCategory != Done and `)
		}
	} else {
		jql.WriteString(`statusCategory != Done and `)
	}

	alertLabel := fmt.Sprintf("ALERT{%s}", groupID)
	project, err := tmplTextFunc(n.config.Project)
	if err != nil {
		return nil, false, errors.WrapInternalf(err, errors.CodeInternal, "invalid project template or value")
	}
	fmt.Fprintf(&jql, `project=%q and labels=%q order by status ASC,resolutiondate DESC`, project, alertLabel)

	requestBody := issueSearch{
		JQL:        jql.String(),
		MaxResults: 2,
		Fields:     []string{"status"},
	}
	responseBody, shouldRetry, err := s.doAPIRequestFullPath(ctx, http.MethodPost, s.searchURL(), requestBody)
	if err != nil {
		return nil, shouldRetry, errors.WrapInternalf(err, errors.CodeInternal, "jira search request failed")
	}

	var issueSearchResult issueSearchResult
	if err := json.Unmarshal(responseBody, &issueSearchResult); err != nil {
		return nil, false, err
	}

	if len(issueSearchResult.Issues) == 0 {
		return nil, false, nil
	}

	if len(issueSearchResult.Issues) > 1 {
		logger.WarnContext(ctx, "multiple jira issues matched group, selecting first", slog.String("selected_issue", issueSearchResult.Issues[0].Key))
	}

	return &issueSearchResult.Issues[0], false, nil
}

func (s *session) getIssueTransitionByName(ctx context.Context, issueKey, transitionName string) (string, bool, error) {
	path := fmt.Sprintf("issue/%s/transitions", issueKey)

	responseBody, shouldRetry, err := s.doAPIRequest(ctx, http.MethodGet, path, nil)
	if err != nil {
		return "", shouldRetry, err
	}

	var transitions issueTransitions
	if err := json.Unmarshal(responseBody, &transitions); err != nil {
		return "", false, err
	}

	for _, issueTransition := range transitions.Transitions {
		if issueTransition.Name == transitionName {
			return issueTransition.ID, false, nil
		}
	}

	return "", false, errors.NewInternalf(errors.CodeInternal, "can't find transition %s for issue %s", transitionName, issueKey)
}

func (s *session) transitionIssue(ctx context.Context, issueToTransition *issue, firing bool) (bool, error) {
	n := s.n
	if issueToTransition == nil || issueToTransition.Key == "" || issueToTransition.Fields == nil || issueToTransition.Fields.Status == nil {
		return false, nil
	}

	var transition string
	if firing {
		if issueToTransition.Fields.Status.StatusCategory.Key != "done" {
			return false, nil
		}
		transition = n.config.ReopenTransition
	} else {
		if issueToTransition.Fields.Status.StatusCategory.Key == "done" {
			return false, nil
		}
		transition = n.config.ResolveTransition
	}

	if transition == "" {
		return false, nil
	}

	transitionID, shouldRetry, err := s.getIssueTransitionByName(ctx, issueToTransition.Key, transition)
	if err != nil {
		return shouldRetry, err
	}

	requestBody := issue{
		Transition: &idNameValue{
			ID: transitionID,
		},
	}
	path := fmt.Sprintf("issue/%s/transitions", issueToTransition.Key)

	_, shouldRetry, err = s.doAPIRequest(ctx, http.MethodPost, path, requestBody)
	if err != nil {
		return shouldRetry, err
	}

	return false, nil
}

// baseAPIURL returns the REST base for the resolved connection.
func (s *session) baseAPIURL() string {
	return s.conn.APIBaseURLVia(s.n.cloudGateway)
}

// searchURL returns the JQL search endpoint. Cloud v3 replaced /search with /search/jql.
func (s *session) searchURL() string {
	return s.baseAPIURL() + "/search/jql"
}

func (s *session) doAPIRequest(ctx context.Context, method, path string, requestBody any) ([]byte, bool, error) {
	path = strings.TrimPrefix(path, "/")
	return s.doAPIRequestFullPath(ctx, method, s.baseAPIURL()+"/"+path, requestBody)
}

func (s *session) doAPIRequestFullPath(ctx context.Context, method, fullURL string, requestBody any) ([]byte, bool, error) {
	var bodyBytes []byte
	if requestBody != nil {
		var buf bytes.Buffer
		if err := json.NewEncoder(&buf).Encode(requestBody); err != nil {
			return nil, false, err
		}
		bodyBytes = buf.Bytes()
	}

	resp, err := s.sendRequest(ctx, method, fullURL, bodyBytes, s.conn.AccessToken)
	if err != nil {
		return nil, false, err
	}

	// On 401, refresh the access token once and retry.
	if resp.StatusCode == http.StatusUnauthorized && s.conn.RefreshToken != "" {
		refreshed, refreshErr := s.n.resolver.Refresh(ctx, s.n.config.OrgID, s.n.config.ConnectionID)
		if refreshErr != nil {
			s.n.logger.WarnContext(ctx, "failed to refresh jira access token; reconnect the integration", slog.Any("err", refreshErr))
		} else if refreshed.AccessToken != "" {
			notify.Drain(resp)
			s.conn = refreshed
			resp, err = s.sendRequest(ctx, method, fullURL, bodyBytes, s.conn.AccessToken)
			if err != nil {
				return nil, false, err
			}
		}
	}

	defer notify.Drain(resp)

	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, false, err
	}

	shouldRetry, err := s.n.retrier.Check(resp.StatusCode, bytes.NewReader(responseBody))
	if err != nil {
		return nil, shouldRetry, notify.NewErrorWithReason(notify.GetFailureReasonFromStatusCode(resp.StatusCode), err)
	}

	return responseBody, false, nil
}

func (s *session) sendRequest(ctx context.Context, method, fullURL string, body []byte, accessToken string) (*http.Response, error) {
	var reader io.Reader
	if body != nil {
		reader = bytes.NewReader(body)
	}

	req, err := http.NewRequestWithContext(ctx, method, fullURL, reader)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Accept-Language", "en")

	return s.n.client.Do(req) //nolint:bodyclose
}

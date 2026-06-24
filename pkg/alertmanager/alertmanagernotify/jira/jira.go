// Copyright (c) 2026 SigNoz, Inc.
// Copyright 2023 Prometheus Team
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

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

	"github.com/SigNoz/signoz/pkg/errors"
	commoncfg "github.com/prometheus/common/config"
	"github.com/prometheus/common/model"

	"github.com/prometheus/alertmanager/config"
	"github.com/prometheus/alertmanager/notify"
	"github.com/prometheus/alertmanager/template"
	"github.com/prometheus/alertmanager/types"
)

const Integration = "jira"

const (
	// maxSummaryLenRunes is the maximum length in runes for Jira issue summary field (255 characters).
	// This is a Jira API limit enforced across all Jira instances (Cloud, Data Center, etc.).
	maxSummaryLenRunes = 255
	// maxDescriptionLenRunes is the maximum length in runes for Jira issue description field (32767 characters).
	// This is a Jira API limit enforced across all Jira instances (Cloud, Data Center, etc.).
	maxDescriptionLenRunes = 32767
)

// Jira API types

type issue struct {
	Key        string       `json:"key,omitempty"`
	Fields     *issueFields `json:"fields,omitempty"`
	Transition *idNameValue `json:"transition,omitempty"`
}

type issueFields struct {
	Description *string       `json:"description,omitempty"`
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
		jsonFields["description"] = *i.Description
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

// Notifier implements a Notifier for Jira notifications.
type Notifier struct {
	conf    *config.JiraConfig
	tmpl    *template.Template
	logger  *slog.Logger
	client  *http.Client
	retrier *notify.Retrier
}

// New returns a new Jira notifier.
func New(c *config.JiraConfig, t *template.Template, l *slog.Logger, httpOpts ...commoncfg.HTTPClientOption) (*Notifier, error) {
	if c == nil {
		return nil, errors.NewInternalf(errors.CodeInternal, "jira config nil")
	}

	// Normalize API URL: ensure it ends with /rest/api/2 (unless already present)
	if c.APIURL != nil {
		path := strings.TrimSuffix(c.APIURL.Path, "/")
		if !strings.HasSuffix(path, "/rest/api/2") {
			normalizedURL := c.APIURL.Copy()
			normalizedURL.Path = path + "/rest/api/2"
			c.APIURL = normalizedURL
		}
	}

	client, err := notify.NewClientWithTracing(*c.HTTPConfig, Integration, httpOpts...)
	if err != nil {
		return nil, err
	}

	return &Notifier{
		conf:    c,
		tmpl:    t,
		logger:  l,
		client:  client,
		retrier: &notify.Retrier{RetryCodes: []int{http.StatusTooManyRequests}},
	}, nil
}

// Notify implements the Notifier interface for Jira.
func (n *Notifier) Notify(ctx context.Context, as ...*types.Alert) (bool, error) {
	key, err := notify.ExtractGroupKey(ctx)
	if err != nil {
		return false, err
	}
	logger := n.logger.With(slog.String("group_key", key.String()))
	logger.DebugContext(ctx, "extracted group key")

	alerts := types.Alerts(as...)
	data := notify.GetTemplateData(ctx, n.tmpl, as, logger)
	var tmplTextErr error
	tmplText := notify.TmplText(n.tmpl, data, &tmplTextErr)
	tmplTextFunc := func(tmpl string) (string, error) {
		return tmplText(tmpl), tmplTextErr
	}

	existingIssue, shouldRetry, err := n.searchExistingIssue(ctx, logger, key.Hash(), alerts.HasFiring(), tmplTextFunc)
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

	requestBody, err := n.prepareIssueRequestBody(ctx, logger, key.Hash(), tmplTextFunc)
	if err != nil {
		return false, err
	}

	if method == http.MethodPut && requestBody.Fields != nil {
		if !n.conf.Description.EnableUpdateValue() {
			requestBody.Fields.Description = nil
		}
		if !n.conf.Summary.EnableUpdateValue() {
			requestBody.Fields.Summary = nil
		}
	}

	responseBody, shouldRetry, err := n.doAPIRequest(ctx, method, path, requestBody)
	if err != nil {
		return shouldRetry, errors.WrapInternalf(err, errors.CodeInternal, "failed to %s request to %q", method, path)
	}

	// Parse response to get issue key and construct URL
	var issueKey string
	var issueURL string

	if method == http.MethodPost {
		// Parse the response to get the created issue key
		var createResponse struct {
			Key  string `json:"key"`
			Self string `json:"self"`
		}
		if err := json.Unmarshal(responseBody, &createResponse); err == nil && createResponse.Key != "" {
			issueKey = createResponse.Key
			// Construct the issue URL from the API URL
			issueURL = n.conf.APIURL.String()
			if strings.Contains(issueURL, "/rest/api/") {
				// Remove /rest/api/* from URL to get base URL
				issueURL = issueURL[:strings.Index(issueURL, "/rest/api/")]
			}
			issueURL = issueURL + "/browse/" + issueKey

			logger.InfoContext(ctx, "created jira issue",
				slog.String("issue_key", issueKey),
				slog.String("issue_url", issueURL),
			)

		}
	}

	return n.transitionIssue(ctx, logger, existingIssue, alerts.HasFiring())
}

func (n *Notifier) prepareIssueRequestBody(ctx context.Context, logger *slog.Logger, groupID string, tmplTextFunc template.TemplateFunc) (issue, error) {
	summary, err := tmplTextFunc(n.conf.Summary.Template)
	if err != nil {
		return issue{}, errors.WrapInternalf(err, errors.CodeInternal, "summary template")
	}

	project, err := tmplTextFunc(n.conf.Project)
	if err != nil {
		return issue{}, errors.WrapInternalf(err, errors.CodeInternal, "project template")
	}
	issueType, err := tmplTextFunc(n.conf.IssueType)
	if err != nil {
		return issue{}, errors.WrapInternalf(err, errors.CodeInternal, "issue_type template")
	}

	fieldsWithStringKeys := make(map[string]any, len(n.conf.Fields))
	if n.conf.Fields != nil {
		for k, v := range n.conf.Fields {
			fieldsWithStringKeys[k], err = template.DeepCopyWithTemplate(v, tmplTextFunc)
			if err != nil {
				return issue{}, errors.WrapInternalf(err, errors.CodeInternal, "fields template")
			}
		}
	}

	summary, truncated := notify.TruncateInRunes(summary, maxSummaryLenRunes)
	if truncated {
		logger.WarnContext(ctx, "truncated summary", slog.Int("max_runes", maxSummaryLenRunes))
	}

	requestBody := issue{Fields: &issueFields{
		Project:   &issueProject{Key: project},
		Issuetype: &idNameValue{Name: issueType},
		Summary:   &summary,
		Labels:    make([]string, 0, len(n.conf.Labels)+1),
		Fields:    fieldsWithStringKeys,
	}}

	descriptionText, err := tmplTextFunc(n.conf.Description.Template)
	if err != nil {
		return issue{}, errors.WrapInternalf(err, errors.CodeInternal, "description template")
	}
	descriptionText, truncated = notify.TruncateInRunes(descriptionText, maxDescriptionLenRunes)
	if truncated {
		logger.WarnContext(ctx, "truncated description", slog.Int("max_runes", maxDescriptionLenRunes))
	}
	if descriptionText != "" {
		requestBody.Fields.Description = &descriptionText
	}

	for i, label := range n.conf.Labels {
		label, err = tmplTextFunc(label)
		if err != nil {
			return issue{}, errors.WrapInternalf(err, errors.CodeInternal, "labels[%d] template", i)
		}
		requestBody.Fields.Labels = append(requestBody.Fields.Labels, label)
	}
	requestBody.Fields.Labels = append(requestBody.Fields.Labels, fmt.Sprintf("ALERT{%s}", groupID))
	sort.Strings(requestBody.Fields.Labels)

	priority, err := tmplTextFunc(n.conf.Priority)
	if err != nil {
		return issue{}, errors.WrapInternalf(err, errors.CodeInternal, "priority template")
	}
	if priority != "" {
		requestBody.Fields.Priority = &idNameValue{Name: priority}
	}

	return requestBody, nil
}

func (n *Notifier) searchExistingIssue(ctx context.Context, logger *slog.Logger, groupID string, firing bool, tmplTextFunc template.TemplateFunc) (*issue, bool, error) {
	jql := strings.Builder{}

	if n.conf.WontFixResolution != "" {
		fmt.Fprintf(&jql, `resolution != %q and `, n.conf.WontFixResolution)
	}

	if firing {
		reopenDuration := int64(time.Duration(n.conf.ReopenDuration).Minutes())
		if n.conf.ReopenTransition != "" {
			if reopenDuration > 0 {
				fmt.Fprintf(&jql, `(resolutiondate is EMPTY OR resolutiondate >= -%dm) and `, reopenDuration)
			}
		} else {
			jql.WriteString(`statusCategory != Done and `)
		}
	} else {
		jql.WriteString(`statusCategory != Done and `)
	}

	alertLabel := fmt.Sprintf("ALERT{%s}", groupID)
	project, err := tmplTextFunc(n.conf.Project)
	if err != nil {
		return nil, false, errors.WrapInternalf(err, errors.CodeInternal, "invalid project template or value")
	}
	fmt.Fprintf(&jql, `project=%q and labels=%q order by status ASC,resolutiondate DESC`, project, alertLabel)

	requestBody, searchPath := n.prepareSearchRequest(jql.String())

	responseBody, shouldRetry, err := n.doAPIRequestFullPath(ctx, http.MethodPost, searchPath, requestBody)
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

// prepareSearchRequest builds request body and endpoint for searching Jira issues.
// Jira Cloud uses /rest/api/3/search/jql while Data Center uses /rest/api/2/search.
func (n *Notifier) prepareSearchRequest(jql string) (issueSearch, string) {
	requestBody := issueSearch{
		JQL:        jql,
		MaxResults: 2,
		Fields:     []string{"status"},
	}

	baseURL := n.conf.APIURL.Copy()
	baseURL.Path = strings.TrimSuffix(baseURL.Path, "/")

	if n.conf.APIType == "datacenter" {
		baseURL.Path += "/search"
		return requestBody, baseURL.String()
	}

	if n.conf.APIType == "cloud" || (n.conf.APIType == "auto" && strings.HasSuffix(n.conf.APIURL.Host, "atlassian.net")) {
		// For Jira Cloud, use API v3 for search
		baseURL.Path = strings.Replace(baseURL.Path, "/rest/api/2", "/rest/api/3", 1)
		baseURL.Path += "/search/jql"
		return requestBody, baseURL.String()
	}

	baseURL.Path += "/search"
	return requestBody, baseURL.String()
}

func (n *Notifier) getIssueTransitionByName(ctx context.Context, issueKey, transitionName string) (string, bool, error) {
	path := fmt.Sprintf("issue/%s/transitions", issueKey)

	responseBody, shouldRetry, err := n.doAPIRequest(ctx, http.MethodGet, path, nil)
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

func (n *Notifier) transitionIssue(ctx context.Context, logger *slog.Logger, issueToTransition *issue, firing bool) (bool, error) {
	if issueToTransition == nil || issueToTransition.Key == "" || issueToTransition.Fields == nil || issueToTransition.Fields.Status == nil {
		return false, nil
	}

	var transition string
	if firing {
		if issueToTransition.Fields.Status.StatusCategory.Key != "done" {
			return false, nil
		}
		transition = n.conf.ReopenTransition
	} else {
		if issueToTransition.Fields.Status.StatusCategory.Key == "done" {
			return false, nil
		}
		transition = n.conf.ResolveTransition
	}

	if transition == "" {
		return false, nil
	}

	transitionID, shouldRetry, err := n.getIssueTransitionByName(ctx, issueToTransition.Key, transition)
	if err != nil {
		return shouldRetry, err
	}

	requestBody := issue{
		Transition: &idNameValue{
			ID: transitionID,
		},
	}
	path := fmt.Sprintf("issue/%s/transitions", issueToTransition.Key)

	_, shouldRetry, err = n.doAPIRequest(ctx, http.MethodPost, path, requestBody)
	if err != nil {
		return shouldRetry, err
	}

	return false, nil
}

func (n *Notifier) doAPIRequest(ctx context.Context, method, path string, requestBody any) ([]byte, bool, error) {
	url := n.conf.APIURL.Copy()
	// Ensure path starts with /
	if !strings.HasPrefix(path, "/") {
		path = "/" + path
	}
	url.Path = strings.TrimSuffix(url.Path, "/") + path
	return n.doAPIRequestFullPath(ctx, method, url.String(), requestBody)
}

func (n *Notifier) doAPIRequestFullPath(ctx context.Context, method, path string, requestBody any) ([]byte, bool, error) {
	var body io.Reader
	if requestBody != nil {
		var buf bytes.Buffer
		if err := json.NewEncoder(&buf).Encode(requestBody); err != nil {
			return nil, false, err
		}

		body = &buf
	}

	req, err := http.NewRequestWithContext(ctx, method, path, body)
	if err != nil {
		return nil, false, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept-Language", "en")

	resp, err := n.client.Do(req) //nolint:bodyclose
	if err != nil {
		return nil, false, err
	}
	defer notify.Drain(resp)

	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, false, err
	}

	shouldRetry, err := n.retrier.Check(resp.StatusCode, bytes.NewReader(responseBody))
	if err != nil {
		return nil, shouldRetry, notify.NewErrorWithReason(notify.GetFailureReasonFromStatusCode(resp.StatusCode), err)
	}

	return responseBody, false, nil
}

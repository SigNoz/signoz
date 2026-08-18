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
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/alertmanager/alertmanagertemplate"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/templating/markdownrenderer/adf"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/prometheus/alertmanager/notify"
	"github.com/prometheus/alertmanager/template"
	"github.com/prometheus/alertmanager/types"
)

const Integration = "jira"

const (
	maxSummaryLenRunes     = 255
	maxDescriptionLenRunes = 32767
)

// Notifier implements notify.Notifier for Jira.
type Notifier struct {
	conf      *alertmanagertypes.JiraReceiverConfig
	logger    *slog.Logger
	client    *http.Client
	retrier   *notify.Retrier
	templater alertmanagertypes.Templater
}

func New(conf *alertmanagertypes.JiraReceiverConfig, _ *template.Template, l *slog.Logger, templater alertmanagertypes.Templater) (*Notifier, error) {
	if conf.HTTPConfig == nil {
		return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "jira http_config is nil")
	}
	client, err := notify.NewClientWithTracing(*conf.HTTPConfig, Integration)
	if err != nil {
		return nil, err
	}
	return &Notifier{
		conf:      conf,
		logger:    l,
		client:    client,
		retrier:   &notify.Retrier{RetryCodes: []int{http.StatusTooManyRequests}},
		templater: templater,
	}, nil
}

func (n *Notifier) Notify(ctx context.Context, as ...*types.Alert) (bool, error) {
	key, err := notify.ExtractGroupKey(ctx)
	if err != nil {
		return false, err
	}
	groupID := key.Hash()
	firing := types.Alerts(as...).HasFiring()
	n.logger.DebugContext(ctx, "sending jira notification", slog.String("group_key", key.String()), slog.Bool("firing", firing))

	customTitle, customBody := alertmanagertemplate.ExtractTemplatesFromAnnotations(as)
	result, err := n.templater.Expand(ctx, alertmanagertypes.ExpandRequest{
		TitleTemplate:        customTitle,
		BodyTemplate:         customBody,
		DefaultTitleTemplate: n.conf.Summary,
		DefaultBodyTemplate:  n.conf.Description,
	}, as)
	if err != nil {
		return false, err
	}
	summary := truncateRunes(result.Title, maxSummaryLenRunes)

	var parts []string
	for _, body := range result.Body {
		if body != "" {
			parts = append(parts, body)
		}
	}
	// custom body templates render per alert; join them under ADF rule dividers.
	// The default body is a single combined part, so the join is a no-op there.
	descText := truncateRunes(strings.Join(parts, "\n\n---\n\n"), maxDescriptionLenRunes)

	existing, retry, err := n.searchIssue(ctx, groupID, firing)
	if err != nil {
		return retry, err
	}

	fields := n.buildFields(groupID, summary, descText, as, firing)

	// No existing issue: create for firing groups; never create for resolved-only.
	if existing == nil {
		if !firing {
			return false, nil
		}
		return n.createIssue(ctx, fields)
	}

	// Existing issue: refresh it, then transition + comment based on the new state.
	if retry, err := n.updateIssue(ctx, existing.Key, fields); err != nil {
		return retry, err
	}

	// Each state-change comment carries the same rich snapshot as the description
	// (panel + details + deep-links), so the comment timeline mirrors the card
	// Google Chat re-posts on every notification.
	switch {
	case firing && existing.isDone(): // re-fired after resolution → reopen
		if retry, err := n.applyTransition(ctx, existing.Key, false, n.conf.ReopenTransition); err != nil {
			return retry, err
		}
	case !firing: // resolved (search returns only open issues, so this one is open)
		if retry, err := n.applyTransition(ctx, existing.Key, true, n.conf.ResolveTransition); err != nil {
			return retry, err
		}
	}
	// firing && !isDone (still firing) needs no transition.
	return n.addComment(ctx, existing.Key, fields.Description)
}

func (n *Notifier) buildFields(groupID, summary, descText string, alerts []*types.Alert, firing bool) *issueFields {
	f := &issueFields{
		Project:     &idKey{Key: n.conf.Project},
		Issuetype:   &idName{Name: n.conf.IssueType},
		Summary:     summary,
		Labels:      n.labels(groupID),
		Description: n.buildDescription(descText, alerts, firing),
	}
	if n.conf.Priority != "" {
		f.Priority = &idName{Name: n.conf.Priority}
	}
	return f
}

// buildDescription assembles the ADF issue body: a firing/resolved status panel,
// the rendered markdown body, and SigNoz deep-links.
func (n *Notifier) buildDescription(descText string, alerts []*types.Alert, firing bool) map[string]any {
	content := []any{statusPanel(firing)}
	content = append(content, adf.Render(descText)...)
	if links := deepLinks(alerts); links != nil {
		content = append(content, links)
	}
	return map[string]any{"type": "doc", "version": 1, "content": content}
}

func statusPanel(firing bool) map[string]any {
	panelType, label := "success", "🟢 RESOLVED"
	if firing {
		panelType, label = "error", "🔴 FIRING"
	}
	return map[string]any{
		"type":  "panel",
		"attrs": map[string]any{"panelType": panelType},
		"content": []any{map[string]any{
			"type":    "paragraph",
			"content": []any{map[string]any{"type": "text", "text": label, "marks": []any{map[string]any{"type": "strong"}}}},
		}},
	}
}

// deepLinks builds a paragraph of SigNoz links from the per-rule ruleSource label
// and the related-logs/traces annotations. Returns nil when none are present.
func deepLinks(alerts []*types.Alert) map[string]any {
	if len(alerts) == 0 {
		return nil
	}
	a := alerts[0]
	var parts []any
	add := func(label, url string) {
		if url == "" {
			return
		}
		if len(parts) > 0 {
			parts = append(parts, map[string]any{"type": "text", "text": " · "})
		}
		parts = append(parts, map[string]any{
			"type":  "text",
			"text":  label,
			"marks": []any{map[string]any{"type": "link", "attrs": map[string]any{"href": url}}},
		})
	}
	add("Open in SigNoz", string(a.Labels[ruletypes.LabelRuleSource]))
	add("View Related Logs", string(a.Annotations[ruletypes.AnnotationRelatedLogs]))
	add("View Related Traces", string(a.Annotations[ruletypes.AnnotationRelatedTraces]))
	if len(parts) == 0 {
		return nil
	}
	return map[string]any{"type": "paragraph", "content": parts}
}

func (n *Notifier) labels(groupID string) []string {
	out := append([]string{}, n.conf.Labels...)
	out = append(out, "signoz", fmt.Sprintf("ALERT{%s}", groupID))
	sort.Strings(out)
	return out
}

func (n *Notifier) searchIssue(ctx context.Context, groupID string, firing bool) (*issue, bool, error) {
	var jql strings.Builder
	if n.conf.WontFixResolution != "" {
		// != alone also drops unresolved (EMPTY) issues, so keep those explicitly.
		fmt.Fprintf(&jql, `(resolution is EMPTY or resolution != %q) and `, n.conf.WontFixResolution)
	}
	if reopenMin := int64(time.Duration(n.conf.ReopenDuration).Minutes()); firing && reopenMin > 0 {
		fmt.Fprintf(&jql, `(resolutiondate is EMPTY OR resolutiondate >= -%dm) and `, reopenMin)
	} else {
		jql.WriteString(`statusCategory != Done and `)
	}
	fmt.Fprintf(&jql, `project=%q and labels=%q order by status ASC, resolutiondate DESC`, n.conf.Project, fmt.Sprintf("ALERT{%s}", groupID))

	body, retry, err := n.callAPI(ctx, http.MethodPost, n.conf.APIBaseURL()+"/search/jql", searchRequest{
		JQL: jql.String(), MaxResults: 2, Fields: []string{"status"},
	})
	if err != nil {
		return nil, retry, err
	}
	var res searchResult
	if err := json.Unmarshal(body, &res); err != nil {
		return nil, false, err
	}
	if len(res.Issues) == 0 {
		return nil, false, nil
	}
	// the JQL order is not category-aware, so prefer an open issue over a done
	// one; all done falls back to the most recently resolved (resolutiondate DESC)
	for i := range res.Issues {
		if !res.Issues[i].isDone() {
			return &res.Issues[i], false, nil
		}
	}
	return &res.Issues[0], false, nil
}

func (n *Notifier) createIssue(ctx context.Context, fields *issueFields) (bool, error) {
	_, retry, err := n.callAPI(ctx, http.MethodPost, n.conf.APIBaseURL()+"/issue", issue{Fields: fields})
	return retry, err
}

func (n *Notifier) updateIssue(ctx context.Context, key string, fields *issueFields) (bool, error) {
	// project and issue type are set at creation and cannot be edited.
	upd := *fields
	upd.Project = nil
	upd.Issuetype = nil
	_, retry, err := n.callAPI(ctx, http.MethodPut, n.issueURL(key, ""), issue{Fields: &upd})
	return retry, err
}

// applyTransition moves the issue into (toDone) or out of (!toDone) the "done"
// status category, preferring the named override, else the first matching
// transition, else skipping without error when none is available.
func (n *Notifier) applyTransition(ctx context.Context, key string, toDone bool, override string) (bool, error) {
	transitions, retry, err := n.getTransitions(ctx, key)
	if err != nil {
		return retry, err
	}
	id := selectTransition(transitions, toDone, override)
	if id == "" {
		n.logger.WarnContext(ctx, "jira: no matching transition, leaving issue as-is", slog.String("issue", key), slog.Bool("to_done", toDone))
		return false, nil
	}
	_, retry, err = n.callAPI(ctx, http.MethodPost, n.issueURL(key, "transitions"), issue{Transition: &idName{ID: id}})
	return retry, err
}

func (n *Notifier) getTransitions(ctx context.Context, key string) ([]jiraTransition, bool, error) {
	body, retry, err := n.callAPI(ctx, http.MethodGet, n.issueURL(key, "transitions"), nil)
	if err != nil {
		return nil, retry, err
	}
	var tr transitionsResponse
	if err := json.Unmarshal(body, &tr); err != nil {
		return nil, false, err
	}
	return tr.Transitions, false, nil
}

func (n *Notifier) addComment(ctx context.Context, key string, body any) (bool, error) {
	_, retry, err := n.callAPI(ctx, http.MethodPost, n.issueURL(key, "comment"), comment{Body: body})
	return retry, err
}

func (n *Notifier) issueURL(key, sub string) string {
	u := n.conf.APIBaseURL() + "/issue/" + key
	if sub != "" {
		u += "/" + sub
	}
	return u
}

func (n *Notifier) callAPI(ctx context.Context, method, url string, reqBody any) ([]byte, bool, error) {
	var body io.Reader
	if reqBody != nil {
		var buf bytes.Buffer
		if err := json.NewEncoder(&buf).Encode(reqBody); err != nil {
			return nil, false, err
		}
		body = &buf
	}
	req, err := http.NewRequestWithContext(ctx, method, url, body)
	if err != nil {
		return nil, false, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	resp, err := n.client.Do(req) //nolint:bodyclose // notify.Drain closes the body
	if err != nil {
		return nil, true, notify.RedactURL(err)
	}
	defer notify.Drain(resp)

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, false, err
	}
	shouldRetry, err := n.retrier.Check(resp.StatusCode, bytes.NewReader(respBody))
	if err != nil {
		return respBody, shouldRetry, notify.NewErrorWithReason(notify.GetFailureReasonFromStatusCode(resp.StatusCode), err)
	}
	return respBody, false, nil
}

// ResolveCloudID fetches a Jira Cloud site's cloud id from its unauthenticated
// tenant_info endpoint. Service accounts need it to address the
// api.atlassian.com gateway; it is resolved once at channel save/test time.
func ResolveCloudID(ctx context.Context, client *http.Client, site string) (string, error) {
	url := strings.TrimRight(site, "/") + "/_edge/tenant_info"
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("Accept", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return "", errors.WrapInternalf(err, errors.CodeInternal, "failed to fetch jira cloud id")
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}
	if resp.StatusCode != http.StatusOK {
		return "", errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "failed to resolve jira cloud id from %s: status %d", url, resp.StatusCode)
	}

	var out struct {
		CloudID string `json:"cloudId"`
	}
	if err := json.Unmarshal(body, &out); err != nil {
		return "", errors.WrapInternalf(err, errors.CodeInternal, "failed to parse jira tenant_info response")
	}
	if out.CloudID == "" {
		return "", errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "jira tenant_info returned an empty cloud id for %s", site)
	}
	return out.CloudID, nil
}

// selectTransition returns the id of the transition whose target status category
// matches toDone, preferring one named override when present.
func selectTransition(transitions []jiraTransition, toDone bool, override string) string {
	if override != "" {
		for _, t := range transitions {
			if t.Name == override {
				return t.ID
			}
		}
	}
	for _, t := range transitions {
		if (t.To.StatusCategory.Key == "done") == toDone {
			return t.ID
		}
	}
	return ""
}

// Jira API types.
type issue struct {
	Key        string       `json:"key,omitempty"`
	Fields     *issueFields `json:"fields,omitempty"`
	Transition *idName      `json:"transition,omitempty"`
}

type issueFields struct {
	Project     *idKey       `json:"project,omitempty"`
	Issuetype   *idName      `json:"issuetype,omitempty"`
	Summary     string       `json:"summary,omitempty"`
	Labels      []string     `json:"labels,omitempty"`
	Priority    *idName      `json:"priority,omitempty"`
	Description any          `json:"description,omitempty"`
	Status      *issueStatus `json:"status,omitempty"`
}

type idKey struct {
	Key string `json:"key"`
}

type idName struct {
	ID   string `json:"id,omitempty"`
	Name string `json:"name,omitempty"`
}

type issueStatus struct {
	StatusCategory struct {
		Key string `json:"key"`
	} `json:"statusCategory"`
}

func (i *issue) isDone() bool {
	return i.Fields != nil && i.Fields.Status != nil && i.Fields.Status.StatusCategory.Key == "done"
}

type searchRequest struct {
	JQL        string   `json:"jql"`
	MaxResults int      `json:"maxResults"`
	Fields     []string `json:"fields"`
}

type searchResult struct {
	Issues []issue `json:"issues"`
}

type transitionsResponse struct {
	Transitions []jiraTransition `json:"transitions"`
}

type jiraTransition struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	To   struct {
		StatusCategory struct {
			Key string `json:"key"`
		} `json:"statusCategory"`
	} `json:"to"`
}

type comment struct {
	Body any `json:"body"`
}

func truncateRunes(s string, max int) string {
	r := []rune(s)
	if len(r) <= max {
		return s
	}
	return string(r[:max])
}

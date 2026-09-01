package alertmanagertypes

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/prometheus/alertmanager/config"
	commoncfg "github.com/prometheus/common/config"
	"github.com/prometheus/common/model"
)

const defaultJiraReopenDuration = model.Duration(3 * 24 * time.Hour)

// Service accounts authenticate against the api.atlassian.com gateway (keyed by
// cloud id) instead of the site host; they are identified by their email domain.
const (
	jiraCloudHostSuffix           = ".atlassian.net"
	jiraServiceAccountEmailDomain = "@serviceaccount.atlassian.com"
	jiraGatewayBaseURL            = "https://api.atlassian.com/ex/jira/"
)

// Default templates for the issue title and body. The body is rendered to
// markdown and then wrapped in the ADF status panel + deep-links by the notifier.
const (
	DefaultJiraSummaryTemplate = `[{{ .Status | toUpper }}{{ if eq .Status "firing" }}:{{ .Alerts.Firing | len }}{{ end }}] {{ .CommonLabels.alertname }}`

	DefaultJiraDescriptionTemplate = `{{ range .Alerts -}}
**Alert:** {{ .Labels.alertname }}{{ if .Labels.severity }} ({{ .Labels.severity }}){{ end }}
{{ if .Annotations.summary }}
**Summary:** {{ .Annotations.summary }}
{{ end }}{{ if .Annotations.description }}
**Description:** {{ .Annotations.description }}
{{ end }}
{{ end }}`
)

// JiraReceiverConfig is the SigNoz Jira receiver. Fields are declared explicitly
// instead of embedding upstream config.JiraConfig because that type's own
// UnmarshalYAML would reset our defaults and drop sibling fields on the yaml
// round-trip. Only Jira Cloud (v3/ADF) is supported, so api_url is derived from Site.
type JiraReceiverConfig struct {
	config.NotifierConfig `yaml:",inline"`

	Site              string                      `json:"site,omitempty" yaml:"site,omitempty"`
	Project           string                      `json:"project,omitempty" yaml:"project,omitempty"`
	IssueType         string                      `json:"issue_type,omitempty" yaml:"issue_type,omitempty"`
	Summary           string                      `json:"summary,omitempty" yaml:"summary,omitempty"`
	Description       string                      `json:"description,omitempty" yaml:"description,omitempty"`
	Priority          string                      `json:"priority,omitempty" yaml:"priority,omitempty"`
	Labels            []string                    `json:"labels,omitempty" yaml:"labels,omitempty"`
	ResolveTransition string                      `json:"resolve_transition,omitempty" yaml:"resolve_transition,omitempty"`
	ReopenTransition  string                      `json:"reopen_transition,omitempty" yaml:"reopen_transition,omitempty"`
	ReopenDuration    model.Duration              `json:"reopen_duration" yaml:"reopen_duration"`
	WontFixResolution string                      `json:"wont_fix_resolution,omitempty" yaml:"wont_fix_resolution,omitempty"`
	CustomFields      map[string]any              `json:"custom_fields,omitempty" yaml:"custom_fields,omitempty"`
	HTTPConfig        *commoncfg.HTTPClientConfig `json:"http_config,omitempty" yaml:"http_config,omitempty"`
	CloudID           string                      `json:"cloud_id,omitempty" yaml:"cloud_id,omitempty"` // CloudID is resolved from the site at save/test time for service accounts and
	// then read on every notification; empty for personal API tokens.
}

func (c *JiraReceiverConfig) UnmarshalYAML(unmarshal func(any) error) error {
	type plain JiraReceiverConfig
	if err := unmarshal((*plain)(c)); err != nil {
		return err
	}

	if c.ReopenDuration <= 0 {
		c.ReopenDuration = defaultJiraReopenDuration
	}
	// sub-minute windows truncate to 0 in the reopen JQL and silently disable
	// reopening, so reject them.
	if c.ReopenDuration < model.Duration(time.Minute) {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "jira reopen_duration must be at least 1m")
	}
	if c.Summary == "" {
		c.Summary = DefaultJiraSummaryTemplate
	}
	if c.Description == "" {
		c.Description = DefaultJiraDescriptionTemplate
	}

	site := strings.TrimRight(strings.TrimSpace(c.Site), "/")
	u, err := url.Parse(site)
	if site == "" || err != nil || u.Scheme != "https" || !strings.HasSuffix(strings.ToLower(u.Hostname()), jiraCloudHostSuffix) {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, fmt.Sprintf("jira site must be a Jira Cloud URL (https://<site>%s)", jiraCloudHostSuffix))
	}
	c.Site = site

	if c.Project == "" {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "jira project is required")
	}
	if c.IssueType == "" {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "jira issue_type is required")
	}
	if c.HTTPConfig == nil || c.HTTPConfig.BasicAuth == nil {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "jira requires basic auth (email + API token)")
	}
	return nil
}

// IsServiceAccount reports whether the basic-auth user is an Atlassian service
// account, identified by its email domain. Service accounts must go through the
// api.atlassian.com gateway; personal API tokens use the site host directly.
func (c *JiraReceiverConfig) IsServiceAccount() bool {
	if c.HTTPConfig == nil || c.HTTPConfig.BasicAuth == nil {
		return false
	}
	return strings.HasSuffix(strings.ToLower(c.HTTPConfig.BasicAuth.Username), jiraServiceAccountEmailDomain)
}

// APIBaseURL returns the Jira Cloud REST v3 base URL: the api.atlassian.com
// gateway (keyed by cloud id) for service accounts, else the site host.
func (c *JiraReceiverConfig) APIBaseURL() string {
	if c.CloudID != "" {
		return fmt.Sprintf("%s%s/rest/api/3", jiraGatewayBaseURL, c.CloudID)
	}
	return fmt.Sprintf("%s/rest/api/3", strings.TrimRight(c.Site, "/"))
}

// ResolveJiraCloudIDs fills the cloud id for Jira service-account configs so
// notifications address the api.atlassian.com gateway. Run it on save/test only;
// the resolved id is persisted and read on every notification.
func (r *Receiver) ResolveJiraCloudIDs(ctx context.Context, client *http.Client) error {
	for _, jc := range r.JiraConfigs {
		// cloud_id is server-resolved; ignore client-supplied values
		jc.CloudID = ""
		if jc.IsServiceAccount() {
			cloudID, err := ResolveCloudID(ctx, client, jc.Site)
			if err != nil {
				return err
			}
			jc.CloudID = cloudID
		}
	}
	return nil
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

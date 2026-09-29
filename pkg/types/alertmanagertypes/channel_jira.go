package alertmanagertypes

import (
	"fmt"
	"net/url"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/prometheus/alertmanager/config"
	commoncfg "github.com/prometheus/common/config"
	"github.com/prometheus/common/model"
)

type ChannelJiraConfig struct {
	SendResolved *bool `json:"sendResolved,omitempty"`
	// Site is the Jira Cloud base URL, https://<site>.atlassian.net. Only Jira
	// Cloud is supported; the REST base is derived from it.
	Site              string                       `json:"site" required:"true"`
	Project           string                       `json:"project" required:"true"`
	IssueType         string                       `json:"issueType" required:"true"`
	Summary           valuer.UnsetOrNonEmptyString `json:"summary"`
	Description       valuer.UnsetOrNonEmptyString `json:"description"`
	Priority          string                       `json:"priority"`
	Labels            []string                     `json:"labels,omitempty"`
	ResolveTransition string                       `json:"resolveTransition"`
	ReopenTransition  string                       `json:"reopenTransition"`
	ReopenDuration    valuer.UnsetOrNonEmptyString `json:"reopenDuration"`
	WontFixResolution string                       `json:"wontFixResolution"`
	CustomFields      map[string]any               `json:"customFields,omitempty"`

	Email    string `json:"email" required:"true"`
	APIToken string `json:"apiToken" required:"true" format:"password"`
}

func (c ChannelJiraConfig) Validate() error {
	for _, required := range []struct {
		value string
		field string
	}{
		{c.Site, "site"},
		{c.Project, "project"},
		{c.IssueType, "issueType"},
		{c.Email, "email"},
		{c.APIToken, "apiToken"},
	} {
		if required.value == "" {
			return errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "config.spec.%s is required for a jira channel", required.field)
		}
	}

	if !c.ReopenDuration.IsZero() {
		reopenDuration, err := model.ParseDuration(c.ReopenDuration.StringValue())
		if err != nil {
			return errors.WrapInvalidInputf(err, ErrCodeAlertmanagerChannelInvalid, "config.spec.reopenDuration %q is not a valid duration", c.ReopenDuration)
		}

		// A read reports the duration as model.Duration formats it, collapsing
		// "72h" into "3d", so a value that is not already in that form is rejected
		// rather than answered with one the caller never sent.
		if canonical := reopenDuration.String(); canonical != c.ReopenDuration.StringValue() {
			return errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "config.spec.reopenDuration %q must be written as %q", c.ReopenDuration, canonical)
		}
	}

	return nil
}

func (c ChannelJiraConfig) toUndefaultedReceiver(displayName string) (*Receiver, error) {
	// Seeded from upstream's default rather than a zero value: FollowRedirects
	// and EnableHTTP2 marshal unconditionally, so a zero value would persist them
	// as false and read back as a config ChannelJiraConfig cannot represent.
	httpConfig := commoncfg.DefaultHTTPClientConfig
	httpConfig.BasicAuth = &commoncfg.BasicAuth{
		Username: c.Email,
		Password: commoncfg.Secret(c.APIToken),
	}

	jira := &JiraReceiverConfig{
		// JiraReceiverConfig seeds no send_resolved of its own, so unset means off.
		NotifierConfig:    config.NotifierConfig{VSendResolved: resolveSendResolved(c.SendResolved, false)},
		Site:              c.Site,
		Project:           c.Project,
		IssueType:         c.IssueType,
		Summary:           c.Summary.StringValue(),
		Description:       c.Description.StringValue(),
		Priority:          c.Priority,
		Labels:            c.Labels,
		ResolveTransition: c.ResolveTransition,
		ReopenTransition:  c.ReopenTransition,
		WontFixResolution: c.WontFixResolution,
		CustomFields:      c.CustomFields,
		HTTPConfig:        &httpConfig,
	}

	if !c.ReopenDuration.IsZero() {
		reopenDuration, err := model.ParseDuration(c.ReopenDuration.StringValue())
		if err != nil {
			return nil, errors.WrapInvalidInputf(err, ErrCodeAlertmanagerChannelInvalid, "parse reopenDuration %q", c.ReopenDuration)
		}
		jira.ReopenDuration = reopenDuration
	}

	return &Receiver{
		Receiver:    &config.Receiver{Name: displayName},
		JiraConfigs: []*JiraReceiverConfig{jira},
	}, nil
}

func newChannelJiraConfigFromReceiver(name string, receiver *Receiver) (ChannelSpec, error) {
	jira := receiver.JiraConfigs[0]
	sendResolved := jira.VSendResolved

	if err := rejectUnsupportedHTTPConfig(name, jira.HTTPConfig); err != nil {
		return nil, err
	}

	if jira.HTTPConfig != nil && jira.HTTPConfig.Authorization != nil {
		return nil, errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "channel %q sets http_config.authorization, which is not supported", name)
	}

	if err := rejectHTTPBasicAuthBeyondPassword(name, jira.HTTPConfig); err != nil {
		return nil, err
	}

	spec := &ChannelJiraConfig{
		SendResolved:      &sendResolved,
		Site:              jira.Site,
		Project:           jira.Project,
		IssueType:         jira.IssueType,
		Summary:           valuer.UnsetIfEmpty(jira.Summary),
		Description:       valuer.UnsetIfEmpty(jira.Description),
		Priority:          jira.Priority,
		Labels:            jira.Labels,
		ResolveTransition: jira.ResolveTransition,
		ReopenTransition:  jira.ReopenTransition,
		ReopenDuration:    valuer.UnsetIfEmpty(jira.ReopenDuration.String()),
		WontFixResolution: jira.WontFixResolution,
		CustomFields:      jira.CustomFields,
	}

	if jira.HTTPConfig != nil && jira.HTTPConfig.BasicAuth != nil {
		spec.Email = jira.HTTPConfig.BasicAuth.Username
		spec.APIToken = string(jira.HTTPConfig.BasicAuth.Password)
	}

	return spec, nil
}

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

	// Values are stored and sent exactly as configured, so anything that is
	// not already canonical is rejected rather than rewritten.
	if c.Site != strings.TrimSpace(c.Site) {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "jira site must not have leading or trailing whitespace")
	}
	u, err := url.Parse(c.Site)
	if c.Site == "" || err != nil || u.Scheme != "https" || !strings.HasSuffix(strings.ToLower(u.Hostname()), jiraCloudHostSuffix) {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, fmt.Sprintf("jira site must be a Jira Cloud URL (https://<site>%s)", jiraCloudHostSuffix))
	}
	if strings.HasSuffix(c.Site, "/") {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "jira site must not end with a trailing slash")
	}

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
// gateway when a cloud id is given (service accounts), else the site host.
func (c *JiraReceiverConfig) APIBaseURL(cloudID string) string {
	if cloudID != "" {
		return fmt.Sprintf("%s%s/rest/api/3", jiraGatewayBaseURL, cloudID)
	}
	return fmt.Sprintf("%s/rest/api/3", c.Site)
}

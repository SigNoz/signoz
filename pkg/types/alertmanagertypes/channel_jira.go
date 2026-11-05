package alertmanagertypes

import (
	"fmt"
	"slices"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/prometheus/alertmanager/config"
	commoncfg "github.com/prometheus/common/config"
	"github.com/prometheus/common/model"
	"github.com/swaggest/jsonschema-go"
)

const defaultJiraReopenDuration = model.Duration(3 * 24 * time.Hour)

// Service accounts authenticate against the api.atlassian.com gateway (keyed by
// cloud id) instead of the site host; they are identified by their email domain.
const (
	jiraServiceAccountEmailDomain = "@serviceaccount.atlassian.com"
	jiraGatewayBaseURL            = "https://api.atlassian.com/ex/jira/"
	jiraBearerAuthorizationType   = "Bearer"
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

// JiraDeployment selects the Jira edition a channel talks to: Atlassian-hosted
// Cloud (v3 API, email + API token) or a self-hosted Server / Data Center
// instance (v2 API, personal access token as a Bearer header).
type JiraDeployment struct {
	valuer.UnsetOrNonEmptyString
}

var (
	JiraDeploymentCloud      = JiraDeployment{valuer.MustNewUnsetOrNonEmptyString("cloud")}
	JiraDeploymentSelfHosted = JiraDeployment{valuer.MustNewUnsetOrNonEmptyString("selfhosted")}

	jiraDeployments = []JiraDeployment{JiraDeploymentCloud, JiraDeploymentSelfHosted}
)

func (JiraDeployment) Enum() []any {
	out := make([]any, 0, len(jiraDeployments))
	for _, deployment := range jiraDeployments {
		out = append(out, deployment)
	}
	return out
}

func (d JiraDeployment) IsValid() bool {
	return slices.Contains(jiraDeployments, d)
}

type ChannelJiraConfig struct {
	SendResolved      *bool                        `json:"sendResolved,omitempty" description:"Also notify when the alert resolves. Defaults to false."`
	Deployment        JiraDeployment               `json:"deployment,omitzero" description:"The Jira edition: cloud for an Atlassian-hosted site, selfhosted for Jira Server or Data Center. Defaults to cloud."`
	Site              string                       `json:"site" required:"true" description:"The base URL of the Jira site, for example https://example.atlassian.net or https://jira.example.com."`
	Project           string                       `json:"project" required:"true" description:"The key of the project issues are created in."`
	IssueType         string                       `json:"issueType" required:"true" description:"The issue type name, such as Bug."`
	Summary           valuer.UnsetOrNonEmptyString `json:"summary,omitzero" description:"Alertmanager template for the issue summary; defaults to the SigNoz Jira default."`
	Description       valuer.UnsetOrNonEmptyString `json:"description,omitzero" description:"Alertmanager template for the issue description, rendered as markdown; defaults to the SigNoz Jira default."`
	Priority          string                       `json:"priority" description:"The priority name assigned to new issues."`
	Labels            []string                     `json:"labels,omitzero" description:"Labels added to every issue."`
	ResolveTransition string                       `json:"resolveTransition" description:"The transition applied to the issue when the alert resolves."`
	ReopenTransition  string                       `json:"reopenTransition" description:"The transition applied when an alert fires again on a resolved issue."`
	ReopenDuration    valuer.UnsetOrNonEmptyString `json:"reopenDuration,omitzero" description:"How long after resolution a firing alert reopens the issue instead of creating a new one, as a Prometheus duration in canonical form such as 3d; defaults to 3d."`
	WontFixResolution string                       `json:"wontFixResolution" description:"The resolution name that stops an issue from being reopened."`
	CustomFields      map[string]any               `json:"customFields,omitzero" description:"Extra issue fields keyed by Jira field ID. Stored, but not currently included in the issue Jira receives."`

	Email    string `json:"email,omitempty" description:"The Atlassian account email used for basic auth. Required when deployment is cloud."`
	APIToken string `json:"apiToken,omitempty" format:"password" description:"The Atlassian API token paired with email. Required when deployment is cloud. A secret; returned by create, update and fetch by ID, never by list."`
	PAT      string `json:"pat,omitempty" format:"password" description:"The Jira personal access token, sent as a Bearer header. Required when deployment is selfhosted. A secret; returned by create, update and fetch by ID, never by list."`
}

var (
	_ jsonschema.OneOfExposer = ChannelJiraConfig{}
	_ jsonschema.Preparer     = ChannelJiraConfig{}
)

// channelJiraSharedConfig lists the fields both deployments accept, for the
// schema variants only.
type channelJiraSharedConfig struct {
	SendResolved      *bool                        `json:"sendResolved,omitempty" description:"Also notify when the alert resolves. Defaults to false."`
	Site              string                       `json:"site" required:"true" description:"The base URL of the Jira site, for example https://example.atlassian.net or https://jira.example.com."`
	Project           string                       `json:"project" required:"true" description:"The key of the project issues are created in."`
	IssueType         string                       `json:"issueType" required:"true" description:"The issue type name, such as Bug."`
	Summary           valuer.UnsetOrNonEmptyString `json:"summary,omitzero" description:"Alertmanager template for the issue summary; defaults to the SigNoz Jira default."`
	Description       valuer.UnsetOrNonEmptyString `json:"description,omitzero" description:"Alertmanager template for the issue description, rendered as markdown; defaults to the SigNoz Jira default."`
	Priority          string                       `json:"priority" description:"The priority name assigned to new issues."`
	Labels            []string                     `json:"labels,omitzero" description:"Labels added to every issue."`
	ResolveTransition string                       `json:"resolveTransition" description:"The transition applied to the issue when the alert resolves."`
	ReopenTransition  string                       `json:"reopenTransition" description:"The transition applied when an alert fires again on a resolved issue."`
	ReopenDuration    valuer.UnsetOrNonEmptyString `json:"reopenDuration,omitzero" description:"How long after resolution a firing alert reopens the issue instead of creating a new one, as a Prometheus duration in canonical form such as 3d; defaults to 3d."`
	WontFixResolution string                       `json:"wontFixResolution" description:"The resolution name that stops an issue from being reopened."`
	CustomFields      map[string]any               `json:"customFields,omitzero" description:"Extra issue fields keyed by Jira field ID. Stored, but not currently included in the issue Jira receives."`
}

type channelJiraCloudConfig struct {
	Deployment JiraDeployment `json:"deployment" required:"true" description:"cloud: an Atlassian-hosted site."`
	channelJiraSharedConfig
	Email    string `json:"email" required:"true" description:"The Atlassian account email used for basic auth."`
	APIToken string `json:"apiToken" required:"true" format:"password" description:"The Atlassian API token paired with email. A secret; returned by create, update and fetch by ID, never by list."`
}

type channelJiraSelfHostedConfig struct {
	Deployment JiraDeployment `json:"deployment" required:"true" description:"selfhosted: Jira Data Center or Server."`
	channelJiraSharedConfig
	PAT string `json:"pat" required:"true" format:"password" description:"The Jira personal access token, sent as a Bearer header. A secret; returned by create, update and fetch by ID, never by list."`
}

func (ChannelJiraConfig) JSONSchemaOneOf() []any {
	return []any{channelJiraCloudConfig{}, channelJiraSelfHostedConfig{}}
}

func (ChannelJiraConfig) PrepareJSONSchema(schema *jsonschema.Schema) error {
	if schema.ExtraProperties == nil {
		schema.ExtraProperties = map[string]any{}
	}

	schema.ExtraProperties["x-signoz-discriminator"] = map[string]any{
		"propertyName": "deployment",
		"mapping": map[string]string{
			JiraDeploymentCloud.StringValue():      "#/components/schemas/AlertmanagertypesChannelJiraCloudConfig",
			JiraDeploymentSelfHosted.StringValue(): "#/components/schemas/AlertmanagertypesChannelJiraSelfHostedConfig",
		},
	}

	return nil
}

// UnmarshalJSON seeds send_resolved off, as JiraReceiverConfig does.
func (c *ChannelJiraConfig) UnmarshalJSON(data []byte) error {
	type alias ChannelJiraConfig
	if err := decodeStrict(data, (*alias)(c)); err != nil {
		return err
	}

	fillSendResolved(&c.SendResolved, false)
	c.Deployment.SetIfUnset(JiraDeploymentCloud.StringValue())
	c.Summary.SetIfUnset(DefaultJiraSummaryTemplate)
	c.Description.SetIfUnset(DefaultJiraDescriptionTemplate)
	c.ReopenDuration.SetIfUnset(defaultJiraReopenDuration.String())

	return c.Validate()
}

func (c ChannelJiraConfig) Validate() error {
	if !c.Deployment.IsZero() && !c.Deployment.IsValid() {
		return errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "config.spec.deployment %q is not supported; allowed values: cloud, selfhosted", c.Deployment.StringValue())
	}

	for _, required := range []struct {
		value string
		field string
	}{
		{c.Site, "site"},
		{c.Project, "project"},
		{c.IssueType, "issueType"},
	} {
		if required.value == "" {
			return errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "config.spec.%s is required for a jira channel", required.field)
		}
	}

	if err := c.validateCredentials(); err != nil {
		return err
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

func (c ChannelJiraConfig) validateCredentials() error {
	if c.Deployment == JiraDeploymentSelfHosted {
		if c.PAT == "" {
			return errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "config.spec.pat is required for a self-hosted jira channel")
		}
		if c.Email != "" || c.APIToken != "" {
			return errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "config.spec.email and config.spec.apiToken are not used by a self-hosted jira channel; set config.spec.pat only")
		}
		return nil
	}

	for _, required := range []struct {
		value string
		field string
	}{
		{c.Email, "email"},
		{c.APIToken, "apiToken"},
	} {
		if required.value == "" {
			return errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "config.spec.%s is required for a jira cloud channel", required.field)
		}
	}
	if c.PAT != "" {
		return errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "config.spec.pat is not used by a jira cloud channel; set config.spec.email and config.spec.apiToken only")
	}
	return nil
}

// deployment reads a spec assembled in code without the field as cloud, the
// same default UnmarshalJSON fills.
func (c ChannelJiraConfig) deployment() JiraDeployment {
	if c.Deployment.IsZero() {
		return JiraDeploymentCloud
	}
	return c.Deployment
}

func (c ChannelJiraConfig) toUndefaultedReceiver(displayName string) (*Receiver, error) {
	// Seeded from upstream's default rather than a zero value: FollowRedirects
	// and EnableHTTP2 marshal unconditionally, so a zero value would persist them
	// as false and read back as a config ChannelJiraConfig cannot represent.
	httpConfig := commoncfg.DefaultHTTPClientConfig
	if c.deployment() == JiraDeploymentSelfHosted {
		httpConfig.Authorization = &commoncfg.Authorization{
			Type:        jiraBearerAuthorizationType,
			Credentials: commoncfg.Secret(c.PAT),
		}
	} else {
		httpConfig.BasicAuth = &commoncfg.BasicAuth{
			Username: c.Email,
			Password: commoncfg.Secret(c.APIToken),
		}
	}

	jira := &JiraReceiverConfig{
		// JiraReceiverConfig seeds no send_resolved of its own, so unset means off.
		NotifierConfig:    config.NotifierConfig{VSendResolved: resolveSendResolved(c.SendResolved, false)},
		Deployment:        c.deployment(),
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

	if err := rejectHTTPBasicAuthBeyondPassword(name, jira.HTTPConfig); err != nil {
		return nil, err
	}

	spec := &ChannelJiraConfig{
		SendResolved:      &sendResolved,
		Deployment:        jira.Deployment,
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
	spec.Deployment.SetIfUnset(JiraDeploymentCloud.StringValue())

	if jira.HTTPConfig == nil {
		return spec, nil
	}

	if spec.Deployment == JiraDeploymentSelfHosted {
		if jira.HTTPConfig.BasicAuth != nil {
			return nil, errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "channel %q is a self-hosted jira channel but sets http_config.basic_auth, which is not supported", name)
		}
		if authorization := jira.HTTPConfig.Authorization; authorization != nil {
			if !strings.EqualFold(authorization.Type, jiraBearerAuthorizationType) || authorization.CredentialsFile != "" || authorization.CredentialsRef != "" {
				return nil, errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "channel %q must set http_config.authorization with type Bearer and inline credentials", name)
			}
			spec.PAT = string(authorization.Credentials)
		}
		return spec, nil
	}

	if jira.HTTPConfig.Authorization != nil {
		return nil, errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "channel %q sets http_config.authorization, which is not supported", name)
	}
	if jira.HTTPConfig.BasicAuth != nil {
		spec.Email = jira.HTTPConfig.BasicAuth.Username
		spec.APIToken = string(jira.HTTPConfig.BasicAuth.Password)
	}

	return spec, nil
}

// JiraReceiverConfig is the SigNoz Jira receiver. Fields are declared explicitly
// instead of embedding upstream config.JiraConfig because that type's own
// UnmarshalYAML would reset our defaults and drop sibling fields on the yaml
// round-trip. Deployment picks the API: Cloud (v3/ADF, api_url derived from
// Site or the gateway) or self-hosted (v2/wiki markup on Site).
type JiraReceiverConfig struct {
	config.NotifierConfig `yaml:",inline"`

	Deployment        JiraDeployment              `json:"deployment,omitzero" yaml:"deployment,omitempty" description:"The Jira edition, cloud or selfhosted; defaults to cloud."`
	Site              string                      `json:"site,omitempty" yaml:"site,omitempty" description:"The Jira base URL."`
	Project           string                      `json:"project,omitempty" yaml:"project,omitempty" description:"The key of the project issues are created in."`
	IssueType         string                      `json:"issue_type,omitempty" yaml:"issue_type,omitempty" description:"The issue type name."`
	Summary           string                      `json:"summary,omitempty" yaml:"summary,omitempty" description:"Alertmanager template for the issue summary."`
	Description       string                      `json:"description,omitempty" yaml:"description,omitempty" description:"Alertmanager template for the issue description."`
	Priority          string                      `json:"priority,omitempty" yaml:"priority,omitempty" description:"The priority name assigned to new issues."`
	Labels            []string                    `json:"labels,omitempty" yaml:"labels,omitempty" description:"Labels added to every issue."`
	ResolveTransition string                      `json:"resolve_transition,omitempty" yaml:"resolve_transition,omitempty" description:"The transition applied when the alert resolves."`
	ReopenTransition  string                      `json:"reopen_transition,omitempty" yaml:"reopen_transition,omitempty" description:"The transition applied when an alert fires again on a resolved issue."`
	ReopenDuration    model.Duration              `json:"reopen_duration" yaml:"reopen_duration" description:"How long after resolution a firing alert reopens the issue; a Prometheus duration, at least 1m."`
	WontFixResolution string                      `json:"wont_fix_resolution,omitempty" yaml:"wont_fix_resolution,omitempty" description:"The resolution name that stops an issue from being reopened."`
	CustomFields      map[string]any              `json:"custom_fields,omitempty" yaml:"custom_fields,omitempty" description:"Extra issue fields keyed by Jira field ID. Stored, but not currently included in the issue Jira receives."`
	HTTPConfig        *commoncfg.HTTPClientConfig `json:"http_config,omitempty" yaml:"http_config,omitempty" description:"HTTP client settings; basic auth carries the account email and API token on cloud, authorization carries the Bearer personal access token on self-hosted."`
}

func (c *JiraReceiverConfig) UnmarshalYAML(unmarshal func(any) error) error {
	type plain JiraReceiverConfig
	if err := unmarshal((*plain)(c)); err != nil {
		return err
	}

	c.Deployment.SetIfUnset(JiraDeploymentCloud.StringValue())
	if !c.Deployment.IsValid() {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "jira deployment %q is not supported; allowed values: cloud, selfhosted", c.Deployment.StringValue())
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

	if c.Site == "" {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "jira site is required")
	}
	if c.Project == "" {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "jira project is required")
	}
	if c.IssueType == "" {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "jira issue_type is required")
	}
	if c.IsSelfHosted() {
		if c.HTTPConfig == nil || c.HTTPConfig.Authorization == nil || c.HTTPConfig.Authorization.Credentials == "" {
			return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "self-hosted jira requires http_config.authorization with a Bearer personal access token")
		}
		if c.HTTPConfig.BasicAuth != nil {
			return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "self-hosted jira takes a personal access token, not basic auth")
		}
		return nil
	}
	if c.HTTPConfig == nil || c.HTTPConfig.BasicAuth == nil {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "jira requires basic auth (email + API token)")
	}
	return nil
}

func (c *JiraReceiverConfig) IsSelfHosted() bool {
	return c.Deployment == JiraDeploymentSelfHosted
}

// IsCloudServiceAccount reports whether this is a Jira Cloud channel whose
// basic-auth user is an Atlassian service account, identified by its email
// domain. Those must go through the api.atlassian.com gateway; personal API
// tokens and self-hosted sites use the site host directly.
func (c *JiraReceiverConfig) IsCloudServiceAccount() bool {
	if c.IsSelfHosted() || c.HTTPConfig == nil || c.HTTPConfig.BasicAuth == nil {
		return false
	}
	return strings.HasSuffix(strings.ToLower(c.HTTPConfig.BasicAuth.Username), jiraServiceAccountEmailDomain)
}

// APIBaseURL returns the REST base URL: v2 on the site host for self-hosted,
// else Jira Cloud v3 on the api.atlassian.com gateway when a cloud id is given
// (service accounts) or on the site host.
func (c *JiraReceiverConfig) APIBaseURL(cloudID string) string {
	if c.IsSelfHosted() {
		return fmt.Sprintf("%s/rest/api/2", c.Site)
	}
	if cloudID != "" {
		return fmt.Sprintf("%s%s/rest/api/3", jiraGatewayBaseURL, cloudID)
	}
	return fmt.Sprintf("%s/rest/api/3", c.Site)
}

// SearchPath returns the issue search endpoint under APIBaseURL: the v2 /search
// on self-hosted, the Cloud-only /search/jql otherwise.
func (c *JiraReceiverConfig) SearchPath() string {
	if c.IsSelfHosted() {
		return "/search"
	}
	return "/search/jql"
}

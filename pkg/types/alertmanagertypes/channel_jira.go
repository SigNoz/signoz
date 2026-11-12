package alertmanagertypes

import (
	"encoding/json"
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
	Deployment        JiraDeployment               `json:"deployment,omitzero" required:"true" description:"The Jira edition: cloud for an Atlassian-hosted site, selfhosted for Jira Server or Data Center."`
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

	Auth ChannelJiraAuth `json:"auth" required:"true" description:"The credentials: email and apiToken when deployment is cloud, pat when deployment is selfhosted."`
}

type JiraAuth interface {
	deployment() JiraDeployment
	validate() error
	fillHTTPConfig(httpConfig *commoncfg.HTTPClientConfig)
}

// ChannelJiraAuth wraps the JiraAuth value because the OpenAPI reflector
// renders an interface-typed field as an empty component.
type ChannelJiraAuth struct {
	JiraAuth
}

var (
	_ jsonschema.Preparer = ChannelJiraAuth{}
	_ json.Marshaler      = ChannelJiraAuth{}
)

// One flat object, because deployment sits outside auth and cannot discriminate a oneOf.
func (ChannelJiraAuth) PrepareJSONSchema(schema *jsonschema.Schema) error {
	email := jsonschema.Schema{}
	email.WithType(jsonschema.String.Type())
	email.WithDescription("The Atlassian account email used for basic auth. Required when deployment is cloud.")

	apiToken := jsonschema.Schema{}
	apiToken.WithType(jsonschema.String.Type())
	apiToken.WithFormat("password")
	apiToken.WithDescription("The Atlassian API token paired with email. Required when deployment is cloud. A secret; returned by create, update and fetch by ID, never by list.")

	pat := jsonschema.Schema{}
	pat.WithType(jsonschema.String.Type())
	pat.WithFormat("password")
	pat.WithDescription("The Jira personal access token, sent as a Bearer header. Required when deployment is selfhosted. A secret; returned by create, update and fetch by ID, never by list.")

	schema.Properties = nil
	schema.Required = nil
	schema.WithPropertiesItem("email", email.ToSchemaOrBool())
	schema.WithPropertiesItem("apiToken", apiToken.ToSchemaOrBool())
	schema.WithPropertiesItem("pat", pat.ToSchemaOrBool())
	return nil
}

func (a ChannelJiraAuth) MarshalJSON() ([]byte, error) {
	if a.JiraAuth == nil {
		return []byte("null"), nil
	}
	return json.Marshal(a.JiraAuth)
}

type ChannelJiraCloudAuth struct {
	Email    string `json:"email"`
	APIToken string `json:"apiToken"`
}

func (ChannelJiraCloudAuth) deployment() JiraDeployment {
	return JiraDeploymentCloud
}

func (a ChannelJiraCloudAuth) validate() error {
	if a.Email == "" {
		return errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "config.spec.auth.email is required for a jira cloud channel")
	}
	if a.APIToken == "" {
		return errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "config.spec.auth.apiToken is required for a jira cloud channel")
	}
	return nil
}

func (a ChannelJiraCloudAuth) fillHTTPConfig(httpConfig *commoncfg.HTTPClientConfig) {
	httpConfig.BasicAuth = &commoncfg.BasicAuth{
		Username: a.Email,
		Password: commoncfg.Secret(a.APIToken),
	}
}

type ChannelJiraSelfHostedAuth struct {
	PAT string `json:"pat"`
}

func (ChannelJiraSelfHostedAuth) deployment() JiraDeployment {
	return JiraDeploymentSelfHosted
}

func (a ChannelJiraSelfHostedAuth) validate() error {
	if a.PAT == "" {
		return errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "config.spec.auth.pat is required for a self-hosted jira channel")
	}
	return nil
}

func (a ChannelJiraSelfHostedAuth) fillHTTPConfig(httpConfig *commoncfg.HTTPClientConfig) {
	httpConfig.Authorization = &commoncfg.Authorization{
		Type:        jiraBearerAuthorizationType,
		Credentials: commoncfg.Secret(a.PAT),
	}
}

// UnmarshalJSON seeds send_resolved off, as JiraReceiverConfig does. The auth
// bytes are held back until deployment is known, which picks their type.
func (c *ChannelJiraConfig) UnmarshalJSON(data []byte) error {
	type alias ChannelJiraConfig
	envelope := struct {
		*alias
		Auth json.RawMessage `json:"auth"`
	}{alias: (*alias)(c)}
	if err := decodeStrict(data, &envelope); err != nil {
		return err
	}

	fillSendResolved(&c.SendResolved, false)
	c.Summary.SetIfUnset(DefaultJiraSummaryTemplate)
	c.Description.SetIfUnset(DefaultJiraDescriptionTemplate)
	c.ReopenDuration.SetIfUnset(defaultJiraReopenDuration.String())

	if err := c.validateDeployment(); err != nil {
		return err
	}
	auth, err := decodeJiraAuth(c.Deployment, envelope.Auth)
	if err != nil {
		return err
	}
	c.Auth = ChannelJiraAuth{JiraAuth: auth}

	return c.Validate()
}

func (c ChannelJiraConfig) Validate() error {
	if err := c.validateDeployment(); err != nil {
		return err
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

	if c.Auth.JiraAuth == nil {
		return errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "config.spec.auth is required for a jira channel")
	}
	if c.Auth.deployment() != c.Deployment {
		return errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "config.spec.auth does not match deployment %q", c.Deployment.StringValue())
	}
	if err := c.Auth.validate(); err != nil {
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

func (c ChannelJiraConfig) validateDeployment() error {
	if c.Deployment.IsZero() {
		return errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "config.spec.deployment is required for a jira channel")
	}
	if !c.Deployment.IsValid() {
		return errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "config.spec.deployment %q is not supported; allowed values: cloud, selfhosted", c.Deployment.StringValue())
	}
	return nil
}

func (c ChannelJiraConfig) toUndefaultedReceiver(displayName string) (*Receiver, error) {
	// Seeded from upstream's default rather than a zero value: FollowRedirects
	// and EnableHTTP2 marshal unconditionally, so a zero value would persist them
	// as false and read back as a config ChannelJiraConfig cannot represent.
	httpConfig := commoncfg.DefaultHTTPClientConfig
	if c.Auth.JiraAuth == nil {
		return nil, errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "config.spec.auth is required for a jira channel")
	}
	c.Auth.fillHTTPConfig(&httpConfig)

	jira := &JiraReceiverConfig{
		// JiraReceiverConfig seeds no send_resolved of its own, so unset means off.
		NotifierConfig:    config.NotifierConfig{VSendResolved: resolveSendResolved(c.SendResolved, false)},
		Deployment:        c.Deployment,
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
			spec.Auth = ChannelJiraAuth{JiraAuth: ChannelJiraSelfHostedAuth{PAT: string(authorization.Credentials)}}
		}
		return spec, nil
	}

	if jira.HTTPConfig.Authorization != nil {
		return nil, errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "channel %q sets http_config.authorization, which is not supported", name)
	}
	if jira.HTTPConfig.BasicAuth != nil {
		spec.Auth = ChannelJiraAuth{JiraAuth: ChannelJiraCloudAuth{Email: jira.HTTPConfig.BasicAuth.Username, APIToken: string(jira.HTTPConfig.BasicAuth.Password)}}
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

func decodeJiraAuth(deployment JiraDeployment, data json.RawMessage) (JiraAuth, error) {
	if len(data) == 0 || string(data) == "null" {
		return nil, errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "config.spec.auth is required for a jira channel")
	}

	var auth JiraAuth
	var err error
	switch deployment {
	case JiraDeploymentSelfHosted:
		var selfHosted ChannelJiraSelfHostedAuth
		err = decodeStrict(data, &selfHosted)
		auth = selfHosted
	default:
		var cloud ChannelJiraCloudAuth
		err = decodeStrict(data, &cloud)
		auth = cloud
	}
	if err != nil {
		return nil, errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "config.spec.auth for a %s jira channel: %s", deployment.StringValue(), err.Error())
	}
	return auth, nil
}

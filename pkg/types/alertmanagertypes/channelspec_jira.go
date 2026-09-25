package alertmanagertypes

import (
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
	Summary           valuer.UnsetOrNonEmptyString `json:"summary,omitzero"`
	Description       valuer.UnsetOrNonEmptyString `json:"description,omitzero"`
	Priority          string                       `json:"priority"`
	Labels            []string                     `json:"labels,omitzero" nullable:"false"`
	ResolveTransition string                       `json:"resolveTransition"`
	ReopenTransition  string                       `json:"reopenTransition"`
	ReopenDuration    valuer.UnsetOrNonEmptyString `json:"reopenDuration,omitzero"`
	WontFixResolution string                       `json:"wontFixResolution"`
	CustomFields      map[string]any               `json:"customFields,omitzero" nullable:"false"`

	Email    string `json:"email" required:"true"`
	APIToken string `json:"apiToken" required:"true" format:"password"`
}

// UnmarshalJSON seeds send_resolved off, as JiraReceiverConfig does.
func (c *ChannelJiraConfig) UnmarshalJSON(data []byte) error {
	type alias ChannelJiraConfig
	if err := decodeStrict(data, (*alias)(c)); err != nil {
		return err
	}

	fillSendResolved(&c.SendResolved, false)
	c.Summary.SetIfUnset(DefaultJiraSummaryTemplate)
	c.Description.SetIfUnset(DefaultJiraDescriptionTemplate)
	c.ReopenDuration.SetIfUnset(defaultJiraReopenDuration.String())

	return c.Validate()
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

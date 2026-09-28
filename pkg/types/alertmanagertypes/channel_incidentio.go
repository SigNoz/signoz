package alertmanagertypes

import (
	"fmt"
	"net/url"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/prometheus/alertmanager/config"
	commoncfg "github.com/prometheus/common/config"
)

type ChannelIncidentIOConfig struct {
	SendResolved *bool                        `json:"sendResolved,omitempty"`
	URL          string                       `json:"url" required:"true"`
	Token        string                       `json:"token" required:"true" format:"password"`
	Title        valuer.UnsetOrNonEmptyString `json:"title,omitzero"`
	Description  valuer.UnsetOrNonEmptyString `json:"description,omitzero"`
	Metadata     map[string]string            `json:"metadata,omitzero"`
}

func (c *ChannelIncidentIOConfig) UnmarshalJSON(data []byte) error {
	type alias ChannelIncidentIOConfig
	if err := decodeStrict(data, (*alias)(c)); err != nil {
		return err
	}

	fillSendResolved(&c.SendResolved, DefaultIncidentIOReceiverConfig.VSendResolved)
	c.Title.SetIfUnset(DefaultIncidentIOReceiverConfig.Title)
	c.Description.SetIfUnset(DefaultIncidentIOReceiverConfig.Description)

	return c.Validate()
}

func (c ChannelIncidentIOConfig) Validate() error {
	if c.URL == "" {
		return errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "config.spec.url is required for an incidentio channel")
	}

	if c.Token == "" {
		return errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "config.spec.token is required for an incidentio channel")
	}

	return nil
}

func (c ChannelIncidentIOConfig) toUndefaultedReceiver(displayName string) (*Receiver, error) {
	return &Receiver{
		Receiver: &config.Receiver{Name: displayName},
		IncidentIOConfigs: []*IncidentIOReceiverConfig{{
			NotifierConfig: config.NotifierConfig{VSendResolved: resolveSendResolved(c.SendResolved, DefaultIncidentIOReceiverConfig.VSendResolved)},
			URL:            c.URL,
			Token:          config.Secret(c.Token),
			Title:          c.Title.StringValue(),
			Description:    c.Description.StringValue(),
			Metadata:       c.Metadata,
		}},
	}, nil
}

func newChannelIncidentIOConfigFromReceiver(name string, receiver *Receiver) (ChannelSpec, error) {
	incidentio := receiver.IncidentIOConfigs[0]
	sendResolved := incidentio.VSendResolved

	if err := rejectAnyHTTPAuth(name, incidentio.HTTPConfig); err != nil {
		return nil, err
	}

	return &ChannelIncidentIOConfig{
		SendResolved: &sendResolved,
		URL:          incidentio.URL,
		Token:        string(incidentio.Token),
		Title:        valuer.UnsetIfEmpty(incidentio.Title),
		Description:  valuer.UnsetIfEmpty(incidentio.Description),
		Metadata:     incidentio.Metadata,
	}, nil
}

// incidentIOEventsPathPrefix is the path of incident.io's HTTP alert source
// endpoint (Alert Events V2 API). The full URL is per-source:
// https://api.incident.io/v2/alert_events/http/<source_config_id>.
const incidentIOEventsPathPrefix = "/v2/alert_events/http/"

// The description is markdown; incident.io renders it natively. The templates
// mirror Google Chat / Jira / JSM for a consistent default across channels.
const (
	DefaultIncidentIOTitleTemplate = `[{{ .Status | toUpper }}{{ if eq .Status "firing" }}:{{ .Alerts.Firing | len }}{{ end }}] {{ .CommonLabels.alertname }}`

	DefaultIncidentIODescriptionTemplate = `{{ range .Alerts -}}
**Alert:** {{ .Labels.alertname }}{{ if .Labels.severity }} ({{ .Labels.severity }}){{ end }}

{{ if .Annotations.summary }}**Summary:** {{ .Annotations.summary }}

{{ end }}{{ if .Annotations.description }}**Description:** {{ .Annotations.description }}

{{ end }}{{ if .GeneratorURL }}[View in SigNoz]({{ .GeneratorURL }})

{{ end }}{{ if .Annotations.related_logs }}[View related logs]({{ .Annotations.related_logs }})

{{ end }}{{ if .Annotations.related_traces }}[View related traces]({{ .Annotations.related_traces }})

{{ end }}{{ end }}`
)

// IncidentIOReceiverConfig is the SigNoz incident.io receiver, backed by an
// incident.io HTTP alert source. URL is the per-source alert events endpoint
// and Token its secret, both copied from the source's setup page.
type IncidentIOReceiverConfig struct {
	config.NotifierConfig `yaml:",inline" json:",inline"`

	HTTPConfig *commoncfg.HTTPClientConfig `yaml:"http_config,omitempty" json:"http_config,omitempty"`

	URL         string        `yaml:"url,omitempty" json:"url,omitempty"`
	Token       config.Secret `yaml:"token,omitempty" json:"token,omitempty"`
	Title       string        `yaml:"title,omitempty" json:"title,omitempty"`
	Description string        `yaml:"description,omitempty" json:"description,omitempty"`
	// Metadata is merged into the event's metadata on top of the group's common
	// labels (channel wins on key clash). Values are template-expanded.
	Metadata map[string]string `yaml:"metadata,omitempty" json:"metadata,omitempty"`
}

// send_resolved has no omitempty upstream, so a var default here is overwritten
// by the yaml round-trip to the request value (false when omitted); the UI sends
// it explicitly, defaulted on, so incident.io alerts resolve with the rule.
var DefaultIncidentIOReceiverConfig = IncidentIOReceiverConfig{
	NotifierConfig: config.NotifierConfig{
		VSendResolved: false,
	},
	Title:       DefaultIncidentIOTitleTemplate,
	Description: DefaultIncidentIODescriptionTemplate,
}

func (c *IncidentIOReceiverConfig) UnmarshalYAML(unmarshal func(any) error) error {
	*c = DefaultIncidentIOReceiverConfig
	type plain IncidentIOReceiverConfig
	if err := unmarshal((*plain)(c)); err != nil {
		return err
	}

	if c.Title == "" {
		c.Title = DefaultIncidentIOTitleTemplate
	}
	if c.Description == "" {
		c.Description = DefaultIncidentIODescriptionTemplate
	}

	// Values are stored and sent exactly as configured, so anything that is
	// not already canonical is rejected rather than rewritten.
	if c.URL != strings.TrimSpace(c.URL) {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "incidentio url must not have leading or trailing whitespace")
	}
	u, err := url.Parse(c.URL)
	if c.URL == "" || err != nil || u.Scheme != "https" || u.Host == "" ||
		!strings.Contains(u.Path, incidentIOEventsPathPrefix) ||
		strings.HasSuffix(u.Path, incidentIOEventsPathPrefix) {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, fmt.Sprintf("incidentio url must be an alert events URL (https://api.incident.io%s<source_config_id>)", incidentIOEventsPathPrefix))
	}
	if strings.HasSuffix(c.URL, "/") {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "incidentio url must not end with a trailing slash")
	}

	token := string(c.Token)
	if token == "" {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "incidentio token is required")
	}
	if token != strings.TrimSpace(token) {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "incidentio token must not have leading or trailing whitespace")
	}
	// incident.io's setup page shows the header value as "Bearer <token>"; a
	// pasted prefix would be sent doubled, so reject it instead.
	if strings.EqualFold(token, "bearer") || (len(token) >= 7 && strings.EqualFold(token[:7], "bearer ")) {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "incidentio token must be the source's secret token only, without the Bearer prefix")
	}
	return nil
}

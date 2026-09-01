package alertmanagertypes

import (
	"fmt"
	"net/url"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/prometheus/alertmanager/config"
	commoncfg "github.com/prometheus/common/config"
)

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

	// Validate on the normalized forms but store user values verbatim, so a
	// read returns exactly what was configured (no drift for API/terraform
	// users); normalization happens again at send time.
	trimmed := c.AlertEventsURL()
	u, err := url.Parse(trimmed)
	if trimmed == "" || err != nil || u.Scheme != "https" || u.Host == "" ||
		!strings.Contains(u.Path, incidentIOEventsPathPrefix) ||
		strings.HasSuffix(u.Path, incidentIOEventsPathPrefix) {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, fmt.Sprintf("incidentio url must be an alert events URL (https://api.incident.io%s<source_config_id>)", incidentIOEventsPathPrefix))
	}

	if c.BearerToken() == "" {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "incidentio token is required")
	}
	return nil
}

// AlertEventsURL is the endpoint to POST alert events to: the configured URL
// with surrounding whitespace and any trailing slash removed.
func (c *IncidentIOReceiverConfig) AlertEventsURL() string {
	return strings.TrimRight(strings.TrimSpace(c.URL), "/")
}

// BearerToken is the configured token ready for the Authorization header.
// incident.io's setup page shows the header value as "Bearer <token>", so a
// pasted prefix is stripped rather than sent doubled.
func (c *IncidentIOReceiverConfig) BearerToken() string {
	token := strings.TrimSpace(string(c.Token))
	if strings.EqualFold(token, "bearer") {
		return ""
	}
	if len(token) >= 7 && strings.EqualFold(token[:7], "bearer ") {
		return strings.TrimSpace(token[7:])
	}
	return token
}

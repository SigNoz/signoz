package alertmanagertypes

import (
	"github.com/prometheus/alertmanager/config"
)

type JsmOpsReceiverConfig struct {
	config.NotifierConfig `yaml:",inline" json:",inline"`

	ConnectionID string   `json:"connection_id,omitempty" yaml:"connection_id,omitempty"`
	OrgID        string   `json:"-" yaml:"-"`
	Responders   []string `json:"responders,omitempty" yaml:"responders,omitempty"`
	Message      string   `json:"message,omitempty" yaml:"message,omitempty"`
	Description  string   `json:"description,omitempty" yaml:"description,omitempty"`
	Tags         []string `json:"tags,omitempty" yaml:"tags,omitempty"`
	Priority     string   `json:"priority,omitempty" yaml:"priority,omitempty"`
	UpdateAlerts bool     `json:"update_alerts,omitempty" yaml:"update_alerts,omitempty"`
}

var DefaultJsmOpsReceiverConfig = JsmOpsReceiverConfig{
	NotifierConfig: config.NotifierConfig{
		VSendResolved: false,
	},
	Message: `[{{ .Status | toUpper }}{{ if eq .Status "firing" }}:{{ .Alerts.Firing | len }}{{ end }}] {{ .CommonLabels.alertname }}`,
	Description: `{{ range .Alerts -}}
Alert: {{ .Labels.alertname }}{{ if .Labels.severity }}
Severity: {{ .Labels.severity }}{{ end }}{{ if .Annotations.summary }}
Summary: {{ .Annotations.summary }}{{ end }}{{ if .Annotations.description }}
Description: {{ .Annotations.description }}{{ end }}
{{ end }}`,
	Priority: `{{ if eq (index .Alerts 0).Labels.severity "critical" }}P1{{ else if eq (index .Alerts 0).Labels.severity "warning" }}P2{{ else if eq (index .Alerts 0).Labels.severity "info" }}P3{{ else }}P4{{ end }}`,
}

func (c *JsmOpsReceiverConfig) UnmarshalYAML(unmarshal func(any) error) error {
	*c = DefaultJsmOpsReceiverConfig
	type plain JsmOpsReceiverConfig
	return unmarshal((*plain)(c))
}

var _ AtlassianBackedConfig = (*JsmOpsReceiverConfig)(nil)

// GetConnectionID returns the id of the AtlassianConnection this config uses.
func (c *JsmOpsReceiverConfig) GetConnectionID() string { return c.ConnectionID }

// SetOrgID stamps the runtime-only org id used to resolve live credentials.
func (c *JsmOpsReceiverConfig) SetOrgID(orgID string) { c.OrgID = orgID }

// ChannelKind names the channel type in user-facing errors.
func (c *JsmOpsReceiverConfig) ChannelKind() string { return "JSM Ops" }

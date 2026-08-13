package alertmanagertypes

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/prometheus/alertmanager/config"
	commoncfg "github.com/prometheus/common/config"
)

// JSMOpsAPIBaseURL is the native JSM Ops integration-events gateway. It is a
// single global host keyed by the integration API key (no region/cloud id in
// the path). The trailing slash is required: the Opsgenie notifier appends
// "v2/alerts..." to APIURL.Path with no separator.
const JSMOpsAPIBaseURL = "https://api.atlassian.com/jsm/ops/integration/"

// JSM Ops speaks the Opsgenie alert API, so a JSM alert description takes the
// same HTML subset and 15,000-char limit; message caps at 130. The templates
// mirror Google Chat / Jira for a consistent default across channels.
const (
	DefaultJSMOpsMessageTemplate = `[{{ .Status | toUpper }}{{ if eq .Status "firing" }}:{{ .Alerts.Firing | len }}{{ end }}] {{ .CommonLabels.alertname }}`

	DefaultJSMOpsDescriptionTemplate = `{{ range .Alerts -}}
**Alert:** {{ .Labels.alertname }}{{ if .Labels.severity }} ({{ .Labels.severity }}){{ end }}{{ if .Annotations.summary }}
**Summary:** {{ .Annotations.summary }}{{ end }}{{ if .Annotations.description }}
**Description:** {{ .Annotations.description }}{{ end }}
{{ end }}`
)

// JSMOpsReceiverConfig is the SigNoz Jira Service Management Ops receiver. It is
// delivered by reusing the Opsgenie notifier (JSM Ops is the ex-Opsgenie alert
// API): the notifier package maps these fields onto config.OpsGenieConfig with
// APIURL pinned to JSMOpsAPIBaseURL.
type JSMOpsReceiverConfig struct {
	config.NotifierConfig `yaml:",inline" json:",inline"`

	HTTPConfig *commoncfg.HTTPClientConfig `yaml:"http_config,omitempty" json:"http_config,omitempty"`

	APIKey      config.Secret `yaml:"api_key,omitempty" json:"api_key,omitempty"`
	Message     string        `yaml:"message,omitempty" json:"message,omitempty"`
	Description string        `yaml:"description,omitempty" json:"description,omitempty"`
	Priority    string        `yaml:"priority,omitempty" json:"priority,omitempty"`
	Tags        string        `yaml:"tags,omitempty" json:"tags,omitempty"`
}

// send_resolved has no omitempty upstream, so a var default here is overwritten
// by the yaml round-trip to the request value (false when omitted); the UI sends
// it explicitly, defaulted on, so JSM alerts close on resolve.
var DefaultJSMOpsReceiverConfig = JSMOpsReceiverConfig{
	NotifierConfig: config.NotifierConfig{
		VSendResolved: false,
	},
	Message:     DefaultJSMOpsMessageTemplate,
	Description: DefaultJSMOpsDescriptionTemplate,
	Tags:        "signoz",
}

func (c *JSMOpsReceiverConfig) UnmarshalYAML(unmarshal func(any) error) error {
	*c = DefaultJSMOpsReceiverConfig
	type plain JSMOpsReceiverConfig
	if err := unmarshal((*plain)(c)); err != nil {
		return err
	}
	if c.APIKey == "" {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "jsm ops api_key is required")
	}
	return nil
}

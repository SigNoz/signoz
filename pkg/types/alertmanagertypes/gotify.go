package alertmanagertypes

import (
	"net/url"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/prometheus/alertmanager/config"
	commoncfg "github.com/prometheus/common/config"
)

type GotifyReceiverConfig struct {
	config.NotifierConfig `yaml:",inline" json:",inline"`

	HTTPConfig *commoncfg.HTTPClientConfig `yaml:"http_config,omitempty" json:"http_config,omitempty"`

	URL      *config.URL   `yaml:"url,omitempty" json:"url,omitempty"`
	Token    config.Secret `yaml:"token,omitempty" json:"token,omitempty"`
	Priority int           `yaml:"priority,omitempty" json:"priority,omitempty"`
	Title    string        `yaml:"title,omitempty" json:"title,omitempty"`
	Message  string        `yaml:"message,omitempty" json:"message,omitempty"`
}

var DefaultGotifyReceiverConfig = GotifyReceiverConfig{
	NotifierConfig: config.NotifierConfig{
		VSendResolved: false,
	},
	Priority: 5,
	Title:    `[{{ .Status | toUpper }}{{ if eq .Status "firing" }}:{{ .Alerts.Firing | len }}{{ end }}] {{ .CommonLabels.alertname }}`,
	Message:  `{{ range .Alerts -}}
**Alert:** {{ .Labels.alertname }}{{ if .Labels.severity }} ({{ .Labels.severity }}){{ end }}{{ if .Annotations.summary }}
**Summary:** {{ .Annotations.summary }}{{ end }}{{ if .Annotations.description }}
**Description:** {{ .Annotations.description }}{{ end }}
{{ end }}`,
}

func (c *GotifyReceiverConfig) UnmarshalYAML(unmarshal func(any) error) error {
	*c = DefaultGotifyReceiverConfig
	type plain GotifyReceiverConfig
	if err := unmarshal((*plain)(c)); err != nil {
		return err
	}
	if c.URL == nil {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "gotify url is required")
	}
	if c.Token == "" {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "gotify token is required")
	}
	u, err := url.Parse(c.URL.String())
	if err != nil {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "invalid gotify url: %v", err)
	}
	if u.Scheme != "http" && u.Scheme != "https" {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "gotify url must use http or https")
	}
	return nil
}

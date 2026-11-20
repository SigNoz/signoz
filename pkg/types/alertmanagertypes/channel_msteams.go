package alertmanagertypes

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/prometheus/alertmanager/config"
)

// The text is the markdown subset an Adaptive Card TextBlock renders: bold, lists and links, with paragraphs split by a blank line.
const (
	DefaultMSTeamsTitleTemplate = `[{{ .Status | toUpper }}{{ if eq .Status "firing" }}:{{ .Alerts.Firing | len }}{{ end }}] {{ .CommonLabels.alertname }}`

	DefaultMSTeamsTextTemplate = `{{ range .Alerts -}}
**Alert:** {{ .Labels.alertname }}{{ if .Labels.severity }} ({{ .Labels.severity }}){{ end }} - {{ .Status }}

{{ if .Annotations.summary }}**Summary:** {{ .Annotations.summary }}

{{ end }}{{ if .Annotations.description }}**Description:** {{ .Annotations.description }}

{{ end }}{{ template "signoz.relatedLinks.markdown" . }}{{ with (.Labels.Remove (stringSlice "alertname" "severity" "ruleId" "ruleSource")).SortedPairs }}**Details:**

{{ range . }}- **{{ .Name }}:** {{ .Value }}
{{ end }}
{{ end }}{{ end }}`
)

type ChannelMSTeamsConfig struct {
	SendResolved *bool                        `json:"sendResolved,omitempty" description:"Also notify when the alert resolves. Defaults to true."`
	WebhookURL   string                       `json:"webhookUrl" required:"true" format:"password" description:"The Teams incoming webhook URL. A secret; returned by create, update and fetch by ID, never by list."`
	Title        valuer.UnsetOrNonEmptyString `json:"title,omitzero" description:"Alertmanager template for the card title; defaults to the SigNoz Teams default."`
	Text         valuer.UnsetOrNonEmptyString `json:"text,omitzero" description:"Alertmanager template for the card body, rendered as Teams markdown; defaults to the SigNoz Teams default."`
}

func (c *ChannelMSTeamsConfig) UnmarshalJSON(data []byte) error {
	type alias ChannelMSTeamsConfig
	if err := decodeStrict(data, (*alias)(c)); err != nil {
		return err
	}

	fillSendResolved(&c.SendResolved, config.DefaultMSTeamsV2Config.VSendResolved)
	c.Title.SetIfUnset(config.DefaultMSTeamsV2Config.Title)
	c.Text.SetIfUnset(config.DefaultMSTeamsV2Config.Text)

	return c.Validate()
}

func (c ChannelMSTeamsConfig) Validate() error {
	if c.WebhookURL == "" {
		return errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "config.spec.webhookUrl is required for an msteams channel")
	}

	return nil
}

func (c ChannelMSTeamsConfig) toUndefaultedReceiver(displayName string) (*Receiver, error) {
	webhookURL, err := parseSecretURL(c.WebhookURL)
	if err != nil {
		return nil, err
	}

	return &Receiver{Receiver: &config.Receiver{
		Name: displayName,
		MSTeamsV2Configs: []*config.MSTeamsV2Config{{
			NotifierConfig: config.NotifierConfig{VSendResolved: resolveSendResolved(c.SendResolved, config.DefaultMSTeamsV2Config.VSendResolved)},
			WebhookURL:     webhookURL,
			Title:          c.Title.StringValue(),
			Text:           c.Text.StringValue(),
		}},
	}}, nil
}

func newChannelMSTeamsConfigFromReceiver(name string, receiver *Receiver) (ChannelSpec, error) {
	msteams := receiver.MSTeamsV2Configs[0]
	sendResolved := msteams.VSendResolved

	if err := rejectAnyHTTPAuth(name, msteams.HTTPConfig); err != nil {
		return nil, err
	}

	return &ChannelMSTeamsConfig{
		SendResolved: &sendResolved,
		WebhookURL:   formatSecretURL(msteams.WebhookURL),
		Title:        valuer.UnsetIfEmpty(msteams.Title),
		Text:         valuer.UnsetIfEmpty(msteams.Text),
	}, nil
}

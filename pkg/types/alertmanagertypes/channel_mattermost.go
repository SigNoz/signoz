package alertmanagertypes

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/prometheus/alertmanager/config"
)

// DefaultMattermostTextTemplate is the body of each alert's card. The notifier
// renders it once per alert and supplies the coloured bar, the status icon,
// the linked title and the severity and start time fields itself.
const DefaultMattermostTextTemplate = `{{ range .Alerts -}}
{{ if .Annotations.summary }}{{ .Annotations.summary }}
{{ end }}{{ if .Annotations.description }}{{ .Annotations.description }}
{{ end }}{{ range .Labels.SortedPairs }}{{ if and (ne .Name "alertname") (ne .Name "severity") (ne .Name "ruleId") }}` + "`{{ .Name }}: {{ .Value }}` " + `{{ end }}{{ end }}
{{ if .Annotations.related_logs }}[Related logs]({{ .Annotations.related_logs }}){{ end }}{{ if and .Annotations.related_logs .Annotations.related_traces }} · {{ end }}{{ if .Annotations.related_traces }}[Related traces]({{ .Annotations.related_traces }}){{ end }}
{{ end }}`

// ChannelMattermostConfig configures delivery to a Mattermost incoming webhook.
// It maps onto upstream's MattermostConfig; attachments, props, priority and
// the post type are not modelled.
type ChannelMattermostConfig struct {
	SendResolved *bool                        `json:"sendResolved,omitempty" description:"Also notify when the alert resolves. Defaults to true."`
	WebhookURL   string                       `json:"webhookUrl" required:"true" format:"password" description:"The Mattermost incoming webhook URL. A secret; returned by create, update and fetch by ID, never by list."`
	Channel      string                       `json:"channel" description:"The channel to post to, such as town-square or @username; empty uses the webhook default. Only honoured when the webhook is not locked to a channel."`
	Username     string                       `json:"username" description:"Overrides the posting username; requires username overrides to be enabled on the Mattermost server."`
	IconURL      string                       `json:"iconUrl" description:"Overrides the profile picture of the post; requires icon overrides to be enabled on the Mattermost server."`
	IconEmoji    string                       `json:"iconEmoji" description:"Overrides the profile picture with an emoji, such as :bell:; requires icon overrides to be enabled on the Mattermost server."`
	Text         valuer.UnsetOrNonEmptyString `json:"text,omitzero" description:"Alertmanager template for the Markdown message; rendered once per alert as the body of its card; defaults to the summary, description, labels and related links."`
}

func (c *ChannelMattermostConfig) UnmarshalJSON(data []byte) error {
	type alias ChannelMattermostConfig
	if err := decodeStrict(data, (*alias)(c)); err != nil {
		return err
	}

	fillSendResolved(&c.SendResolved, config.DefaultMattermostConfig.VSendResolved)
	c.Text.SetIfUnset(DefaultMattermostTextTemplate)

	return c.Validate()
}

func (c ChannelMattermostConfig) Validate() error {
	if c.WebhookURL == "" {
		return errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "config.spec.webhookUrl is required for a mattermost channel")
	}

	return nil
}

func (c ChannelMattermostConfig) toUndefaultedReceiver(displayName string) (*Receiver, error) {
	webhookURL, err := parseSecretURL(c.WebhookURL)
	if err != nil {
		return nil, err
	}

	return &Receiver{Receiver: &config.Receiver{
		Name: displayName,
		MattermostConfigs: []*config.MattermostConfig{{
			NotifierConfig: config.NotifierConfig{VSendResolved: resolveSendResolved(c.SendResolved, config.DefaultMattermostConfig.VSendResolved)},
			WebhookURL:     webhookURL,
			Channel:        c.Channel,
			Username:       c.Username,
			IconURL:        c.IconURL,
			IconEmoji:      c.IconEmoji,
			Text:           c.Text.StringValue(),
		}},
	}}, nil
}

func newChannelMattermostConfigFromReceiver(name string, receiver *Receiver) (ChannelSpec, error) {
	mattermost := receiver.MattermostConfigs[0]
	sendResolved := mattermost.VSendResolved

	if err := rejectAnyHTTPAuth(name, mattermost.HTTPConfig); err != nil {
		return nil, err
	}

	// webhook_url_file reads a path on the server's filesystem, and the rest
	// have no field in the spec; dropping any of them on the way out would
	// silently rewrite the channel on the next write, so they are refused.
	if mattermost.WebhookURLFile != "" {
		return nil, errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "channel %q sets webhook_url_file, which is not supported", name)
	}

	if len(mattermost.Attachments) > 0 || mattermost.Props != nil || mattermost.Priority != nil || mattermost.Type != "" {
		return nil, errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "channel %q sets attachments, props, priority or type, which are not supported", name)
	}

	return &ChannelMattermostConfig{
		SendResolved: &sendResolved,
		WebhookURL:   formatSecretURL(mattermost.WebhookURL),
		Channel:      mattermost.Channel,
		Username:     mattermost.Username,
		IconURL:      mattermost.IconURL,
		IconEmoji:    mattermost.IconEmoji,
		Text:         valuer.UnsetIfEmpty(mattermost.Text),
	}, nil
}

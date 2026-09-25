package alertmanagertypes

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/prometheus/alertmanager/config"
)

type ChannelSlackConfig struct {
	SendResolved *bool                        `json:"sendResolved,omitempty"`
	APIURL       string                       `json:"apiUrl" required:"true" format:"password"`
	Channel      string                       `json:"channel"`
	Title        valuer.UnsetOrNonEmptyString `json:"title,omitzero"`
	Text         valuer.UnsetOrNonEmptyString `json:"text,omitzero"`
	Color        valuer.UnsetOrNonEmptyString `json:"color,omitzero"`
	TitleLink    valuer.UnsetOrNonEmptyString `json:"titleLink,omitzero"`
	Pretext      valuer.UnsetOrNonEmptyString `json:"pretext,omitzero"`
	Fallback     valuer.UnsetOrNonEmptyString `json:"fallback,omitzero"`
	Footer       valuer.UnsetOrNonEmptyString `json:"footer,omitzero"`
	Fields       []ChannelSlackField          `json:"fields,omitzero" nullable:"false"`
	Actions      []ChannelSlackAction         `json:"actions,omitzero" nullable:"false"`
}

type ChannelSlackField struct {
	Title string `json:"title" required:"true"`
	Value string `json:"value" required:"true"`
	Short *bool  `json:"short,omitempty"`
}

// ChannelSlackAction is a link button when URL is set, otherwise a message
// button that needs Name. Upstream clears whichever side is not in use.
type ChannelSlackAction struct {
	Type    string                    `json:"type" required:"true"`
	Text    string                    `json:"text" required:"true"`
	URL     string                    `json:"url"`
	Style   string                    `json:"style"`
	Name    string                    `json:"name"`
	Value   string                    `json:"value"`
	Confirm *ChannelSlackConfirmation `json:"confirm,omitempty"`
}

type ChannelSlackConfirmation struct {
	Text        string `json:"text" required:"true"`
	Title       string `json:"title"`
	OkText      string `json:"okText"`
	DismissText string `json:"dismissText"`
}

func (c *ChannelSlackConfig) UnmarshalJSON(data []byte) error {
	type alias ChannelSlackConfig
	if err := decodeStrict(data, (*alias)(c)); err != nil {
		return err
	}

	fillSendResolved(&c.SendResolved, config.DefaultSlackConfig.VSendResolved)
	c.Title.SetIfUnset(config.DefaultSlackConfig.Title)
	c.Text.SetIfUnset(config.DefaultSlackConfig.Text)
	c.Color.SetIfUnset(config.DefaultSlackConfig.Color)
	c.TitleLink.SetIfUnset(config.DefaultSlackConfig.TitleLink)
	c.Pretext.SetIfUnset(config.DefaultSlackConfig.Pretext)
	c.Fallback.SetIfUnset(config.DefaultSlackConfig.Fallback)
	c.Footer.SetIfUnset(config.DefaultSlackConfig.Footer)

	return c.Validate()
}

func (c ChannelSlackConfig) Validate() error {
	if c.APIURL == "" {
		return errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "config.spec.apiUrl is required for a slack channel")
	}

	for i, field := range c.Fields {
		if field.Title == "" || field.Value == "" {
			return errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "config.spec.fields[%d] requires title and value", i)
		}
	}

	for i, action := range c.Actions {
		if action.Type == "" || action.Text == "" {
			return errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "config.spec.actions[%d] requires type and text", i)
		}
		if action.URL == "" && action.Name == "" {
			return errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "config.spec.actions[%d] requires url or name", i)
		}
		if action.Confirm != nil && action.Confirm.Text == "" {
			return errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "config.spec.actions[%d].confirm requires text", i)
		}
	}

	return nil
}

func (c ChannelSlackConfig) toUndefaultedReceiver(displayName string) (*Receiver, error) {
	apiURL, err := parseSecretURL(c.APIURL)
	if err != nil {
		return nil, err
	}

	return &Receiver{Receiver: &config.Receiver{
		Name: displayName,
		SlackConfigs: []*config.SlackConfig{{
			NotifierConfig: config.NotifierConfig{VSendResolved: resolveSendResolved(c.SendResolved, config.DefaultSlackConfig.VSendResolved)},
			APIURL:         apiURL,
			Channel:        c.Channel,
			Title:          c.Title.StringValue(),
			Text:           c.Text.StringValue(),
			Color:          c.Color.StringValue(),
			TitleLink:      c.TitleLink.StringValue(),
			Pretext:        c.Pretext.StringValue(),
			Fallback:       c.Fallback.StringValue(),
			Footer:         c.Footer.StringValue(),
			Fields:         newUpstreamSlackFields(c.Fields),
			Actions:        newUpstreamSlackActions(c.Actions),
		}},
	}}, nil
}

func newChannelSlackConfigFromReceiver(name string, receiver *Receiver) (ChannelSpec, error) {
	slack := receiver.SlackConfigs[0]
	sendResolved := slack.VSendResolved

	if err := rejectAnyHTTPAuth(name, slack.HTTPConfig); err != nil {
		return nil, err
	}

	return &ChannelSlackConfig{
		SendResolved: &sendResolved,
		APIURL:       formatSecretURL(slack.APIURL),
		Channel:      slack.Channel,
		Title:        valuer.UnsetIfEmpty(slack.Title),
		Text:         valuer.UnsetIfEmpty(slack.Text),
		Color:        valuer.UnsetIfEmpty(slack.Color),
		TitleLink:    valuer.UnsetIfEmpty(slack.TitleLink),
		Pretext:      valuer.UnsetIfEmpty(slack.Pretext),
		Fallback:     valuer.UnsetIfEmpty(slack.Fallback),
		Footer:       valuer.UnsetIfEmpty(slack.Footer),
		Fields:       newChannelSlackFields(slack.Fields),
		Actions:      newChannelSlackActions(slack.Actions),
	}, nil
}

func newUpstreamSlackFields(fields []ChannelSlackField) []*config.SlackField {
	if len(fields) == 0 {
		return nil
	}

	upstream := make([]*config.SlackField, 0, len(fields))
	for _, field := range fields {
		upstream = append(upstream, &config.SlackField{Title: field.Title, Value: field.Value, Short: field.Short})
	}

	return upstream
}

func newChannelSlackFields(upstream []*config.SlackField) []ChannelSlackField {
	if len(upstream) == 0 {
		return nil
	}

	fields := make([]ChannelSlackField, 0, len(upstream))
	for _, field := range upstream {
		fields = append(fields, ChannelSlackField{Title: field.Title, Value: field.Value, Short: field.Short})
	}

	return fields
}

func newUpstreamSlackActions(actions []ChannelSlackAction) []*config.SlackAction {
	if len(actions) == 0 {
		return nil
	}

	upstream := make([]*config.SlackAction, 0, len(actions))
	for _, action := range actions {
		upstreamAction := &config.SlackAction{Type: action.Type, Text: action.Text, URL: action.URL, Style: action.Style, Name: action.Name, Value: action.Value}
		if action.Confirm != nil {
			upstreamAction.ConfirmField = &config.SlackConfirmationField{Text: action.Confirm.Text, Title: action.Confirm.Title, OkText: action.Confirm.OkText, DismissText: action.Confirm.DismissText}
		}
		upstream = append(upstream, upstreamAction)
	}

	return upstream
}

func newChannelSlackActions(upstream []*config.SlackAction) []ChannelSlackAction {
	if len(upstream) == 0 {
		return nil
	}

	actions := make([]ChannelSlackAction, 0, len(upstream))
	for _, upstreamAction := range upstream {
		action := ChannelSlackAction{Type: upstreamAction.Type, Text: upstreamAction.Text, URL: upstreamAction.URL, Style: upstreamAction.Style, Name: upstreamAction.Name, Value: upstreamAction.Value}
		if upstreamAction.ConfirmField != nil {
			action.Confirm = &ChannelSlackConfirmation{Text: upstreamAction.ConfirmField.Text, Title: upstreamAction.ConfirmField.Title, OkText: upstreamAction.ConfirmField.OkText, DismissText: upstreamAction.ConfirmField.DismissText}
		}
		actions = append(actions, action)
	}

	return actions
}

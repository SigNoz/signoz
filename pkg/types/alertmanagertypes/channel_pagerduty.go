package alertmanagertypes

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/prometheus/alertmanager/config"
)

type ChannelPagerdutyConfig struct {
	SendResolved *bool                        `json:"sendResolved,omitempty" description:"Also notify when the alert resolves. Defaults to true."`
	RoutingKey   string                       `json:"routingKey" required:"true" format:"password" description:"The Events API v2 integration key. A secret; returned by create, update and fetch by ID, never by list."`
	URL          string                       `json:"url" description:"The Events API endpoint; empty uses the PagerDuty default."`
	Source       valuer.UnsetOrNonEmptyString `json:"source,omitzero" description:"Alertmanager template for the unique location of the affected system; defaults to client."`
	Client       valuer.UnsetOrNonEmptyString `json:"client,omitzero" description:"Alertmanager template for the client identifier; defaults to the Alertmanager PagerDuty default."`
	ClientURL    valuer.UnsetOrNonEmptyString `json:"clientUrl,omitzero" description:"Alertmanager template for the client URL; defaults to the Alertmanager PagerDuty default."`
	Description  valuer.UnsetOrNonEmptyString `json:"description,omitzero" description:"Alertmanager template for the incident summary; defaults to the Alertmanager PagerDuty default."`
	Severity     string                       `json:"severity" description:"The incident severity: critical, error, warning or info."`
	Component    string                       `json:"component" description:"The component of the source machine that is responsible for the event."`
	Group        string                       `json:"group" description:"The logical grouping of components the event belongs to."`
	Class        string                       `json:"class" description:"The class or type of the event."`
	Details      map[string]string            `json:"details,omitzero" description:"Custom details keyed by name, each an Alertmanager template; defaults to the Alertmanager firing and resolved summary set."`
}

func (c *ChannelPagerdutyConfig) UnmarshalJSON(data []byte) error {
	type alias ChannelPagerdutyConfig
	if err := decodeStrict(data, (*alias)(c)); err != nil {
		return err
	}

	fillSendResolved(&c.SendResolved, config.DefaultPagerdutyConfig.VSendResolved)
	c.Description.SetIfUnset(config.DefaultPagerdutyConfig.Description)
	c.Client.SetIfUnset(config.DefaultPagerdutyConfig.Client)
	c.ClientURL.SetIfUnset(config.DefaultPagerdutyConfig.ClientURL)
	c.Source.SetIfUnset(c.Client.StringValue())

	if c.Details == nil {
		c.Details = make(map[string]string, len(config.DefaultPagerdutyDetails))
		for key, value := range config.DefaultPagerdutyDetails {
			if template, ok := value.(string); ok {
				c.Details[key] = template
			}
		}
	}

	return c.Validate()
}

func (c ChannelPagerdutyConfig) Validate() error {
	if c.RoutingKey == "" {
		return errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "config.spec.routingKey is required for a pagerduty channel")
	}

	return nil
}

func (c ChannelPagerdutyConfig) toUndefaultedReceiver(displayName string) (*Receiver, error) {
	var eventsURL *config.URL
	if c.URL != "" {
		parsed, err := parseUpstreamURL(c.URL)
		if err != nil {
			return nil, err
		}
		eventsURL = parsed
	}

	return &Receiver{Receiver: &config.Receiver{
		Name: displayName,
		PagerdutyConfigs: []*config.PagerdutyConfig{{
			NotifierConfig: config.NotifierConfig{VSendResolved: resolveSendResolved(c.SendResolved, config.DefaultPagerdutyConfig.VSendResolved)},
			RoutingKey:     config.Secret(c.RoutingKey),
			URL:            eventsURL,
			Source:         c.Source.StringValue(),
			Client:         c.Client.StringValue(),
			ClientURL:      c.ClientURL.StringValue(),
			Description:    c.Description.StringValue(),
			Severity:       c.Severity,
			Component:      c.Component,
			Group:          c.Group,
			Class:          c.Class,
			Details:        newUpstreamDetails(c.Details),
		}},
	}}, nil
}

func newChannelPagerdutyConfigFromReceiver(name string, receiver *Receiver) (ChannelSpec, error) {
	pagerduty := receiver.PagerdutyConfigs[0]
	sendResolved := pagerduty.VSendResolved

	if err := rejectAnyHTTPAuth(name, pagerduty.HTTPConfig); err != nil {
		return nil, err
	}

	var details map[string]string
	if len(pagerduty.Details) > 0 {
		extracted, err := extractStringDetails(name, pagerduty.Details)
		if err != nil {
			return nil, err
		}
		details = extracted
	}

	return &ChannelPagerdutyConfig{
		SendResolved: &sendResolved,
		RoutingKey:   string(pagerduty.RoutingKey),
		URL:          formatUpstreamURL(pagerduty.URL),
		Source:       valuer.UnsetIfEmpty(pagerduty.Source),
		Client:       valuer.UnsetIfEmpty(pagerduty.Client),
		ClientURL:    valuer.UnsetIfEmpty(pagerduty.ClientURL),
		Description:  valuer.UnsetIfEmpty(pagerduty.Description),
		Severity:     pagerduty.Severity,
		Component:    pagerduty.Component,
		Group:        pagerduty.Group,
		Class:        pagerduty.Class,
		Details:      details,
	}, nil
}

func newUpstreamDetails(details map[string]string) map[string]any {
	if details == nil {
		return nil
	}

	upstream := make(map[string]any, len(details))
	for key, value := range details {
		upstream[key] = value
	}

	return upstream
}

func extractStringDetails(name string, details map[string]any) (map[string]string, error) {
	extracted := make(map[string]string, len(details))
	for key, value := range details {
		stringValue, ok := value.(string)
		if !ok {
			return nil, errors.NewInvalidInputf(
				ErrCodeAlertmanagerChannelInvalid,
				"channel %q sets a non-string value for details.%s, which is not supported", name, key,
			)
		}
		extracted[key] = stringValue
	}

	return extracted, nil
}

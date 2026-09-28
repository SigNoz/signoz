package alertmanagertypes

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/prometheus/alertmanager/config"
)

type ChannelPagerdutyConfig struct {
	SendResolved *bool                        `json:"sendResolved,omitempty"`
	RoutingKey   string                       `json:"routingKey" required:"true" format:"password"`
	URL          string                       `json:"url"`
	Source       valuer.UnsetOrNonEmptyString `json:"source"`
	Client       valuer.UnsetOrNonEmptyString `json:"client"`
	ClientURL    valuer.UnsetOrNonEmptyString `json:"clientUrl"`
	Description  valuer.UnsetOrNonEmptyString `json:"description"`
	Severity     string                       `json:"severity"`
	Component    string                       `json:"component"`
	Group        string                       `json:"group"`
	Class        string                       `json:"class"`
	Details      map[string]string            `json:"details,omitempty"`
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

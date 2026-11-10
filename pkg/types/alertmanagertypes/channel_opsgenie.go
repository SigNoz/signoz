package alertmanagertypes

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/prometheus/alertmanager/config"
)

type ChannelOpsgenieConfig struct {
	SendResolved *bool                        `json:"sendResolved,omitempty" description:"Also notify when the alert resolves. Defaults to true."`
	APIKey       string                       `json:"apiKey" required:"true" format:"password" description:"The Opsgenie API integration key. A secret; returned by create, update and fetch by ID, never by list."`
	APIURL       string                       `json:"apiUrl" description:"The Opsgenie API host; empty uses the global Alertmanager default."`
	Message      valuer.UnsetOrNonEmptyString `json:"message,omitzero" description:"Alertmanager template for the alert message; defaults to the Alertmanager Opsgenie default."`
	Description  valuer.UnsetOrNonEmptyString `json:"description,omitzero" description:"Alertmanager template for the alert description; defaults to the Alertmanager Opsgenie default."`
	Source       valuer.UnsetOrNonEmptyString `json:"source,omitzero" description:"Alertmanager template for the alert source; defaults to the Alertmanager Opsgenie default."`
	Details      map[string]string            `json:"details,omitzero" description:"Custom alert details keyed by name, each an Alertmanager template."`
	Priority     string                       `json:"priority" description:"The alert priority, P1 to P5."`
}

func (c *ChannelOpsgenieConfig) UnmarshalJSON(data []byte) error {
	type alias ChannelOpsgenieConfig
	if err := decodeStrict(data, (*alias)(c)); err != nil {
		return err
	}

	fillSendResolved(&c.SendResolved, config.DefaultOpsGenieConfig.VSendResolved)
	c.Message.SetIfUnset(config.DefaultOpsGenieConfig.Message)
	c.Description.SetIfUnset(config.DefaultOpsGenieConfig.Description)
	c.Source.SetIfUnset(config.DefaultOpsGenieConfig.Source)

	return c.Validate()
}

func (c ChannelOpsgenieConfig) Validate() error {
	if c.APIKey == "" {
		return errors.NewInvalidInputf(ErrCodeAlertmanagerChannelInvalid, "config.spec.apiKey is required for an opsgenie channel")
	}

	return nil
}

func (c ChannelOpsgenieConfig) toUndefaultedReceiver(displayName string) (*Receiver, error) {
	var apiURL *config.URL
	if c.APIURL != "" {
		parsed, err := parseUpstreamURL(c.APIURL)
		if err != nil {
			return nil, err
		}
		apiURL = parsed
	}

	return &Receiver{Receiver: &config.Receiver{
		Name: displayName,
		OpsGenieConfigs: []*config.OpsGenieConfig{{
			NotifierConfig: config.NotifierConfig{VSendResolved: resolveSendResolved(c.SendResolved, config.DefaultOpsGenieConfig.VSendResolved)},
			APIKey:         config.Secret(c.APIKey),
			APIURL:         apiURL,
			Message:        c.Message.StringValue(),
			Description:    c.Description.StringValue(),
			Source:         c.Source.StringValue(),
			Priority:       c.Priority,
			Details:        c.Details,
		}},
	}}, nil
}

func newChannelOpsgenieConfigFromReceiver(name string, receiver *Receiver) (ChannelSpec, error) {
	opsgenie := receiver.OpsGenieConfigs[0]
	sendResolved := opsgenie.VSendResolved

	if err := rejectAnyHTTPAuth(name, opsgenie.HTTPConfig); err != nil {
		return nil, err
	}

	return &ChannelOpsgenieConfig{
		SendResolved: &sendResolved,
		APIKey:       string(opsgenie.APIKey),
		APIURL:       formatUpstreamURL(opsgenie.APIURL),
		Message:      valuer.UnsetIfEmpty(opsgenie.Message),
		Description:  valuer.UnsetIfEmpty(opsgenie.Description),
		Source:       valuer.UnsetIfEmpty(opsgenie.Source),
		Priority:     opsgenie.Priority,
		Details:      opsgenie.Details,
	}, nil
}
